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
 * Formats an ISO date as a Swedish "month year" label, e.g. "2026-08-27" →
 * "augusti 2026". Shared by guide articles and city pages so the visible
 * "Publicerad/Uppdaterad"-dates use one consistent format.
 */
export function formatMonthYear(iso: string): string {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
  }).format(new Date(iso));
  return formatted.charAt(0).toLowerCase() + formatted.slice(1);
}

/**
 * Current 15-minute slot as a "HH:MM" label in Europe/Stockholm, floored.
 * e.g. at 15:11 Stockholm → "15:00". Safe to call on both server and client.
 */
export function stockholmSlotLabel(): string {
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    parseInt(
      new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, ...opts }).format(
        new Date()
      ),
      10
    );
  const hour = fmt({ hour: "numeric", hour12: false });
  const minute = fmt({ minute: "numeric" });
  const slotMinute = Math.floor(minute / 15) * 15;
  return `${String(hour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}`;
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
 * The exact UTC instant of 00:00 Stockholm time on `isoDate` ("YYYY-MM-DD").
 * Midnight is never inside a DST shift (those happen at 02:00/03:00), so
 * exactly one of +01:00 (CET) and +02:00 (CEST) maps back to 00:00 that day.
 */
function stockholmMidnightUTC(isoDate: string): Date {
  for (const offset of ["+01:00", "+02:00"]) {
    const candidate = new Date(`${isoDate}T00:00:00${offset}`);
    const local = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(candidate);
    if (local === `${isoDate} 00:00`) return candidate;
  }
  throw new Error(`Could not resolve Stockholm midnight for ${isoDate}`);
}

/**
 * Returns the UTC start and end timestamps for a full Swedish calendar day:
 * `from` = 00:00 Stockholm, `to` = 1 ms before the next day's 00:00 Stockholm
 * (inclusive, for `.lte()`). Exact in both CET and CEST, including the 23/25-hour
 * DST days — the range never spills into the previous or next day.
 * Returns ISO strings suitable for Supabase queries.
 */
export function stockholmDayUTCRange(isoDate?: string): { from: string; to: string } {
  const date = isoDate ?? stockholmISODate();
  // Next calendar date via noon UTC so DST can't shift the day.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  const from = stockholmMidnightUTC(date).toISOString();
  const to = new Date(stockholmMidnightUTC(nextDate).getTime() - 1).toISOString();
  return { from, to };
}
