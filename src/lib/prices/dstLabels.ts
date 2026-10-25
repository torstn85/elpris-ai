// Klockslag med sommartid/normaltid för natten till normaltid, då klocktimmen
// 02 förekommer två gånger (02:00–03:00 först i sommartid, sedan i normaltid).
// Delas av timtabellerna (hourly.ts), kvartsdiagrammets tooltip och
// "kl HH:MM"-sammanfattningarna, så att samma tidpunkt alltid märks likadant.
//
// Ren modul utan beroenden till databasen – används på servern, i klient-
// komponenter och i testskript.

import { formatClock, localHourMinute } from "./quarterTicks";

const HOUR_MS = 60 * 60 * 1000;
const QUARTER_MS = 15 * 60 * 1000;

const LOCAL_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  hour12: false,
});

/** Svensk tids avvikelse från UTC i timmar (1 = normaltid, 2 = sommartid). */
export function stockholmOffsetHours(iso: string): number {
  const d = new Date(iso);
  const local = parseInt(LOCAL_HOUR.format(d), 10) % 24;
  return (local - d.getUTCHours() + 24) % 24;
}

const sameClock = (a: number, b: number) => {
  const x = localHourMinute(new Date(a).toISOString());
  const y = localHourMinute(new Date(b).toISOString());
  return x.hour === y.hour && x.minute === y.minute;
};

/**
 * Infaller tidpunkten i en klocktimme som förekommer två gånger samma natt?
 * Sant om samma klockslag också inträffar en timme före eller efter.
 */
export function isRepeatedClock(iso: string): boolean {
  const t = Date.parse(iso);
  return sameClock(t, t - HOUR_MS) || sameClock(t, t + HOUR_MS);
}

/** "dst"-markering för en tidpunkt i den dubbla timmen, annars undefined. */
export function dstKind(iso: string): "summer" | "winter" | undefined {
  if (!isRepeatedClock(iso)) return undefined;
  return stockholmOffsetHours(iso) === 2 ? "summer" : "winter";
}

/** " (sommartid)" / " (normaltid)" för den dubbla timmen, annars "". */
export function dstSuffix(iso: string): string {
  const kind = dstKind(iso);
  return kind === "summer" ? " (sommartid)" : kind === "winter" ? " (normaltid)" : "";
}

/** "HH:MM", med " (sommartid)"/" (normaltid)" i den dubbla timmen. */
export function formatClockDst(iso: string): string {
  return `${formatClock(iso)}${dstSuffix(iso)}`;
}

/**
 * Kvartens klockslag, t.ex. "14:15–14:30". Sluttiden räknas på väggklockan i
 * kvartens egen tid, så den sista sommartidskvarten blir "02:45–03:00
 * (sommartid)" – inte "02:45–02:00" som en ren UTC-omräkning ger.
 */
export function quarterRangeLabel(startIso: string): string {
  const { hour, minute } = localHourMinute(startIso);
  const end = (hour * 60 + minute + QUARTER_MS / 60000) % (24 * 60);
  const hh = (n: number) => String(n).padStart(2, "0");
  return `${hh(hour)}:${hh(minute)}–${hh(Math.floor(end / 60))}:${hh(end % 60)}${dstSuffix(startIso)}`;
}
