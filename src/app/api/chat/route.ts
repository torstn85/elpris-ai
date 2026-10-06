import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { searchKnowledge, type SearchResult } from '@/lib/rag/search';
import { CITIES } from '@/lib/cities';
import {
  ACTIVITY_CATALOG,
  ACTIVITY_IDS,
  calculateCost,
  costFooter,
  type CostToolInput,
} from '@/lib/costTool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Upstash rate-limit setup ─────────────────────────────────────────────────

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const rateLimitMinute = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:chat:1m',
});

const rateLimitHour = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:chat:1h',
});

const rateLimitDay = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 d'),
  prefix: 'rl:chat:1d',
});

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Disable SDK:s inbyggda retry — vi sköter det själva i callAnthropicWithRetry()
  // för att få exakt 1s/2s/4s backoff och egen logging.
  maxRetries: 0,
});

const RETRY_DELAYS_MS = [1000, 2000, 4000];

// Duck-typing i stället för instanceof Anthropic.APIError — instanceof failar i
// prod-bundeln när Next.js råkar dra in både ESM- och CJS-kopior av SDK:n och
// klass-identiteterna divergerar. err.status är källan-till-sanning.
function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

function getRetryAfterMs(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('headers' in err)) return undefined;
  const headers = (err as { headers?: unknown }).headers;
  let raw: string | null | undefined;
  if (headers && typeof (headers as Headers).get === 'function') {
    raw = (headers as Headers).get('retry-after');
  } else if (headers && typeof headers === 'object') {
    raw = (headers as Record<string, string>)['retry-after'];
  }
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n * 1000, 10_000) : undefined;
}

function isConnectionError(err: unknown): boolean {
  // Best-effort instanceof först — funkar i lokal dev innan bundling delar klasser.
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (!(err instanceof Error)) return false;
  // Connection-fel saknar HTTP-status och har message som "Connection error." /
  // "Request timed out." / fetch-relaterade meddelanden.
  if (getErrorStatus(err) !== undefined) return false;
  return /connection|timed? ?out|network|fetch fail|socket/i.test(err.message ?? '');
}

