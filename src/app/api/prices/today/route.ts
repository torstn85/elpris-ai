import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stockholmDateString, stockholmISODate, parseStockholmHour, stockholmDayUTCRange } from "@/lib/time";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

// ─── Shared types (used by page.tsx) ─────────────────────────────────────────

export interface HourEntry {
  hour: number;        // 0–23
  time_start: string;  // ISO string for the first 15-min slot of that hour
  ore_per_kwh: number; // averaged across the hour, 1 decimal
}

export interface PricesResponse {
  date: string;
  source: "supabase" | "elprisetjustnu";
  areas: Record<Area, HourEntry[]>;
  fetched_at: string;
}

// ─── Aggregate 15-min slots → hourly ─────────────────────────────────────────

interface RawSlot {
  time_start: string;
  ore_per_kwh: number;
}

function aggregateToHourly(slots: RawSlot[]): HourEntry[] {
  const buckets = new Map<number, RawSlot[]>();
  for (const slot of slots) {
    const hour = parseStockholmHour(slot.time_start);
    if (!buckets.has(hour)) buckets.set(hour, []);
    buckets.get(hour)!.push(slot);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, items]) => ({
      hour,
      time_start: items[0].time_start,
      ore_per_kwh:
        Math.round(
          (items.reduce((s, i) => s + i.ore_per_kwh, 0) / items.length) * 10
        ) / 10,
    }));
}

// ─── Supabase read ────────────────────────────────────────────────────────────

async function fromSupabase(): Promise<Record<Area, HourEntry[]> | null> {
  const isoDate = stockholmISODate();

  const { from, to } = stockholmDayUTCRange(isoDate);
  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .gte("delivery_period_start", from)
    .lte("delivery_period_start", to)
    .order("delivery_period_start");

  if (error || !data || data.length === 0) return null;

  const grouped: Record<string, RawSlot[]> = {};
  for (const row of data) {
    if (!grouped[row.area]) grouped[row.area] = [];
    grouped[row.area].push({
      time_start: row.delivery_period_start,
      ore_per_kwh: row.ore_per_kwh,
    });
  }

  // Require all four areas to be present
  if (!AREAS.every((a) => (grouped[a]?.length ?? 0) > 0)) return null;

  return {
    SE1: aggregateToHourly(grouped["SE1"]),
    SE2: aggregateToHourly(grouped["SE2"]),
    SE3: aggregateToHourly(grouped["SE3"]),
    SE4: aggregateToHourly(grouped["SE4"]),
  };
}

// ─── Direct fallback from elprisetjustnu.se ───────────────────────────────────

interface RawEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

async function fetchArea(area: Area, dateStr: string): Promise<HourEntry[]> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  const data: RawEntry[] = await res.json();
  return aggregateToHourly(
    data.map((e) => ({
      time_start: e.time_start,
      ore_per_kwh: Math.round(e.SEK_per_kWh * 10000) / 100,
    }))
  );
}

async function fromElprisetjustnu(): Promise<Record<Area, HourEntry[]>> {
  const dateStr = stockholmDateString();
  const [SE1, SE2, SE3, SE4] = await Promise.all(
    AREAS.map((area) => fetchArea(area, dateStr))
  );
  return { SE1, SE2, SE3, SE4 };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    let areas = await fromSupabase();
    let source: PricesResponse["source"] = "supabase";

    if (!areas) {
      areas = await fromElprisetjustnu();
      source = "elprisetjustnu";
    }

    const body: PricesResponse = {
      date: stockholmDateString(),
      source,
      areas,
      fetched_at: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
