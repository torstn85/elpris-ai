// Chatbotens kostnadsverktyg (calculate_cost). Räknar som Elduellen:
// kWh × (dagens snittspot + energiskatt) × 1,25, exkl. nätavgift och påslag.
// Undantaget från elpris-facts regel om totalt inköpspris gäller båda.

import { CITIES } from "@/lib/cities";
import { ACTIVITIES } from "@/lib/elduellen/activities";
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

/** "basta-kvall: basta en kväll" per rad — för verktygsbeskrivningen. */
export const ACTIVITY_CATALOG = ACTIVITIES.map(
  (a) => `${a.id}: ${a.label}`,
).join("\n");
export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);

export interface CostToolInput {
  /** Id ur aktivitetsbiblioteket. Har företräde framför kWh. */
  activity?: string;
  /** Fritt kWh-värde — bara när aktiviteten saknas i biblioteket. */
  kWh?: number;
  area?: string;
  city?: string;
}

export async function calculateCost(input: CostToolInput): Promise<object> {
  const activity = input.activity
    ? ACTIVITIES.find((a) => a.id === input.activity)
    : undefined;
  if (input.activity && !activity && input.kWh === undefined) {
    return {
      error: `Aktiviteten ${input.activity} finns inte i biblioteket. Ange kWh och skriv ut ditt antagande.`,
    };
  }
  const kWh = activity ? activity.kWh : Number(input.kWh);
  if (!Number.isFinite(kWh) || kWh <= 0 || kWh > 100_000) {
    return {
      error:
        "Ange en aktivitet ur biblioteket eller förbrukningen som ett positivt antal kWh.",
    };
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
  // Staden avgör elområdet; annars det angivna elområdet. Ingen plats alls =
  // SE3 som exempel.
  const example = !input.city && !input.area;
  const area: Area | undefined = example
    ? "SE3"
    : (city?.area ?? (isArea(requestedArea) ? requestedArea : undefined));
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
    example,
    city: city?.name ?? null,
    city_not_found: input.city && !city ? input.city : undefined,
    activity: activity?.label ?? null,
    kwh: `${formatKwh(kWh)} kWh`,
    kwh_source: activity
      ? "aktivitetsbiblioteket"
      : "ditt eget antagande — skriv ut det i svaret",
    assumption: activity?.assumption ?? null,
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

/** Det som footern behöver ur ett lyckat calculate_cost-svar. */
interface CostLine {
  area: string;
  example: boolean;
  city: string | null;
  reduced_energy_tax: boolean;
  calculation: string;
}

function isCostLine(v: unknown): v is CostLine {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as CostLine).calculation === "string"
  );
}

/**
 * Text som servern lägger sist i chattsvaret när calculate_cost använts:
 * uträkningsraden ordagrant, notisen om nätavgift och påslag och — om SE3
 * räknades som exempel — frågan om användarens elområde. Tom sträng om inget
 * lyckat resultat finns.
 */
export function costFooter(toolResults: unknown[]): string {
  const seen = new Set<string>();
  const lines = toolResults.filter(isCostLine).filter((r) => {
    if (seen.has(r.calculation)) return false;
    seen.add(r.calculation);
    return true;
  });
  if (lines.length === 0) return "";
  const rows = lines.map((r) => {
    const where = r.example
      ? " (exempel för SE3)"
      : r.city
        ? ` för ${r.city}${r.reduced_energy_tax ? " (nedsatt energiskatt)" : ""}`
        : ` för ${r.area}`;
    return `Uträkning${where}: ${r.calculation}`;
  });
  const parts = [
    ...rows,
    `Räknat på dagens snittpris, ${COST_FOOTNOTE}, som tillkommer och varierar mellan bolag.`,
  ];
  if (lines.some((r) => r.example))
    parts.push("Vill du att jag räknar på ditt elområde?");
  return parts.join("\n");
}
