// Energiskatt och moms 2026 — enligt elpris-facts (källa: Skatteverket).
// Ändras här, inte i spellogik eller sidor.

/** Energiskatt för hushåll, normalnivå 2026, öre/kWh exkl. moms. */
export const ENERGY_TAX_ORE = 36.0;

/**
 * Nedsatt energiskatt 2026 (avdrag 9,6 öre/kWh), öre/kWh exkl. moms. Gäller hushåll
 * i bl.a. samtliga kommuner i Norrbottens, Västerbottens och Jämtlands län — se
 * elpris-facts för hela listan. Vilka städer som omfattas styrs av
 * `reducedEnergyTax` i src/lib/cities.ts.
 */
export const REDUCED_ENERGY_TAX_ORE = 26.4;

/** Moms på el (25 %). */
export const VAT_FACTOR = 1.25;

export function energyTaxOre(reduced: boolean): number {
  return reduced ? REDUCED_ENERGY_TAX_ORE : ENERGY_TAX_ORE;
}
