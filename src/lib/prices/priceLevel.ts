// Prisnivå för spotpris (öre/kWh exkl. moms) — delas av startsidans livepris
// och kvartsdiagram. Jämför på avrundat värde så att färgen stämmer med det
// visade talet och legenden "Billigt ≤ 50 öre · Normalt 51–99 öre · Dyrt ≥ 100 öre".

export type PriceLevel = "cheap" | "normal" | "expensive";

/** ≤ 50 öre billigt (även negativt), ≥ 100 öre dyrt, annars normalt — på Math.round(ore). */
export function priceLevel(ore: number): PriceLevel {
  const rounded = Math.round(ore);
  if (rounded <= 50) return "cheap";
  if (rounded >= 100) return "expensive";
  return "normal";
}

export const PRICE_LEVEL_COLORS: Record<PriceLevel, string> = {
  cheap: "#22C55E",
  normal: "#00E5FF",
  expensive: "#EF4444",
};

export const PRICE_LEVEL_LABELS: Record<PriceLevel, string> = {
  cheap: "Billigt",
  normal: "Normalt",
  expensive: "Dyrt",
};
