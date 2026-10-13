// Datumhjälp för svenska kalenderdatum (YYYY-MM-DD). Räknar på kalenderdygn,
// aldrig på "nu ± 24 h" — dygnen med sommar-/vintertidsomställning har 23
// respektive 25 timmar. Fristående (inga beroenden) så att även klientkod kan
// använda den.

/** Antal kalenderdygn från `fromIso` till `toIso`. */
export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** `iso` plus `days` kalenderdygn, t.ex. addDays("2026-10-24", 1) → "2026-10-25". */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
