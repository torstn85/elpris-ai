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

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const NBSP = " ";

/** Månadens namn ur "YYYY-MM" eller "YYYY-MM-DD": "december". */
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];

/** "2022-12" → "december 2022". */
export const formatMonthLong = (iso: string) => `${monthName(iso)}${NBSP}${iso.slice(0, 4)}`;

/** "2022-12" → "dec 2022". */
export const formatMonthShort = (iso: string) => `${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}${NBSP}${iso.slice(0, 4)}`;

/** "2023-07-16" → "16 juli 2023". */
export const formatDayLong = (iso: string) => `${Number(iso.slice(8, 10))}${NBSP}${monthName(iso)}${NBSP}${iso.slice(0, 4)}`;

/** "2022-12-14" → "14 dec 2022". */
export const formatDayShort = (iso: string) =>
  `${Number(iso.slice(8, 10))}${NBSP}${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}${NBSP}${iso.slice(0, 4)}`;

/** "2026-10-22" → "22 okt" (utan år). */
export const formatDayMonthShort = (iso: string) => `${Number(iso.slice(8, 10))}${NBSP}${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
