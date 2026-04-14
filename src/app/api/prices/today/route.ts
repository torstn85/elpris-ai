import { NextResponse } from "next/server";

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

interface RawEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

export interface HourEntry {
  hour: number;        // 0–23
  time_start: string;  // ISO string for the first 15-min slot of that hour
  ore_per_kwh: number; // averaged, rounded to 1 decimal
}

export interface PricesResponse {
  date: string;
  areas: Record<Area, HourEntry[]>;
  fetched_at: string;
}

function todayDateString(): string {
  // Format: YYYY/MM-DD in Europe/Stockholm time
  const now = new Date();
  const swe = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // sv-SE gives "YYYY-MM-DD", transform to "YYYY/MM-DD"
  const [year, month, day] = swe.split("-");
  return `${year}/${month}-${day}`;
}

function aggregateToHourly(entries: RawEntry[]): HourEntry[] {
  // Group 15-min entries by hour
  const buckets: Map<number, RawEntry[]> = new Map();

  for (const entry of entries) {
    const hour = new Date(entry.time_start).getHours();
    if (!buckets.has(hour)) buckets.set(hour, []);
    buckets.get(hour)!.push(entry);
  }

  const result: HourEntry[] = [];
  for (const [hour, slots] of Array.from(buckets.entries()).sort(
    ([a], [b]) => a - b
  )) {
    const avg =
      slots.reduce((sum, s) => sum + s.SEK_per_kWh, 0) / slots.length;
    result.push({
      hour,
      time_start: slots[0].time_start,
      ore_per_kwh: Math.round(avg * 1000) / 10, // SEK/kWh → öre/kWh, 1 decimal
    });
  }

  return result;
}

async function fetchArea(area: Area, dateStr: string): Promise<HourEntry[]> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { next: { revalidate: 900 } }); // cache 15 min
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  const data: RawEntry[] = await res.json();
  return aggregateToHourly(data);
}

export async function GET() {
  try {
    const dateStr = todayDateString();

    const [SE1, SE2, SE3, SE4] = await Promise.all(
      AREAS.map((area) => fetchArea(area, dateStr))
    );

    const body: PricesResponse = {
      date: dateStr,
      areas: { SE1, SE2, SE3, SE4 },
      fetched_at: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
