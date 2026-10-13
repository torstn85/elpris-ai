// Dagens priser (SSR och /api/prices/today): timsnitt och kvartar ur samma
// laddning — en databasfråga, Supabase först och elprisetjustnu.se som reserv.

import { loadDayPricesDetailed, toQuarterPoints, type DaySource, type QuarterPoint } from "@/lib/prices/quarters";
import { quartersToHours, type HourEntry } from "@/lib/prices/hourly";
import { stockholmISODate } from "@/lib/time";

export const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type Area = (typeof AREAS)[number];
export type { HourEntry };

export type TodaySource = DaySource;

export interface TodayData {
  /** Svenskt datum, ISO (YYYY-MM-DD). */
  date: string;
  source: TodaySource;
  /** Timsnitt per område — 23, 24 eller 25 timmar beroende på dygn. */
  areas: Record<Area, HourEntry[]>;
  /** Kvartspriser per område — 92, 96 eller 100 kvartar beroende på dygn. */
  quarters: Record<Area, QuarterPoint[]>;
}

/**
 * Dagens priser för alla fyra elområden. `isoDate` används av testskript
 * (scripts/check-dst-days.ts); sidorna anropar utan argument. null om data
 * saknas i båda källorna.
 */
export async function loadTodayPrices(isoDate: string = stockholmISODate()): Promise<TodayData | null> {
  try {
    const day = await loadDayPricesDetailed(isoDate);
    if (!day) return null;
    const areas = {} as Record<Area, HourEntry[]>;
    const quarters = {} as Record<Area, QuarterPoint[]>;
    for (const a of AREAS) {
      areas[a] = quartersToHours(day.areas[a]);
      quarters[a] = toQuarterPoints(day.areas[a]);
    }
    return { date: isoDate, source: day.source, areas, quarters };
  } catch {
    return null;
  }
}

/**
 * Dagens kvartspriser för ett elområde (SSR), i tidsordning — 92/96/100 st
 * beroende på dygn. Samma data som fältet `quarters` i /api/prices/today.
 * null om kvartsdata saknas.
 */
export async function getTodayQuarters(area: Area): Promise<QuarterPoint[] | null> {
  return (await loadTodayPrices())?.quarters[area] ?? null;
}
