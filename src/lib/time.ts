const TZ = "Europe/Stockholm";

/** Current hour (0–23) in Europe/Stockholm. */
export function stockholmHour(): number {
  return parseInt(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
}

/**
 * Today's date as "YYYY-MM-DD" in Europe/Stockholm.
 * Used for Supabase date filtering.
 */
export function stockholmISODate(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Today's date as "YYYY/MM-DD" in Europe/Stockholm.
 * Used for elprisetjustnu.se API URLs.
 */
export function stockholmDateString(): string {
  const [year, month, day] = stockholmISODate().split("-");
  return `${year}/${month}-${day}`;
}

/**
 * Current 15-minute slot start as a UTC ISO string, rounded down.
 * e.g. at 15:11 Stockholm → "...T13:00:00.000Z" (UTC 13:00 = Stockholm 15:00 in CEST)
 */
export function currentSlotStartISO(): string {
  const SLOT_MS = 15 * 60 * 1000;
  return new Date(Math.floor(Date.now() / SLOT_MS) * SLOT_MS).toISOString();
}

/**
 * Extract the hour (0–23) in Europe/Stockholm from any ISO timestamp string.
 * Works correctly regardless of the offset embedded in the source string.
 */
export function parseStockholmHour(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date(isoString)),
    10
  );
}

/**
 * Returns the UTC start and end timestamps for a full Swedish calendar day.
 * Accounts for CEST (UTC+2) and CET (UTC+1) by always going 3 hours before
 * midnight to guarantee we cover 00:00 Stockholm time.
 * Returns ISO strings suitable for Supabase queries.
 */
export function stockholmDayUTCRange(isoDate?: string): { from: string; to: string } {
  const date = isoDate ?? stockholmISODate();
  // Start: previous day 21:00 UTC = covers midnight Stockholm in both CET and CEST
  const from = new Date(`${date}T00:00:00+02:00`).toISOString();
  // End: current day 22:00 UTC = covers 23:59 Stockholm in both CET and CEST
  const to = new Date(`${date}T23:59:59+01:00`).toISOString();
  return { from, to };
}
