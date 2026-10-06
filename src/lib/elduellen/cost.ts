// Kostnadsberäkning för Elduellen.
//
// kostnad = kWh × (spotpris + energiskatt) × moms — märkt "exkl. nätavgift och
// elhandlarens påslag". Undantaget från elpris-facts regel om totalt inköpspris
// gäller bara spelet (se elpris-facts).

import { VAT_FACTOR, energyTaxOre } from "@/lib/energyTax";
import type { Activity } from "./activities";
import type { Quarter } from "./prices";

export const COST_FOOTNOTE = "exkl. nätavgift och elhandlarens påslag";
export const DAILY_AVERAGE_NOTE = "räknat på dagens snittpris";

export interface CostResult {
  /** Snittligt spotpris i fönstret, öre/kWh exkl. moms. */
  spotOre: number;
  /** Energiskatt som använts, öre/kWh exkl. moms. */
  taxOre: number;
  /** (spot + skatt) × moms, kr/kWh. */
  krPerKwh: number;
  /** Totalkostnad i kr (oavrundad — avrunda först vid visning). */
  costKr: number;
  /** "10 kWh × 1,12 kr/kWh ≈ 11,20 kr" */
  breakdown: string;
}

const nf = (digits: number) =>
  new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** "0,06" / "1,5" / "46" — kWh som i biblioteket, med decimalkomma. */
export function formatKwh(kWh: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(
    kWh,
  );
}

/** Kostnad för visning: kronor med två decimaler, under 1 kr även i öre. */
export function formatCost(kr: number): string {
  const ore = Math.round(kr * 100);
  if (Math.abs(ore) < 100) return `${nf(2).format(kr)} kr (${ore} öre)`;
  return `${nf(2).format(kr)} kr`;
}

function priceFor(
  spotOre: number,
  reducedTax: boolean,
  kWh: number,
): CostResult {
  const taxOre = energyTaxOre(reducedTax);
  const krPerKwh = ((spotOre + taxOre) * VAT_FACTOR) / 100;
  const costKr = kWh * krPerKwh;
  return {
    spotOre,
    taxOre,
    krPerKwh,
    costKr,
    breakdown: `${formatKwh(kWh)} kWh × ${nf(2).format(krPerKwh)} kr/kWh ≈ ${nf(2).format(costKr)} kr`,
  };
}

/**
 * Index för kvarten som startar kl `hour`:00 lokal tid (första förekomsten,
 * så dubbla 02:xx på vintertidsdygnet hanteras). -1 om den saknas.
 */
export function startIndex(quarters: Quarter[], hour: number): number {
  return quarters.findIndex((q) => q.hour === hour && q.minute === 0);
}

/** Antal kvartar en aktivitet täcker (minst en). */
export function quarterCount(durationMin: number): number {
  return Math.max(1, Math.ceil(durationMin / 15));
}

/**
 * Kostnad vid en tidpunkt: snitt av kvartspriserna från `hour`:00 och
 * `durationMin` framåt. `null` om fönstret inte ryms inom dygnet.
 */
export function costAtTime(
  activity: Activity,
  quarters: Quarter[],
  hour: number,
  reducedTax: boolean,
): CostResult | null {
  const i = startIndex(quarters, hour);
  const n = quarterCount(activity.durationMin);
  if (i < 0 || i + n > quarters.length) return null;
  const window = quarters.slice(i, i + n);
  const spot = window.reduce((s, q) => s + q.ore, 0) / window.length;
  return priceFor(spot, reducedTax, activity.kWh);
}

/** Kostnad räknad på dygnets snittpris. */
export function costDailyAverage(
  activity: Activity,
  quarters: Quarter[],
  reducedTax: boolean,
): CostResult | null {
  if (quarters.length === 0) return null;
  const spot = quarters.reduce((s, q) => s + q.ore, 0) / quarters.length;
  return priceFor(spot, reducedTax, activity.kWh);
}

/** Tillåtna starttimmar (hela timmar) där aktiviteten ryms före midnatt. */
export function validStartHours(
  activity: Activity,
  quarters: Quarter[],
): number[] {
  if (activity.priceMode !== "tidpunkt") return [];
  const [from, to] = activity.hours;
  const hours: number[] = [];
  const push = (h: number) => {
    const i = startIndex(quarters, h);
    if (i >= 0 && i + quarterCount(activity.durationMin) <= quarters.length)
      hours.push(h);
  };
  if (from <= to) for (let h = from; h < to; h++) push(h);
  else {
    for (let h = from; h < 24; h++) push(h);
    for (let h = 0; h < to; h++) push(h);
  }
  return hours;
}
