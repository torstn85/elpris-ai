// Chatbotens kostnadsverktyg (calculate_cost). Räknar som Elduellen:
// kWh × (dagens snittspot + energiskatt) × 1,25, exkl. nätavgift och påslag.
// Undantaget från elpris-facts regel om totalt inköpspris gäller båda.

import { CITIES } from "@/lib/cities";
import { COST_FOOTNOTE, formatKwh, priceFor } from "@/lib/elduellen/cost";
import { AREAS, loadDayPrices, type Area } from "@/lib/elduellen/prices";
import { stockholmISODate } from "@/lib/time";

const nf = (digits: number) =>
  new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Energiskatt som "36" eller "26,4". */
const taxNf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

/** "Malmö" / "malmo" / "MALMÖ" → "malmo". */
const normalize = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface CostToolInput {
  kWh: number;
  area?: string;
  city?: string;
}

export async function calculateCost(input: CostToolInput): Promise<object> {
  const kWh = Number(input.kWh);
  if (!Number.isFinite(kWh) || kWh <= 0 || kWh > 100_000) {
    return { error: "Ange förbrukningen som ett positivt antal kWh." };
  }

  const city = input.city
    ? Object.values(CITIES).find(
        (c) =>
          normalize(c.slug) === normalize(input.city!) ||
          normalize(c.name) === normalize(input.city!),
      )
    : undefined;
  const requestedArea = input.area?.toUpperCase();
  const isArea = (v?: string): v is Area =>
    (AREAS as readonly string[]).includes(v ?? "");
  // Staden avgör elområdet; annars det angivna elområdet.
  const area: Area | undefined =
    city?.area ?? (isArea(requestedArea) ? requestedArea : undefined);
  if (!area) {
    return {
      error: input.city
        ? `Staden ${input.city} finns inte i vår lista. Ange elområde (SE1–SE4) i stället.`
        : "Ange elområde (SE1–SE4) eller stad.",
    };
  }

  const date = stockholmISODate();
  const prices = await loadDayPrices(date);
  const quarters = prices?.[area] ?? [];
  if (quarters.length === 0) {
    return { error: "Dagens priser är inte tillgängliga just nu." };
  }

  const reduced = city?.reducedEnergyTax === true;
  const spotOre = quarters.reduce((s, q) => s + q.ore, 0) / quarters.length;
  const r = priceFor(spotOre, reduced, kWh);

  return {
    date,
    area,
    city: city?.name ?? null,
    city_not_found: input.city && !city ? input.city : undefined,
    kwh: `${formatKwh(kWh)} kWh`,
    spot_daily_average: `${nf(1).format(r.spotOre)} öre/kWh`,
    energy_tax: `${taxNf.format(r.taxOre)} öre/kWh`,
    reduced_energy_tax: reduced,
    vat: "25 %",
    price_per_kwh: `${nf(2).format(r.krPerKwh)} kr/kWh`,
    cost: `${nf(2).format(r.costKr)} kr`,
    calculation: `${formatKwh(kWh)} kWh × (${nf(1).format(r.spotOre)} öre spot + ${taxNf.format(r.taxOre)} öre energiskatt) × 1,25 moms ≈ ${nf(2).format(r.costKr)} kr`,
    basis: "dagens snittpris (dygnssnitt)",
    excludes: COST_FOOTNOTE,
  };
}
