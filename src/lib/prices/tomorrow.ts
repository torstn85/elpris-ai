import { supabase } from "@/lib/supabase";
import { parseStockholmHour, stockholmDayUTCRange } from "@/lib/time";

export const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type Area = (typeof AREAS)[number];

export interface HourEntry {
  hour: number;
  time_start: string;
  ore_per_kwh: number;
}

export type TomorrowSource = "supabase" | "elprisetjustnu";

export interface TomorrowData {
  date: string;
  source: TomorrowSource;
  areas: Record<Area, HourEntry[]>;
}

function tomorrowISODate(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

function tomorrowDateString(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}/${month}-${day}`;
}

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

async function fromSupabase(
  isoDate: string,
): Promise<Record<Area, HourEntry[]> | null> {
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

async function fromElprisetjustnu(
  dateStr: string,
): Promise<Record<Area, HourEntry[]>> {
  const [SE1, SE2, SE3, SE4] = await Promise.all(
    AREAS.map((area) => fetchArea(area, dateStr))
  );
  return { SE1, SE2, SE3, SE4 };
}

/**
 * Loads tomorrow's hourly prices. Tries Supabase first, then falls back to
 * elprisetjustnu.se. Returns null only when BOTH sources fail (typically
 * before ~13:15 when day-ahead prices aren't published yet).
 */
export async function loadTomorrowPrices(): Promise<TomorrowData | null> {
  const isoDate = tomorrowISODate();
  const dateStr = tomorrowDateString(isoDate);

  const supabaseAreas = await fromSupabase(isoDate);
  if (supabaseAreas) {
    return { date: isoDate, source: "supabase", areas: supabaseAreas };
  }

  try {
    const fallbackAreas = await fromElprisetjustnu(dateStr);
    return { date: isoDate, source: "elprisetjustnu", areas: fallbackAreas };
  } catch {
    return null;
  }
}
