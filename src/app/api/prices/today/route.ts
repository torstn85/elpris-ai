import { NextResponse } from "next/server";
import { loadTodayPrices, type Area, type HourEntry, type TodaySource } from "@/lib/prices/today";
import type { QuarterPoint } from "@/lib/prices/quarters";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Shared types (used by HomeClient.tsx) ───────────────────────────────────

export type { HourEntry, QuarterPoint };

export interface PricesResponse {
  /** Svenskt datum, ISO (YYYY-MM-DD). */
  date: string;
  source: TodaySource;
  /** Timsnitt per elområde — 23, 24 eller 25 timmar beroende på dygn. */
  areas: Record<Area, HourEntry[]>;
  /** Kvartspriser per elområde i tidsordning — 92, 96 eller 100 st. */
  quarters: Record<Area, QuarterPoint[]> | null;
  fetched_at: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// Timmar och kvartar kommer ur samma laddning (src/lib/prices/today.ts): en
// databasfråga, Supabase först och elprisetjustnu.se som reserv.
export async function GET() {
  const today = await loadTodayPrices();
  if (!today) {
    return NextResponse.json({ error: "Prisdata saknas just nu" }, { status: 502 });
  }

  const body: PricesResponse = {
    date: today.date,
    source: today.source,
    areas: today.areas,
    quarters: today.quarters,
    fetched_at: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}
