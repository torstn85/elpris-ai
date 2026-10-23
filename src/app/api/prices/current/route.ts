import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stockholmDateString, currentSlotStartISO } from "@/lib/time";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

export interface CurrentPriceResponse {
  SE1: number;
  SE2: number;
  SE3: number;
  SE4: number;
  slot_start: string;
  fetched_at: string;
}

// ─── Supabase: latest started slot per area ───────────────────────────────────

async function fromSupabase(): Promise<CurrentPriceResponse | null> {
  // Round down to the current 15-min slot before querying so we never pick a
  // future slot. Stored timestamps are UTC timestamptz, so compare in UTC.
  const slotStart = currentSlotStartISO();
  // Lower bound: start of today in Stockholm time (naive, matches DB format)
  const todayPrefix = slotStart.slice(0, 10); // "YYYY-MM-DD" from UTC — close enough for a daily lower bound

  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .eq("resolution_minutes", 15) // pågående kvart
    .gte("delivery_period_start", `${todayPrefix}T00:00:00`)
    .lte("delivery_period_start", slotStart)
    .order("delivery_period_start", { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Pick the latest slot per area (data is DESC so first hit per area wins)
  const latest: Partial<Record<Area, number>> = {};
  for (const row of data) {
    const area = row.area as Area;
    if (!latest[area]) latest[area] = row.ore_per_kwh;
  }

  if (!AREAS.every((a) => latest[a] !== undefined)) return null;

  return {
    SE1: latest["SE1"]!,
    SE2: latest["SE2"]!,
    SE3: latest["SE3"]!,
    SE4: latest["SE4"]!,
    slot_start: slotStart,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Fallback: elprisetjustnu.se (hourly) ────────────────────────────────────

interface RawEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

async function fetchAreaHour(area: Area, dateStr: string): Promise<number> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  const data: RawEntry[] = await res.json();

  // Den kvart som pågår just nu, på tid (inte klocktimme — 02 kan finnas två
  // gånger natten till normaltid).
  const now = Date.now();
  const entry = data.find(
    (e) => Date.parse(e.time_start) <= now && now < Date.parse(e.time_end),
  );

  if (!entry) throw new Error(`No current slot in ${area}`);
  return Math.round(entry.SEK_per_kWh * 10000) / 100;
}

async function fromElprisetjustnu(): Promise<CurrentPriceResponse> {
  const dateStr = stockholmDateString();

  const [SE1, SE2, SE3, SE4] = await Promise.all(
    AREAS.map((area) => fetchAreaHour(area, dateStr))
  );

  return {
    SE1,
    SE2,
    SE3,
    SE4,
    slot_start: currentSlotStartISO(),
    fetched_at: new Date().toISOString(),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    let result = await fromSupabase();

    if (!result) {
      result = await fromElprisetjustnu();
    }

    return NextResponse.json(result, {
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
