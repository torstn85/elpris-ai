import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import {
  answersFor,
  parseResultInput,
  saveResult,
  scorePicks,
} from "@/lib/elduellen/results";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lazy så att saknade env-variabler inte kraschar bygget.
let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:elduellen:result",
    });
  }
  return limiter;
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_GAMES_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Rate limit (fail closed: hellre tappa ett resultat än släppa igenom spam
  //    som förvränger statistiken). Spelet fungerar ändå i klienten.
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const { success, reset } = await getLimiter().limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "För många förfrågningar. Försök igen om en stund." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
            ),
          },
        },
      );
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : typeof err;
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[elduellen/result] rate limit unavailable — failing closed: ${name}: ${message}`,
    );
    return NextResponse.json(
      { error: "Tjänsten är tillfälligt otillgänglig." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }
  const parsed = parseResultInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.value;

  try {
    // Poängen räknas alltid om här — klientens poäng används aldrig.
    const answers = await answersFor(input.date);
    if (!answers) {
      return NextResponse.json(
        { error: "Dagens pussel kunde inte räknas fram." },
        { status: 503 },
      );
    }
    const score = scorePicks(input.picks, answers);
    const saved = await saveResult(input, score);
    return NextResponse.json(
      { status: saved, score, answers },
      { status: saved === "saved" ? 201 : 409 },
    );
  } catch (err) {
    console.error(
      "[elduellen/result]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Kunde inte spara resultatet." },
      { status: 500 },
    );
  }
}
