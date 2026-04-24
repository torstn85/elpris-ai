import { NextResponse } from "next/server";
import { supabase, type SpotPriceRow } from "@/lib/supabase";
import { stockholmDateString } from "@/lib/time";

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow).replace(/-/g, "/").replace(/(\d{4})\/(\d{2})\/(\d{2})/, "$1/$2-$3");
}

interface RawEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

async function fetchRawArea(area: Area, dateStr: string): Promise<RawEntry[]> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  return res.json() as Promise<RawEntry[]>;
}

async function upsertRows(rows: SpotPriceRow[]): Promise<number> {
  const { error, count } = await supabase
    .from("spot_prices")
    .upsert(rows, {
      onConflict: "area,delivery_period_start",
      count: "exact",
    });
  if (error) throw new Error(error.message);
  return count ?? rows.length;
}

function toRows(area: Area, entries: RawEntry[]): SpotPriceRow[] {
  return entries.map((e) => ({
    area,
    delivery_period_start: e.time_start,
    delivery_period_end: e.time_end,
    sek_per_kwh: e.SEK_per_kWh,
    ore_per_kwh: Math.round(e.SEK_per_kWh * 10000) / 100,
  }));
}

interface AreaResult {
  area: Area;
  rows_upserted?: number;
  error?: string;
}

// Fetch + upsert one area, returning a structured result either way
async function fetchAndUpsertArea(area: Area, dateStr: string): Promise<AreaResult> {
  try {
    const entries = await fetchRawArea(area, dateStr);
    const rows = toRows(area, entries);
    const count = await upsertRows(rows);
    return { area, rows_upserted: count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[fetch-prices] ${area} failed for ${dateStr}: ${message}`);
    return { area, error: message };
  }
}

export async function GET() {
  try {
    const now = new Date();
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      parseInt(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", ...opts }).format(now), 10);
    const stockholmHour = fmt({ hour: "numeric", hour12: false });
    const stockholmMinute = fmt({ minute: "numeric" });
    const afterDayAhead = stockholmHour > 13 || (stockholmHour === 13 && stockholmMinute >= 15);

    // ── Today — fetch all four areas in parallel, tolerate individual failures ──
    const dateStr = stockholmDateString();
    const todayResults = await Promise.all(AREAS.map((area) => fetchAndUpsertArea(area, dateStr)));
    const todayOk = todayResults.filter((r) => !r.error);
    const todayFailed = todayResults.filter((r) => r.error);

    if (todayOk.length > 0) {
      console.log(`[fetch-prices] Today ${dateStr}: ${todayOk.length}/4 areas ok, ${todayFailed.length} failed`);
    }
    if (todayFailed.length > 0) {
      console.error(`[fetch-prices] Today failed areas: ${todayFailed.map((r) => `${r.area}(${r.error})`).join(", ")}`);
    }

    // ── Tomorrow — only after 13:15 Stockholm time ─────────────────────────────
    let tomorrowResults: AreaResult[] | null = null;
    if (afterDayAhead) {
      const tomorrowStr = getTomorrowDateString();
      tomorrowResults = await Promise.all(AREAS.map((area) => fetchAndUpsertArea(area, tomorrowStr)));
      const tmOk = tomorrowResults.filter((r) => !r.error);
      const tmFailed = tomorrowResults.filter((r) => r.error);
      if (tmOk.length > 0) {
        console.log(`[fetch-prices] Tomorrow ${tomorrowStr}: ${tmOk.length}/4 areas ok, ${tmFailed.length} failed`);
      }
      if (tmFailed.length > 0) {
        console.error(`[fetch-prices] Tomorrow failed areas: ${tmFailed.map((r) => `${r.area}(${r.error})`).join(", ")}`);
      }
    }

    // Return 500 only if ALL four today-areas failed
    if (todayOk.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "All four areas failed for today",
          today: { date: dateStr, failed: todayFailed },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      today: {
        date: dateStr,
        rows_upserted: todayOk.reduce((s, r) => s + (r.rows_upserted ?? 0), 0),
        areas_ok: todayOk.map((r) => r.area),
        areas_failed: todayFailed.map((r) => ({ area: r.area, error: r.error })),
      },
      tomorrow: tomorrowResults
        ? {
            date: getTomorrowDateString(),
            rows_upserted: tomorrowResults.filter((r) => !r.error).reduce((s, r) => s + (r.rows_upserted ?? 0), 0),
            areas_ok: tomorrowResults.filter((r) => !r.error).map((r) => r.area),
            areas_failed: tomorrowResults.filter((r) => r.error).map((r) => ({ area: r.area, error: r.error })),
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[fetch-prices] Unexpected error: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
