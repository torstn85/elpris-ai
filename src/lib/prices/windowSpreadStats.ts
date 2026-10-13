// GENERERAD FIL — ändra inte för hand.
// Kör: npx tsx scripts/analysis/cheapest-hours.ts 2026-04-13 --write
//
// Medianskillnad per dygn mellan dygnets dyraste och billigaste fönster om N
// timmar i följd (1–4), per elområde. Fönster räknas i hela timmar på
// kvartspriserna och får fortsätta in i nästa dygn. Spotpris, öre/kWh exkl. moms.
// Källa: elpris.ai:s egen prisdata (spot_prices).

export type SpreadArea = "SE1" | "SE2" | "SE3" | "SE4";
export type WindowHours = 1 | 2 | 3 | 4;

export const WINDOW_SPREAD_PERIOD = {
  from: "2026-04-13",
  to: "2026-10-12",
  /** Till källraden, t.ex. "april–oktober 2026". */
  label: "april–oktober 2026",
  daysPerArea: 182,
} as const;

export const WINDOW_SPREAD_MEDIAN: Record<WindowHours, Record<SpreadArea, number>> = {
  1: { SE1: 39.5, SE2: 40.1, SE3: 94.7, SE4: 143.6 },
  2: { SE1: 39, SE2: 39.1, SE3: 92.4, SE4: 137.9 },
  3: { SE1: 38.1, SE2: 38.4, SE3: 88.6, SE4: 130.2 },
  4: { SE1: 35.4, SE2: 36.6, SE3: 84.5, SE4: 124.5 },
};
