import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stockholmISODate, stockholmDayUTCRange } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALL_AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof ALL_AREAS)[number];

export interface HistoryDay {
  date: string;
  areas: Partial<Record<Area, number>>;
}

export interface HistoryResponse {
  days: HistoryDay[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(isoDate: string, days: number): string {
  // Use noon UTC to avoid DST edge-cases when shifting days
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function toStockholmDate(isoString: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoString));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const areaParam = searchParams.get("area") as Area | null;
    const areas: Area[] =
      areaParam && ALL_AREAS.includes(areaParam as Area)
        ? [areaParam]
        : [...ALL_AREAS];

    const today = stockholmISODate();
    const yesterday = addDays(today, -1);
    const sevenDaysAgo = addDays(today, -7);

    // Full UTC range: from 00:00 Stockholm 7 days ago to 23:59 Stockholm yesterday
    const { from } = stockholmDayUTCRange(sevenDaysAgo);
    const { to } = stockholmDayUTCRange(yesterday);

    const { data, error } = await supabase
      .from("spot_prices")
      .select("area, delivery_period_start, ore_per_kwh")
      .in("area", areas)
      .gte("delivery_period_start", from)
      .lte("delivery_period_start", to)
      .order("delivery_period_start");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ days: [] });
    }

    // Aggregate: group by Stockholm date + area → collect ore_per_kwh values
    const buckets = new Map<string, Map<Area, number[]>>();

    for (const row of data) {
      const date = toStockholmDate(row.delivery_period_start);
      if (!buckets.has(date)) buckets.set(date, new Map());
      const dayMap = buckets.get(date)!;
      if (!dayMap.has(row.area)) dayMap.set(row.area, []);
      dayMap.get(row.area)!.push(row.ore_per_kwh);
    }

    // Build response: average per area per day, sorted oldest first
    const days: HistoryDay[] = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayMap]) => {
        const areaAverages: Partial<Record<Area, number>> = {};
        for (const [area, values] of Array.from(dayMap.entries())) {
          const avg = values.reduce((s, v) => s + v, 0) / values.length;
          areaAverages[area] = Math.round(avg * 10) / 10;
        }
        return { date, areas: areaAverages };
      });

    return NextResponse.json({ days } satisfies HistoryResponse, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
