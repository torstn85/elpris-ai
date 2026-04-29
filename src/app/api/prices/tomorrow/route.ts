import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parseStockholmHour, stockholmDayUTCRange } from "@/lib/time";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

export interface HourEntry {
  hour: number;        // 0–23
  time_start: string;  // ISO string for the first 15-min slot of that hour
  ore_per_kwh: number; // averaged across the hour, 1 decimal
}

export interface TomorrowResponse {
  date: string;
  source: "supabase" | "elprisetjustnu";
  areas: Record<Area, HourEntry[]>;
  fetched_at: string;
}

export interface TomorrowUnavailableResponse {
  available: false;
  message: string;
  date: string;
}

// ─── Tomorrow's date in Stockholm timezone ────────────────────────────────────

function tomorrowISODate(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

/** "YYYY/MM-DD" format for elprisetjustnu.se URLs */
function tomorrowDateString(): string {
  const [year, month, day] = tomorrowISODate().split("-");
  return `${year}/${month}-${day}`;
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

async function fromSupabase(isoDate: string): Promise<Record<Area, HourEntry[]> | null> {
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

  if (!AREAS.every((a) => (grouped[a]?.length ?? 0) > 0)) return null;

  return {
    SE1: aggregateToHourly(grouped["SE1"]),
    SE2: aggregateToHourly(grouped["SE2"]),
    SE3: aggregateToHourly(grouped["SE3"]),
    SE4: aggregateToHourly(grouped["SE4"]),
  };
}

// ─── Fallback from elprisetjustnu.se ─────────────────────────────────────────

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

async function fromElprisetjustnu(dateStr: string): Promise<Record<Area, HourEntry[]>> {
  const [SE1, SE2, SE3, SE4] = await Promise.all(
    AREAS.map((area) => fetchArea(area, dateStr))
  );
  return { SE1, SE2, SE3, SE4 };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const isoDate = tomorrowISODate();
  const dateStr = tomorrowDateString();

  try {
    let areas = await fromSupabase(isoDate);
    let source: TomorrowResponse["source"] = "supabase";

    if (!areas) {
      try {
        areas = await fromElprisetjustnu(dateStr);
        source = "elprisetjustnu";
      } catch {
        // Day-ahead prices not yet published (before ~13:15)
        const body: TomorrowUnavailableResponse = {
          available: false,
          message: "Morgondagens priser publiceras klockan 13:15",
          date: isoDate,
        };
        return NextResponse.json(body, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
          },
        });
      }
    }

    const body: TomorrowResponse = {
      date: isoDate,
      source,
      areas,
      fetched_at: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
