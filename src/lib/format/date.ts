// Delade datumformat för svensk visning.

const SWEDISH_DAY = new Intl.DateTimeFormat("sv-SE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Stockholm",
});

/** "Onsdag 7 oktober" — versal bara på första tecknet, inget årtal, svensk tid. */
export function formatSwedishDay(date: Date): string {
  const s = SWEDISH_DAY.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
