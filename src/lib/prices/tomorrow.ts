// Morgondagens priser (/elpris-imorgon och /api/prices/tomorrow): timsnitt ur
// den delade kvartsladdaren. null före publiceringen (runt 13:15).

import { loadDayPricesDetailed, toQuarterPoints, type DaySource, type QuarterPoint } from "@/lib/prices/quarters";
import { quartersToHours, type HourEntry } from "@/lib/prices/hourly";
import { stockholmISODate } from "@/lib/time";
import { addDays } from "@/lib/dates";

export const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type Area = (typeof AREAS)[number];
export type { HourEntry };

export type TomorrowSource = DaySource;

export interface TomorrowData {
  /** Svenskt datum, ISO (YYYY-MM-DD). */
  date: string;
  source: TomorrowSource;
  /** Timsnitt per område — 23, 24 eller 25 timmar beroende på dygn. */
  areas: Record<Area, HourEntry[]>;
  /** Kvartspriser per område — 92, 96 eller 100 kvartar. Bara för sidan; API:t skickar dem inte. */
  quarters: Record<Area, QuarterPoint[]>;
}

/** Morgondagens svenska datum: dagens datum + ett kalenderdygn (inte nu + 24 h). */
export function tomorrowISODate(): string {
  return addDays(stockholmISODate(), 1);
}

/**
 * Morgondagens timpriser. Supabase först, elprisetjustnu.se som reserv. null
 * när ingen källa har data (typiskt före ~13:15). `isoDate` används av testskript.
 */
export async function loadTomorrowPrices(isoDate: string = tomorrowISODate()): Promise<TomorrowData | null> {
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
