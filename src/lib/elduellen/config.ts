// Elduellen — konstanter. Ändras här, inte i generator eller UI.

/**
 * Lanseringsdatum (svensk tid, YYYY-MM-DD) = pussel #1. Sätts när
 * NEXT_PUBLIC_GAMES_ENABLED slås på. `null` = inget pusselnummer visas än.
 */
export const LAUNCH_DATE: string | null = null;

export const DUELS_PER_DAY = 5;

/** Kvoten dyrare/billigare måste ligga i [MIN_RATIO, MAX_RATIO]. */
export const MIN_RATIO = 1.15;
export const MAX_RATIO = 3;

/** Det dyrare alternativet måste kosta minst så här mycket, i kr. */
export const MIN_EXPENSIVE_KR = 0.5;

/** Minsta kostnadsskillnad mellan alternativen, i kr. */
export const MIN_DIFF_KR = 0.1;

/** En aktivitet får inte återkomma inom så här många dagar (dagens inräknad). */
export const ACTIVITY_REPEAT_WINDOW_DAYS = 4;

/**
 * Nödreserv (sista utväg, så att en dag aldrig får färre än 5 dueller):
 * sänkta beloppsgränser i nödreservens sista steg.
 */
export const EMERGENCY_MIN_EXPENSIVE_KR = 0.1;
export const EMERGENCY_MIN_DIFF_KR = 0.01;

/** Högst så många dygnssnitt-aktiviteter per dag. */
export const MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY = 1;

/** Antal kandidatpar som provas per duelltyp innan typen byts. */
export const MAX_ATTEMPTS = 120;

/** Aktiviteter som inte används i v1 (utöver confidence 'låg'). */
export const EXCLUDED_ACTIVITY_IDS = new Set([
  // Pågår över midnatt — kräver morgondagens priser (beslut 2026-10-06).
  "element-natt",
  "elfilt",
  "flakt",
]);

/** Trösklar för jämförelse i resultatvyn (etapp 4). */
export const MIN_PLAYERS_FOR_SHARES = 10;
export const MIN_PLAYERS_FOR_PERCENTILE = 30;