async function callAnthropicWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;

      const status = getErrorStatus(err);
      const isOverloaded = status === 429 || status === 529;
      const isConnection = isConnectionError(err);

      if (!isOverloaded && !isConnection) {
        // Bonus-observability: lämna spår även när vi INTE retryar, så att
        // tystnad i loggen inte är dubbeltydlig nästa gång.
        const name = err instanceof Error ? err.name : typeof err;
        console.warn(`[anthropic-retry] skip (status=${status ?? 'unknown'}, name=${name})`);
        throw err;
      }

      const isLastAttempt = attempt === RETRY_DELAYS_MS.length - 1;
      if (isLastAttempt) break;

      // Respektera Retry-After-header om Anthropic skickar en (vanligt vid 429).
      const waitMs = getRetryAfterMs(err) ?? RETRY_DELAYS_MS[attempt];
      // Jitter ±20% för att undvika thundering herd vid samtidiga klienter.
      const jitter = waitMs * (0.8 + Math.random() * 0.4);
      const finalWait = Math.round(jitter);

      const statusLabel = status ?? 'connection';
      console.warn(
        `[anthropic-retry] status=${statusLabel} attempt=${attempt + 1}/${RETRY_DELAYS_MS.length} waiting ${finalWait}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, finalWait));
    }
  }

  throw lastErr;
}

function buildKnowledgeBlock(results: SearchResult[]): string {
  const intro = `Följande utdrag är från elpris.ai:s egna guideartiklar. Använd dem som primär källa när du svarar. Om frågan inte berörs av utdragen, svara med din generella kunskap men säg det öppet (exempel: "Det här täcks inte direkt av våra artiklar, men generellt..."). Länka till artikeln i ditt svar i naturlig text när det är relevant — använd formatet /guider/{kategori}/{slug}.`;

  const utdrag = results
    .map(
      (r, i) =>
        `Utdrag ${i + 1} — ${r.heading_path}
Källa: /guider/${r.category}/${r.article_slug}

${r.chunk_text}`,
    )
    .join('\n\n');

  return `<kunskapsbas>
${intro}

${utdrag}
</kunskapsbas>`;
}

/**
 * Sajtens egna sidor och funktioner — RAG täcker bara guiderna. Stadslistan
 * byggs från CITIES så att boten inte länkar till städer som saknar sida.
 */
function getSiteFeatures(): string {
  const cities = Object.values(CITIES)
    .map((c) => `${c.name} /elpris-idag/${c.slug}`)
    .join(', ');
  const elduellen =
    process.env.NEXT_PUBLIC_GAMES_ENABLED === 'true'
      ? `
- Elduellen (/elduellen): ett dagligt spel med fem dueller där man väljer vilket av två alternativ som kostar mest i el, till exempel att basta en kväll eller ladda elbilen vid två olika klockslag eller i två olika städer. Räknas på dagens riktiga spotpriser, alla spelar samma dueller och nya kommer vid midnatt. Efter kl 13:15, när morgondagens priser publicerats, öppnar en bonusduell om morgondagen. Kostnaden räknas som kWh × (spotpris + energiskatt) × 1,25 i moms, exklusive nätavgift och elhandlarens påslag.`
      : '';
  return `

Sajtens egna sidor (länka med relativa URL:er i naturlig text när det hjälper användaren):
- Elpriset idag för alla elområden: /elpris-idag. Stadssidor med dagens pris kvart för kvart: ${cities}.
- Morgondagens priser: /elpris-imorgon (publiceras kl 13:15).
- Elområden: /elomrade, och /elomrade/se1, /elomrade/se2, /elomrade/se3, /elomrade/se4.${elduellen}
Länka bara till sidorna ovan och guider från kunskapsbasen, uppfinn aldrig andra adresser. Guiderna är artiklar med allmänna råd. Påstå aldrig att en sida visar dagens priser eller live-data, utom /elpris-idag, stadssidorna, elområdessidorna, /elpris-imorgon och /elduellen.

Påstå aldrig att negativt spotpris ger konsumenten pengar — energiskatt, moms och nätavgift tillkommer, så elen kostar ändå. Generalisera aldrig ett enskilt dygns billigaste eller dyraste timmar till "alltid"; säg att det gäller idag.

Kostnadsberäkningar: använd ALLTID verktyget calculate_cost när användaren frågar vad något kostar i el. Räkna aldrig själv.
- Ange activity när aktiviteten finns i verktygets bibliotek. Ange kWh bara när den saknas där, och skriv då ut ditt kWh-antagande i texten.
- Ange stad om användaren nämnt en, annars elområde om det nämnts. Har användaren inte angett någon plats: utelämna både stad och elområde (verktyget räknar då med SE3 som exempel) och ställ ingen motfråga.
- Skriv inga kronbelopp, priser per kWh eller uträkningar i din text när du använt calculate_cost. Servern lägger automatiskt till uträkningen, notisen om nätavgift och påslag och vid behov en fråga om elområde sist i svaret — upprepa inte det. Beskriv kort vad du räknat på (aktivitet och plats) och ge gärna ett råd.${
    elduellen
      ? `
Nämn Elduellen när användaren frågar vad något kostar i el, jämför vad olika saker drar, eller verkar nyfiken eller lekfull. Använd då exakt den här meningen: "Testa dagens Elduellen på /elduellen och se om du kan gissa vad som kostar mest i el idag!" Nämn den inte annars, och aldrig mer än en gång per samtal.`
      : ''
  }`;
}

function getSystemPrompt(knowledgeBlock?: string | null): string {
  const now = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const base = `Just nu är det: ${now}. Du är elpris.ai:s AI-assistent. Du hjälper svenska användare förstå elpriser och spara pengar. Du svarar alltid på svenska, kort och konkret (max 3-4 meningar). När användaren frågar om aktuellt pris, billigaste timmar, eller liknande - använd get_current_price eller get_today_prices function calls. För frågor om morgondagen - använd get_tomorrow_prices. Day-ahead-priserna för imorgon släpps kl 13:15 varje dag. Kontrollera den aktuella tiden som står i början av denna prompt innan du säger att det är för tidigt eller sent. Om available: false returneras, förklara vänligt att priserna släpps kl 13:15 varje dag. Gissa ALDRIG priser - hämta alltid live-data via funktionerna. Om frågan inte handlar om el, säg vänligt att du bara hjälper med elprisfrågor. Använd ALDRIG markdown-formattering (ingen fet text med **asterisker**, inga listor med bindestreck, inga rubriker). Skriv bara ren text. Du får gärna använda emojis sparsamt när det passar.`;

  const withSite = base + getSiteFeatures();
  if (!knowledgeBlock) return withSite;

  const ragRules = `

Du har tillgång till en kunskapsbas i <kunskapsbas>-blocket nedan. Följ dessa regler:
- Prioritera fakta från <kunskapsbas> framför din generella kunskap.
- Vid motstrid mellan kunskapsbasen och din generella kunskap: lita på kunskapsbasen.
- När du citerar fakta från ett utdrag, länka till artikeln i naturlig text med formatet /guider/{kategori}/{slug}.
- Uppfinn ALDRIG länkar eller källor — använd bara slugs som faktiskt står i utdragen.

${knowledgeBlock}`;

  return withSite + ragRules;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'calculate_cost',
    description:
      `Räknar vad en förbrukning kostar i el idag: kWh × (dagens snittspotpris + energiskatt) × 1,25 moms, exkl. nätavgift och elhandlarens påslag. Använd alltid detta för kostnadsberäkningar. Ange activity när aktiviteten finns i biblioteket nedan (då används bibliotekets kWh och antagande); ange kWh bara när den saknas. Ange stad om användaren nämnt en (ger rätt elområde och nedsatt energiskatt där den gäller), annars elområde. Utelämna båda om användaren inte angett plats — då räknas SE3 som exempel.

Aktivitetsbiblioteket (id: aktivitet):
${ACTIVITY_CATALOG}`,
    input_schema: {
      type: 'object',
      properties: {
        activity: {
          type: 'string',
          enum: ACTIVITY_IDS,
          description: 'Id ur aktivitetsbiblioteket. Föredras framför kWh.',
        },
        kWh: {
          type: 'number',
          description: 'Fri förbrukning i kWh — bara när aktiviteten saknas i biblioteket.',
        },
        area: {
          type: 'string',
          enum: ['SE1', 'SE2', 'SE3', 'SE4'],
          description: 'Elområde. Används om ingen stad anges.',
        },
        city: { type: 'string', description: 'Stad som användaren nämnt, t.ex. "Kiruna".' },
      },
      required: [],
    },
  },
  {
    name: 'get_current_price',
    description: 'Hämtar aktuellt 15-minuterspris (öre/kWh) för ett elområde.',
    input_schema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['SE1', 'SE2', 'SE3', 'SE4'],
          description: 'Elområde: SE1=Luleå, SE2=Sundsvall, SE3=Stockholm, SE4=Malmö',
        },
      },
      required: ['area'],
    },
  },
  {
    name: 'get_today_prices',
    description: 'Hämtar dagens timpriser (öre/kWh) för ett elområde.',
    input_schema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['SE1', 'SE2', 'SE3', 'SE4'],
          description: 'Elområde: SE1=Luleå, SE2=Sundsvall, SE3=Stockholm, SE4=Malmö',
        },
      },
      required: ['area'],
    },
  },
  {
    name: 'get_tomorrow_prices',
    description: 'Hämtar morgondagens timpriser för valt elområde. Returneras endast efter kl 13:15 svensk tid när day-ahead-priserna släpps. Om available: false returneras, är priserna inte publicerade än.',
    input_schema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['SE1', 'SE2', 'SE3', 'SE4'],
          description: 'Elområde: SE1=Luleå, SE2=Sundsvall, SE3=Stockholm, SE4=Malmö',
        },
      },
      required: ['area'],
    },
  },
];

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

async function executeTool(
  name: string,
  input: { area: Area },
  baseUrl: string,
): Promise<string> {
  try {
    if (name === 'calculate_cost') {
      return JSON.stringify(await calculateCost(input as unknown as CostToolInput));
    }
    if (name === 'get_current_price') {
      const res = await fetch(`${baseUrl}/api/prices/current`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return JSON.stringify({
        area: input.area,
        price_ore_kwh: data[input.area],
        slot_start: data.slot_start,
      });
    }

    if (name === 'get_today_prices') {
      const res = await fetch(`${baseUrl}/api/prices/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return JSON.stringify({
        area: input.area,
        hourly: data.areas?.[input.area] ?? [],
      });
    }

    if (name === 'get_tomorrow_prices') {
      const res = await fetch(`${baseUrl}/api/prices/tomorrow`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.available === false) {
        return JSON.stringify({ available: false, message: data.message, date: data.date });
      }
      return JSON.stringify({
        area: input.area,
        date: data.date,
        hourly: data.areas?.[input.area] ?? [],
      });
    }

    return JSON.stringify({ error: 'Unknown tool' });
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Tool call failed' });
  }
}

