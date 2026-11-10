// Rena tidsfunktioner för sidor som visar "just nu" (inga React-beroenden, så
// att testskripten kan köra dem). Kvartsbyten räknas på epoch-tid: svensk tid
// ligger alltid hela timmar från UTC (+1 eller +2), så kvartsgränserna i svensk
// tid sammanfaller med epoch-kvartar även på omställningsdygnen (92/100 kvartar).

export const QUARTER_MS = 15 * 60 * 1000;

/** Millisekunder till nästa kvartsbyte (alltid 1..QUARTER_MS). */
export function msToNextQuarter(ms: number): number {
  return QUARTER_MS - (((ms % QUARTER_MS) + QUARTER_MS) % QUARTER_MS);
}

/** Kvartens löpnummer sedan epoch — lika för alla tider inom samma kvart. */
export function quarterIndex(ms: number): number {
  return Math.floor(ms / QUARTER_MS);
}

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });

/** Svenskt datum (YYYY-MM-DD, Europe/Stockholm) för en tidpunkt. */
export function swedishDate(ms: number): string {
  return SWEDISH_DATE.format(new Date(ms));
}
