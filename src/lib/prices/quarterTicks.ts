// Rena hjälpfunktioner för kvartsdiagrammets tidsaxel. Arbetar på index i
// kvartslistan, inte på klocktid, så att dygn med 92, 96 och 100 kvartar
// (sommar-/vintertid) ritas rätt.

import type { QuarterPoint } from "./quarters";

const LOCAL_TIME = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Lokal timme och minut (Europe/Stockholm) för en ISO-tid. */
export function localHourMinute(iso: string): { hour: number; minute: number } {
  const [h, m] = LOCAL_TIME.format(new Date(iso)).split(":");
  return { hour: parseInt(h, 10) % 24, minute: parseInt(m, 10) };
}

/** "HH:MM" i svensk tid. */
export function formatClock(iso: string): string {
  const { hour, minute } = localHourMinute(iso);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Index för x-axelns tickar: kvartar vars lokala starttid har minut 0 och
 * timme % everyHours === 0. På dygnet med 100 kvartar förekommer 02:00 två
 * gånger — bara den första tas med.
 */
export function buildHourTicks(quarters: QuarterPoint[], everyHours: number): number[] {
  const seen = new Set<number>();
  const ticks: number[] = [];
  quarters.forEach((q, i) => {
    const { hour, minute } = localHourMinute(q.start);
    if (minute !== 0 || hour % everyHours !== 0 || seen.has(hour)) return;
    seen.add(hour);
    ticks.push(i);
  });
  return ticks;
}
