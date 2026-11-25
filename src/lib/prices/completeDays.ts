// Vilka elområden har ett fullständigt svenskt kalenderdygn i spot_prices?
// Samma definition som `complete` i vyn spot_prices_daily: periodernas minuter
// täcker hela dygnet (1380/1440/1500 min vid omställning till sommartid /
// vanligt dygn / omställning till normaltid). Används av /api/cron/fetch-prices
// för att hoppa över hämtningar från elprisetjustnu som inte behövs.
//
// Ren modul (ingen databas) så att scripts/check-complete-days.ts kan testa den.

import { stockholmDayUTCRange } from "@/lib/time";

export interface PeriodRow {
  area: string;
  delivery_period_start: string;
  delivery_period_end: string;
}

/** Dygnets UTC-gränser i ms: [startMs, endMs). */
export function dayBoundsMs(isoDate: string): { startMs: number; endMs: number } {
  const { from, to } = stockholmDayUTCRange(isoDate);
  return { startMs: Date.parse(from), endMs: Date.parse(to) + 1 };
}

/** Områden vars rader (perioder som startar under dygnet) täcker hela `isoDate`. */
export function completeAreas(rows: PeriodRow[], isoDate: string): Set<string> {
  const { startMs, endMs } = dayBoundsMs(isoDate);
  const dayMinutes = (endMs - startMs) / 60_000;
  const minutes = new Map<string, number>();
  for (const r of rows) {
    const s = Date.parse(r.delivery_period_start);
    if (s < startMs || s >= endMs) continue;
    const m = (Date.parse(r.delivery_period_end) - s) / 60_000;
    minutes.set(r.area, (minutes.get(r.area) ?? 0) + m);
  }
  const out = new Set<string>();
  minutes.forEach((m, area) => {
    if (m === dayMinutes) out.add(area);
  });
  return out;
}