export async function POST(request: Request) {
  // ── Rate limiting (fail closed) ──────────────────────────────────────────
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    if (!forwarded) {
      console.warn('[rate-limit] No x-forwarded-for header — using 127.0.0.1 (local dev?)');
    }

    const [perMinute, perHour, perDay] = await Promise.all([
      rateLimitMinute.limit(ip),
      rateLimitHour.limit(ip),
      rateLimitDay.limit(ip),
    ]);

    const blocked = [perMinute, perHour, perDay].find((r) => !r.success);
    if (blocked) {
      const retryAfter = Math.ceil((blocked.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Du skickar meddelanden för snabbt. Vänta en stund och försök igen.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(retryAfter, 1)),
            'X-RateLimit-Remaining': String(blocked.remaining),
          },
        },
      );
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : typeof err;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[rate-limit] Upstash unavailable — failing closed: ${name}: ${message}`);
    return NextResponse.json(
      { error: 'Tjänsten är tillfälligt otillgänglig. Försök igen om en stund.' },
      { status: 503 },
    );
  }

  // ── Chat logic ───────────────────────────────────────────────────────────
  try {
    const body = await request.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Trim to max 6 most recent messages
    const apiMessages: Anthropic.MessageParam[] = body.messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    // ── RAG: hämta relevanta artikel-chunks baserat på senaste user-meddelandet.
    //    Fail-soft: vid 429/timeout/fel kör vi vidare utan RAG-kontext.
    let knowledgeBlock: string | null = null;
    const userMessages = body.messages.filter((m) => m.role === 'user');
    const latestUser = userMessages[userMessages.length - 1]?.content;

    if (latestUser) {
      try {
        const results = await searchKnowledge(latestUser, {
          limit: 4,
          minSimilarity: 0.45,
        });
        if (results.length > 0) {
          knowledgeBlock = buildKnowledgeBlock(results);
          console.log(
            `[rag] ${results.length} chunks found, top-1 sim=${results[0].similarity.toFixed(4)}`,
          );
        } else {
          console.log('[rag] no chunks above threshold 0.45');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[rag] fail-soft (no RAG this turn): ${msg}`);
      }
    }

    // calculate_cost-resultat — servern lägger uträkningen sist i svaret.
    const costResults: unknown[] = [];

    // Tool use loop — max 5 iterations to avoid runaway loops
    for (let i = 0; i < 5; i++) {
      const response = await callAnthropicWithRetry({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: getSystemPrompt(knowledgeBlock),
        tools: TOOLS,
        messages: apiMessages,
      });

      if (response.stop_reason !== 'tool_use') {
        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text',
        );
        const footer = costFooter(costResults);
        const text = (textBlock?.text ?? '').trim();
        return NextResponse.json({ reply: footer ? `${text}\n\n${footer}` : text });
      }

      // Append assistant turn (including tool_use blocks)
      apiMessages.push({ role: 'assistant', content: response.content });

      // Execute all requested tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(
            block.name,
            block.input as { area: Area },
            baseUrl,
          );
          if (block.name === 'calculate_cost') {
            try {
              costResults.push(JSON.parse(result));
            } catch {
              // ogiltig JSON — ingen footer för detta anrop
            }
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Append tool results as user turn
      apiMessages.push({ role: 'user', content: toolResults });
    }

    return NextResponse.json({ reply: 'Kunde inte hämta svar just nu. Försök igen.' });
  } catch (err) {
    console.error('Error in /api/chat:', err);

    // Aldrig läcka rå err.message till klienten — den kan innehålla
    // hela Anthropic-response (t.ex. "529 {…}"). Duck-typing på err.status
    // är robust mot bundling/ESM-CJS-dubbelladdning där instanceof failar.
    const status = getErrorStatus(err);
    if (status === 429 || status === 529) {
      return NextResponse.json(
        { error: 'Hoppsan, jag är lite upptagen just nu — försök igen om en liten stund.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Något gick fel just nu. Försök igen om en stund.' },
      { status: 500 },
    );
  }
}
