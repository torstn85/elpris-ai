// Timsnitt ur kvartspriser — den enda platsen där timmar räknas fram.
//
// Grupperar på kvartens UTC-timme, inte på svensk klocktimme: svensk tid ligger
// alltid hela timmar från UTC, så varje UTC-timme är exakt en svensk timme —
// men de två 02-timmarna natten till normaltid får olika nycklar. Ett dygn ger
// därför 23, 24 eller 25 timmar, i tidsordning.
//
// Ren modul (bara typimporter) så att även klientkomponenter kan använda
// isCurrentHour utan att dra in databasklienten.

import type { Quarter } from "./quarters";

const HOUR_MS = 60 * 60 * 1000;

const hh = (h: number) => String(h).padStart(2, "0");

/** Klocktimmen och timmen efter: "14:00–15:00", "23:00–00:00". Inte verklig sluttid —
 *  vid omställningen slutar en timme på en annan klocktid än timmen efter. */
function clockLabel(hour: number): string {
  return `${hh(hour)}:00–${hh((hour + 1) % 24)}:00`;
}

export interface HourEntry {
  /** Svensk klocktimme 0–23. Förekommer två gånger (2) på dygnet med 25 timmar. */
  hour: number;
  /** Timmens första kvart (ISO, UTC). Kvar för bakåtkompatibilitet — samma som startUTC. */
  time_start: string;
  /** Snitt av timmens kvartar, öre/kWh exkl. moms, en decimal. */
  ore_per_kwh: number;
  /** Timmens start och slut (ISO, UTC). startUTC är unik — använd som React-nyckel. */
  startUTC: string;
  endUTC: string;
  /** "14:00–15:00", "23:00–00:00", "02:00–03:00 (sommartid)" / "02:00–03:00 (normaltid)". */
  label: string;
  /** Satt bara på en timme som förekommer två gånger samma dygn. */
  dst?: "summer" | "winter";
}

const LOCAL_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  hour12: false,
});

/** Svensk tids avvikelse från UTC i timmar (1 = normaltid, 2 = sommartid). */
function stockholmOffsetHours(iso: string): number {
  const d = new Date(iso);
  const local = parseInt(LOCAL_HOUR.format(d), 10) % 24;
  return (local - d.getUTCHours() + 24) % 24;
}

/** Kvartar (i tidsordning) → timsnitt i tidsordning. */
export function quartersToHours(quarters: Quarter[]): HourEntry[] {
  const groups = new Map<string, Quarter[]>();
  for (const q of quarters) {
    const key = q.startUTC.slice(0, 13); // "YYYY-MM-DDTHH" i UTC
    const g = groups.get(key);
    if (g) g.push(q);
    else groups.set(key, [q]);
  }

  const hours = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const startUTC = new Date(`${key}:00:00.000Z`).toISOString();
      const endUTC = new Date(Date.parse(startUTC) + HOUR_MS).toISOString();
      const mean = items.reduce((s, q) => s + q.ore, 0) / items.length;
      return {
        hour: items[0].hour,
        time_start: items[0].startUTC,
        ore_per_kwh: Math.round(mean * 10) / 10,
        startUTC,
        endUTC,
        label: clockLabel(items[0].hour),
      } as HourEntry;
    });

  // Dubbla klocktimmar (02 natten till normaltid): märk dem med sommar-/normaltid.
  const count = new Map<number, number>();
  for (const h of hours) count.set(h.hour, (count.get(h.hour) ?? 0) + 1);
  for (const h of hours) {
    if ((count.get(h.hour) ?? 0) < 2) continue;
    const summer = stockholmOffsetHours(h.startUTC) === 2;
    h.dst = summer ? "summer" : "winter";
    h.label = `${h.label} (${summer ? "sommartid" : "normaltid"})`;
  }
  return hours;
}

/** Pågår timmen just nu? Jämför på tid, inte klocktimme (02 kan finnas två gånger). */
export function isCurrentHour(
  entry: Pick<HourEntry, "startUTC" | "endUTC">,
  nowMs: number = Date.now(),
): boolean {
  return Date.parse(entry.startUTC) <= nowMs && nowMs < Date.parse(entry.endUTC);
}

/** Har timmen inte börjat än? */
export function isFutureHour(
  entry: Pick<HourEntry, "startUTC">,
  nowMs: number = Date.now(),
): boolean {
  return Date.parse(entry.startUTC) > nowMs;
}
