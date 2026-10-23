// Omvandling från elprisetjustnu.se till rader i spot_prices — delas av
// cron-jobbet (/api/cron/fetch-prices) och historikimporten
// (scripts/import-history.ts) så att båda räknar ore_per_kwh exakt likadant.
//
// Ren modul (bara typimporter) så att skript kan använda den utan Next.js.

import type { SpotPriceRow } from "@/lib/supabase";

export type SpotArea = SpotPriceRow["area"];

/** En post i svaret från elprisetjustnu.se (fälten vi använder). */
export interface ElprisetjustnuEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

/** API-adress för ett svenskt kalenderdygn ("YYYY-MM-DD") och område. */
export function elprisetjustnuUrl(area: SpotArea, isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `https://www.elprisetjustnu.se/api/v1/prices/${y}/${m}-${d}_${area}.json`;
}

/** Öre/kWh med två decimaler ur SEK/kWh. */
export function oreFromSek(sek: number): number {
  return Math.round(sek * 10000) / 100;
}

/**
 * Svarets poster → rader för upsert i spot_prices.
 *
 * elprisetjustnu anger fel sluttid för sista perioden före omställningen till
 * normaltid: "02:45+02:00 → 03:00+01:00" (75 min i stället för 15), före
 * oktober 2025 "02:00+02:00 → 03:00+01:00" (120 min). En sluttid som ligger
 * efter nästa periods start sätts därför till nästa periods start. En lucka
 * (sluttid före nästa start) lämnas orörd så att den syns i kontrollerna.
 */
export function toSpotPriceRows(area: SpotArea, entries: ElprisetjustnuEntry[]): SpotPriceRow[] {
  return entries.map((e, i) => {
    const next = entries[i + 1];
    const overlapsNext = next !== undefined && Date.parse(e.time_end) > Date.parse(next.time_start);
    return {
      area,
      delivery_period_start: e.time_start,
      delivery_period_end: overlapsNext ? next.time_start : e.time_end,
      sek_per_kwh: e.SEK_per_kWh,
      ore_per_kwh: oreFromSek(e.SEK_per_kWh),
    };
  });
}
