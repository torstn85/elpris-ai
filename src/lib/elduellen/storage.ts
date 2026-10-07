// Klientlagring för Elduellen (localStorage). Ingen inloggning: ett slumpat
// player_id, dagens progress (så att man inte kan spela om), historik och streak.
//
// All åtkomst är inkapslad i try/catch — localStorage kan saknas eller kasta
// (privat läge, blockerad lagring, Safari med fulla kvoter). Spelet ska då
// fungera ändå, bara utan minne mellan besök.

import { addDays } from "./dates";
import type { Pick } from "./types";

const PREFIX = "elduellen:";
const PLAYER_KEY = `${PREFIX}player`;
const HISTORY_KEY = `${PREFIX}history`;
const dayKey = (date: string) => `${PREFIX}day:${date}`;

/** Hur många dagar historiken sparas. */
const HISTORY_DAYS = 120;

export interface DayProgress {
  /** A/B per spelad huvudduell, i ordning. */
  picks: Pick[];
  bonusPick?: Pick;
  /** Resultatet har tagits emot av servern (201 eller 409). */
  submitted?: boolean;
}

export interface HistoryEntry {
  date: string;
  score: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Lagring otillgänglig — spelet fortsätter utan minne.
  }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // faller igenom till manuell v4
  }
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Spelarens id. Skapas och sparas vid första anropet. */
export function getPlayerId(): string {
  const existing = read<string>(PLAYER_KEY);
  if (existing) return existing;
  const id = randomId();
  write(PLAYER_KEY, id);
  return id;
}

export function loadProgress(date: string): DayProgress | null {
  const p = read<DayProgress>(dayKey(date));
  return p && Array.isArray(p.picks) ? p : null;
}

export function saveProgress(date: string, progress: DayProgress): void {
  write(dayKey(date), progress);
}

export function loadHistory(): HistoryEntry[] {
  const h = read<HistoryEntry[]>(HISTORY_KEY);
  return Array.isArray(h) ? h : [];
}

/** Lägger till (eller ersätter) dagens resultat i historiken. */
export function recordHistory(date: string, score: number): HistoryEntry[] {
  const cutoff = addDays(date, -HISTORY_DAYS);
  const next = [
    ...loadHistory().filter((e) => e.date !== date && e.date >= cutoff),
    { date, score },
  ].sort((a, b) => a.date.localeCompare(b.date));
  write(HISTORY_KEY, next);
  return next;
}

/**
 * Tar bort dagsnycklar (elduellen:day:{datum}) äldre än HISTORY_DAYS — samma
 * gräns som historiken. Rör aldrig elduellen:player eller elduellen:history.
 * Allt i try/catch: rensningen får aldrig störa spelet.
 */
export function pruneOldDays(today: string): void {
  try {
    const cutoff = addDays(today, -HISTORY_DAYS);
    const prefix = `${PREFIX}day:`;
    const stale: string[] = [];
    // Samla först — att ta bort under iterationen flyttar index.
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // Lagring otillgänglig — inget att rensa.
  }
}

/** Antal dagar i rad som spelats, räknat bakåt från `date`. */
export function streakFor(history: HistoryEntry[], date: string): number {
  const played = new Set(history.map((e) => e.date));
  let streak = 0;
  for (let d = date; played.has(d); d = addDays(d, -1)) streak++;
  return streak;
}
