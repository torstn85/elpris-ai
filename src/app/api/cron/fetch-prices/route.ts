import { NextResponse } from "next/server";
import { supabase, type SpotPriceRow } from "@/lib/supabase";

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

interface RawEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

function todayDateString(): string {
  const now = new Date();
  const swe = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = swe.split("-");
  return `${year}/${month}-${day}`;
}

async function fetchRawArea(area: Area, dateStr: string): Promise<RawEntry[]> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  return res.json() as Promise<RawEntry[]>;
}

export async function GET() {
  try {
    const dateStr = todayDateString();

    // Fetch all four areas in parallel
    const rawResults = await Promise.all(
      AREAS.map((area) =>
        fetchRawArea(area, dateStr).then((entries) => ({ area, entries }))
      )
    );

    // Build upsert rows — one row per 15-min slot per area
    const rows: SpotPriceRow[] = rawResults.flatMap(({ area, entries }) =>
      entries.map((e) => ({
        area,
        delivery_period_start: e.time_start,
        delivery_period_end: e.time_end,
        sek_per_kwh: e.SEK_per_kWh,
        ore_per_kwh: Math.round(e.SEK_per_kWh * 10000) / 100, // 2 decimals
      }))
    );

    // Upsert — conflict on (area, delivery_period_start) updates price columns
    const { error, count } = await supabase
      .from("spot_prices")
      .upsert(rows, {
        onConflict: "area,delivery_period_start",
        count: "exact",
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      date: dateStr,
      rows_upserted: count ?? rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
