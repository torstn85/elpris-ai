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

export async function GET() {
  try {
    const now = new Date();
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      parseInt(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", ...opts }).format(now), 10);
    const stockholmHour = fmt({ hour: "numeric", hour12: false });
    const stockholmMinute = fmt({ minute: "numeric" });
    const afterDayAhead = stockholmHour > 13 || (stockholmHour === 13 && stockholmMinute >= 15);

    // ── Today ──────────────────────────────────────────────────────────────────
    const dateStr = stockholmDateString();
    const todayResults = await Promise.all(
      AREAS.map((area) =>
        fetchRawArea(area, dateStr).then((entries) => ({ area, entries }))
      )
    );
    const todayRows: SpotPriceRow[] = todayResults.flatMap(({ area, entries }) =>
      toRows(area, entries)
    );
    const todayUpserted = await upsertRows(todayRows);

    // ── Tomorrow (only after 13:15 Stockholm time) ─────────────────────────────
    let tomorrowUpserted: number | null = null;
    if (afterDayAhead) {
      const tomorrowStr = getTomorrowDateString();
      const tomorrowResults = await Promise.all(
        AREAS.map((area) =>
          fetchRawArea(area, tomorrowStr).then((entries) => ({ area, entries }))
        )
      );
      const tomorrowRows: SpotPriceRow[] = tomorrowResults.flatMap(({ area, entries }) =>
        toRows(area, entries)
      );
      tomorrowUpserted = await upsertRows(tomorrowRows);
    }

    return NextResponse.json({
      ok: true,
      today: { date: dateStr, rows_upserted: todayUpserted },
      tomorrow: afterDayAhead
        ? { date: getTomorrowDateString(), rows_upserted: tomorrowUpserted }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
