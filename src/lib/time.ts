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
