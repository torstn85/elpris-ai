// Sammanfattningar av ett dygns priser för /elpris-idag: snitt, billigaste och
// dyraste kvart, billigaste timme och billigaste sammanhängande fönster.
// Ren modul (bara typimporter + formatClock) — körs på servern och i testskript.

import type { HourEntry } from "./hourly";
import type { QuarterPoint } from "./quarters";
import { formatClock } from "./quarterTicks";

/** Snitt av dygnets kvartspriser (öre/kWh, oavrundat). */
export function quarterAverage(quarters: QuarterPoint[]): number {
  return quarters.reduce((s, q) => s + q.ore, 0) / quarters.length;
}

/** Billigaste och dyraste kvart. Vid lika pris vinner den tidigaste. */
export function quarterExtremes(quarters: QuarterPoint[]): { min: QuarterPoint; max: QuarterPoint } {
  let min = quarters[0];
  let max = quarters[0];
  for (const q of quarters) {
    if (q.ore < min.ore) min = q;
    if (q.ore > max.ore) max = q;
  }
  return { min, max };
}

/** Billigaste timmen (timsnitt). Vid lika pris vinner den tidigaste. */
export function cheapestHour(hours: HourEntry[]): HourEntry {
  return hours.reduce((best, h) => (h.ore_per_kwh < best.ore_per_kwh ? h : best), hours[0]);
}

/** Kvarten som pågår vid nowMs, eller null utanför dygnet. */
export function currentQuarter(quarters: QuarterPoint[], nowMs: number): QuarterPoint | null {
  const QUARTER_MS = 15 * 60 * 1000;
  return (
    quarters.find((q) => {
      const start = Date.parse(q.start);
      return start <= nowMs && nowMs < start + QUARTER_MS;
    }) ?? null
  );
}

export interface CheapWindow {
  /** "22:00" — första timmens start (klocktid). */
  start: string;
  /** "01:00" — sista timmens slut (klocktid). */
  end: string;
  /** Snitt av fönstrets timsnitt, öre/kWh (oavrundat). */
  avg: number;
  /** Antal timmar i fönstret. */
  hours: number;
  /** true när färre timmar än önskat återstår — fönstret är då resten av dagen. */
  restOfDay: boolean;
}

/**
 * Billigaste sammanhängande fönster om `size` timmar bland dygnets återstående
 * timmar (pågående timme räknas med). Återstår färre än `size` timmar blir
 * fönstret resten av dagen. null när dygnet är slut.
 */
export function cheapestWindow(hours: HourEntry[], nowMs: number, size = 3): CheapWindow | null {
  const left = hours.filter((h) => Date.parse(h.endUTC) > nowMs);
  if (left.length === 0) return null;

  const mean = (hs: HourEntry[]) => hs.reduce((s, h) => s + h.ore_per_kwh, 0) / hs.length;
  let best = left.slice(0, Math.min(size, left.length));
  for (let i = 1; i + size <= left.length; i++) {
    const w = left.slice(i, i + size);
    if (mean(w) < mean(best)) best = w;
  }
  return {
    start: formatClock(best[0].startUTC),
    end: formatClock(best[best.length - 1].endUTC),
    avg: mean(best),
    hours: best.length,
    restOfDay: left.length < size,
  };
}

export interface DayWindow {
  /** "13:00" — första timmens start (klocktid). */
  start: string;
  /** "15:00" — sista timmens slut (klocktid). */
  end: string;
  /** Fönstrets start och slut (ISO, UTC) — för "har redan varit" / "pågår nu". */
  startUTC: string;
  endUTC: string;
  /** Snitt av fönstrets timsnitt, öre/kWh (oavrundat). */
  avg: number;
}

/**
 * Billigaste eller dyraste sammanhängande fönster om `size` timmar över HELA
 * dygnet (oberoende av klockan). Timmarna i tidsordning, så dygn med 23/25
 * timmar blir rätt. Vid lika pris vinner det tidigaste. null om dygnet har
 * färre timmar än `size`.
 */
