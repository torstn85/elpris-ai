import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

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

function getSystemPrompt(): string {
  const now = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return `Just nu är det: ${now}. Du är elpris.ai:s AI-assistent. Du hjälper svenska användare förstå elpriser och spara pengar. Du svarar alltid på svenska, kort och konkret (max 3-4 meningar). När användaren frågar om aktuellt pris, billigaste timmar, eller liknande - använd get_current_price eller get_today_prices function calls. För frågor om morgondagen - använd get_tomorrow_prices. Day-ahead-priserna för imorgon släpps kl 13:15 varje dag. Kontrollera den aktuella tiden som står i början av denna prompt innan du säger att det är för tidigt eller sent. Om available: false returneras, förklara vänligt att priserna släpps kl 13:15 varje dag. Gissa ALDRIG priser - hämta alltid live-data via funktionerna. Om frågan inte handlar om el, säg vänligt att du bara hjälper med elprisfrågor. Använd ALDRIG markdown-formattering (ingen fet text med **asterisker**, inga listor med bindestreck, inga rubriker). Skriv bara ren text. Du får gärna använda emojis sparsamt när det passar.`;
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

    // Tool use loop — max 5 iterations to avoid runaway loops
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: getSystemPrompt(),
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
