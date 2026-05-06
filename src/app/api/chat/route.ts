import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { searchKnowledge, type SearchResult } from '@/lib/rag/search';

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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const base = `Just nu är det: ${now}. Du är elpris.ai:s AI-assistent. Du hjälper svenska användare förstå elpriser och spara pengar. Du svarar alltid på svenska. Vanligtvis 2-3 meningar. Använd kortare när frågan är enkel. Om en fråga kräver pedagogisk djup för att svaras meningsfullt, får du gå till 4-5 meningar — men aldrig längre. När användaren frågar om aktuellt pris, billigaste timmar, eller liknande - använd get_current_price eller get_today_prices function calls. För frågor om morgondagen - använd get_tomorrow_prices. Day-ahead-priserna för imorgon släpps kl 13:15 varje dag. Kontrollera den aktuella tiden som står i början av denna prompt innan du säger att det är för tidigt eller sent. Om available: false returneras, förklara vänligt att priserna släpps kl 13:15 varje dag. Gissa ALDRIG priser - hämta alltid live-data via funktionerna. Om frågan inte rör elpris eller det svenska elnätet:
— Om det är en enkel faktafråga med ett klart svar (t.ex. "Vilket är Sveriges högsta berg?"): svara kort med fakta följt av "Kebnekaise, men jag svarar bäst på frågor om elpris och det svenska elnätet." — använd komma före "men", INTE punkt.
— Om det är komplex eller känslig (filosofiska, personliga, medicinska, juridiska, politiska frågor etc): svara "Det är utanför min expertis — jag är här för att hjälpa dig med elpris och det svenska elnätet."
Ingen markdown-formattering: inga asterisker för fet text, inga listor med bindestreck, inga rubriker, inga tabeller. Naturliga URL:er som /guider/elavtal/elavtal-villa är INTE markdown — de får användas i text när det adderar värde (se länk-regeln nedan). Du får gärna använda emojis sparsamt när det passar.`;

  if (!knowledgeBlock) return base;

  const ragRules = `

Du har tillgång till en kunskapsbas i <kunskapsbas>-blocket nedan. Följ dessa regler:
- Prioritera fakta från <kunskapsbas> framför din generella kunskap.
- Vid motstrid mellan kunskapsbasen och din generella kunskap: lita på kunskapsbasen.
- Länka till en artikel ENDAST när användaren skulle få betydligt mer värde av att läsa hela artikeln än vad du kan svara med på 2-3 meningar. Standard-läget är INGEN länk — chatten ska kännas som ett samtal, inte en biblioteksindex. Vid enkla frågor med kompletta korta svar: ingen länk. Vid komplexa pedagogiska frågor där artikeln har djupare fördjupning: en länk i naturlig text med formatet /guider/{kategori}/{slug}. Aldrig fler än EN länk per svar.
- Uppfinn ALDRIG länkar eller källor — använd bara slugs som faktiskt står i utdragen.
- När du har relevant kunskap från en artikel kan du dela ett konkret tips eller en pedagogisk insikt utöver direktsvaret — chatten ska kännas som en kunnig vän som ger värde, inte som en pris-API. Håll dig fortfarande inom 2-3 meningar (4-5 vid pedagogisk komplexitet).

${knowledgeBlock}`;

  return base + ragRules;
}

const TOOLS: Anthropic.Tool[] = [
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
    console.error('[rate-limit] Upstash unavailable — failing closed:', err);
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

    // Tool use loop — max 5 iterations to avoid runaway loops
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
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
        return NextResponse.json({ reply: textBlock?.text ?? '' });
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