export function dayWindow(hours: HourEntry[], size: number, mode: "cheapest" | "dearest"): DayWindow | null {
  if (hours.length < size) return null;
  const mean = (hs: HourEntry[]) => hs.reduce((s, h) => s + h.ore_per_kwh, 0) / hs.length;
  let bestIndex = 0;
  let bestAvg = mean(hours.slice(0, size));
  for (let i = 1; i + size <= hours.length; i++) {
    const avg = mean(hours.slice(i, i + size));
    if (mode === "cheapest" ? avg < bestAvg : avg > bestAvg) {
      bestIndex = i;
      bestAvg = avg;
    }
  }
  const first = hours[bestIndex];
  const last = hours[bestIndex + size - 1];
  return {
    start: formatClock(first.startUTC),
    end: formatClock(last.endUTC),
    startUTC: first.startUTC,
    endUTC: last.endUTC,
    avg: bestAvg,
  };
}

export interface WindowAdvice {
  /** true = nu-fönstret ligger inom tröskeln från det billigaste kvarvarande. */
  goodNow: boolean;
  /** Snitt för fönstret som börjar med pågående timme (öre/kWh). */
  nowAvg: number;
  /**
   * Fönstret att vänta på: det NÄRMASTE kvarvarande fönstret (idag eller imorgon)
   * som ligger inom tröskeln från det billigaste kvarvarande. Är det nu-fönstret
   * blir goodNow true.
   */
  best: { start: string; startUTC: string; avg: number; tomorrow: boolean };
  /** Millisekunder från nu till bästa fönstrets start (0 om det börjar nu). */
  waitMs: number;
  /** Dagens spridning: dyraste − billigaste fönster över hela dygnet (öre/kWh). */
  daySpread: number;
}

/**
 * Råd för en aktivitet som tar `size` timmar: är det ett bra läge nu, eller
 * lönar det sig att vänta? Relativt dagens priser, utan fast öretröskel:
 *
 *   bra läge  ⇔  nuSnitt ≤ bästaKvarvarande + threshold × dagensSpridning
 *
 * Annars föreslås det närmaste fönstret som uppfyller samma villkor — ett
 * nästan lika billigt fönster idag går före det billigaste imorgon.
 *
 * där dagensSpridning = dyraste − billigaste fönster om `size` timmar över hela
 * dygnet. Kvarvarande fönster får starta från pågående timme och framåt, och
 * fortsätta in i morgondagen om dess priser finns (`tomorrow`, annars []).
 * Klarar 23/25-timmarsdygn (räknar i HourEntry-ordning, inte klocktimmar).
 * null om pågående timme inte finns i `today`.
 */
export function windowAdvice(
  today: HourEntry[],
  tomorrow: HourEntry[],
  size: number,
  nowMs: number,
  threshold = 0.1,
): WindowAdvice | null {
  const i = today.findIndex((h) => Date.parse(h.startUTC) <= nowMs && nowMs < Date.parse(h.endUTC));
  if (i < 0) return null;
  const all = [...today, ...tomorrow];
  const mean = (hs: HourEntry[]) => hs.reduce((s, h) => s + h.ore_per_kwh, 0) / hs.length;

  const nowAvg = mean(all.slice(i, i + size));
  // Kandidater: hela fönster från pågående timme och framåt; finns inga, resten av dygnet.
  let best = { index: i, avg: nowAvg };
  for (let k = i; k + size <= all.length; k++) {
    const avg = mean(all.slice(k, k + size));
    if (avg < best.avg) best = { index: k, avg };
  }
  const cheap = dayWindow(today, size, "cheapest");
  const dear = dayWindow(today, size, "dearest");
  const daySpread = cheap && dear ? dear.avg - cheap.avg : 0;
  const limit = best.avg + threshold * daySpread;
  // Närmaste fönster inom tröskeln (nu-fönstret först); best uppfyller alltid villkoret.
  for (let k = i; k <= best.index; k++) {
    const avg = k === i ? nowAvg : mean(all.slice(k, k + size));
    if (avg <= limit) {
      best = { index: k, avg };
      break;
    }
  }
  const startHour = all[best.index];
  return {
    goodNow: best.index === i,
    nowAvg,
    best: { start: formatClock(startHour.startUTC), startUTC: startHour.startUTC, avg: best.avg, tomorrow: best.index >= today.length },
    waitMs: Math.max(0, Date.parse(startHour.startUTC) - nowMs),
    daySpread,
  };
}
