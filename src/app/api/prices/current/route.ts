import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

// ─── Stockholm time helpers ───────────────────────────────────────────────────

function stockholmDateISO(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function stockholmNowISO(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function stockholmHour(): number {
  return parseInt(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
}

// ─── Supabase: latest started slot per area ───────────────────────────────────

async function fromSupabase(): Promise<CurrentPriceResponse | null> {
  const isoDate = stockholmDateISO();
  const nowISO = stockholmNowISO();

  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .gte("delivery_period_start", `${isoDate}T00:00:00`)
    .lte("delivery_period_start", nowISO)
    .order("delivery_period_start", { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Pick the latest slot per area (data is DESC so first hit per area wins)
  const latest: Partial<Record<Area, { price: number; slot_start: string }>> = {};
  for (const row of data) {
    const area = row.area as Area;
    if (!latest[area]) {
      latest[area] = {
        price: row.ore_per_kwh,
        slot_start: row.delivery_period_start,
      };
    }
  }

  if (!AREAS.every((a) => latest[a])) return null;

  // All areas share the same slot_start (prices are published together)
  const slot_start = latest["SE3"]!.slot_start;

  return {
    SE1: latest["SE1"]!.price,
    SE2: latest["SE2"]!.price,
    SE3: latest["SE3"]!.price,
    SE4: latest["SE4"]!.price,
    slot_start,
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

  const hour = stockholmHour();

  // Find the entry whose time_start corresponds to the current Stockholm hour
  const entry = data.find((e) => {
    const entryHour = parseInt(
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        hour: "numeric",
        hour12: false,
      }).format(new Date(e.time_start)),
      10
    );
    return entryHour === hour;
  });

  if (!entry) throw new Error(`No entry for hour ${hour} in ${area}`);
  return Math.round(entry.SEK_per_kWh * 10000) / 100;
}

async function fromElprisetjustnu(): Promise<CurrentPriceResponse> {
  const isoDate = stockholmDateISO();
  // elprisetjustnu uses YYYY/MM-DD format
  const [year, monthDay] = isoDate.split("-").reduce<string[]>(
    (acc, part, i) => {
      if (i === 0) acc.push(part);
      else if (i === 1) acc[1] = (acc[1] ? acc[1] + "-" : "") + part;
      else acc[1] += "-" + part;
      return acc;
    },
    ["", ""]
  );
  const dateStr = `${year}/${monthDay}`;

  const [SE1, SE2, SE3, SE4] = await Promise.all(
    AREAS.map((area) => fetchAreaHour(area, dateStr))
  );

  const slot_start = `${isoDate}T${String(stockholmHour()).padStart(2, "0")}:00:00`;

  return {
    SE1,
    SE2,
    SE3,
    SE4,
    slot_start,
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
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
