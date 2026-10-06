// Serverlogik för Elduellens resultat: validering, omräkning av poäng och
// statistik. Används av /api/elduellen/result och /api/elduellen/stats.

import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabasePaging";
import { stockholmISODate } from "@/lib/time";
import { DUELS_PER_DAY } from "./config";
import { addDays, generatePuzzle } from "./generate";
import { loadDayPrices } from "./prices";
import type { Pick } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ResultInput {
  date: string;
  playerId: string;
  picks: Pick[];
}

/**
 * Dagens eller gårdagens datum (svensk tid) — gårdagen accepteras så att den
 * som avslutar strax före midnatt inte tappar sitt resultat.
 */
export function acceptedDates(): string[] {
  const today = stockholmISODate();
  return [today, addDays(today, -1)];
}

export function isValidDate(date: unknown): date is string {
  return typeof date === "string" && DATE_RE.test(date);
}

/** Validerar request-body. Returnerar felmeddelande eller den tolkade datan. */
export function parseResultInput(
  body: unknown,
): { ok: true; value: ResultInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Ogiltig förfrågan." };
  }
  const { date, playerId, picks } = body as Record<string, unknown>;
  if (!isValidDate(date) || !acceptedDates().includes(date)) {
    return { ok: false, error: "Ogiltigt eller för gammalt datum." };
  }
  if (typeof playerId !== "string" || !UUID_RE.test(playerId)) {
    return { ok: false, error: "Ogiltigt spelar-id." };
  }
  if (
    !Array.isArray(picks) ||
    picks.length !== DUELS_PER_DAY ||
    !picks.every((p) => p === "A" || p === "B")
  ) {
    return { ok: false, error: "Ogiltiga val." };
  }
  return { ok: true, value: { date, playerId: playerId.toLowerCase(), picks } };
}

/**
 * Rätt svar för dagens pussel, räknade på servern ur samma priser och samma
 * generator som sidan. Bonusduellen ingår inte. `null` om priser saknas.
 */
export async function answersFor(date: string): Promise<Pick[] | null> {
  const today = await loadDayPrices(date);
  if (!today) return null;
  const puzzle = generatePuzzle({ date, today });
  if (puzzle.duels.length !== DUELS_PER_DAY) return null;
  return puzzle.duels.map((d) => d.answer);
}

export function scorePicks(picks: Pick[], answers: Pick[]): number {
  return picks.filter((p, i) => p === answers[i]).length;
}

export type SaveResult = "saved" | "duplicate";

/** Sparar ett resultat. Ett per spelare och dag (primärnyckel). */
export async function saveResult(
  input: ResultInput,
  score: number,
): Promise<SaveResult> {
  const { error } = await supabase.from("elduellen_results").insert({
    puzzle_date: input.date,
    player_id: input.playerId,
    picks: input.picks,
    score,
  });
  if (!error) return "saved";
  if (error.code === "23505") return "duplicate"; // unique_violation
  throw new Error(error.message);
}

export interface DayStats {
  date: string;
  players: number;
  /** Antal spelare per poäng 0–5. */
  scores: number[];
  /** Andel (0–1) som valde A, per duell 1–5. null när ingen spelat. */
  shareA: (number | null)[];
}

/** Statistik för ett datum. Paginerad — kan bli fler än 1 000 spelare. */
export async function statsFor(date: string): Promise<DayStats> {
  const rows = await fetchAllPages<{ picks: Pick[]; score: number }>(
    (from, to) =>
      supabase
        .from("elduellen_results")
        .select("picks, score")
        .eq("puzzle_date", date)
        .order("player_id")
        .range(from, to),
  );
  const scores = Array.from({ length: DUELS_PER_DAY + 1 }, () => 0);
  const aCounts = Array.from({ length: DUELS_PER_DAY }, () => 0);
  for (const r of rows) {
    if (r.score >= 0 && r.score <= DUELS_PER_DAY) scores[r.score]++;
    r.picks.forEach((p, i) => {
      if (p === "A" && i < DUELS_PER_DAY) aCounts[i]++;
    });
  }
  const players = rows.length;
  return {
    date,
    players,
    scores,
    shareA: aCounts.map((n) => (players > 0 ? n / players : null)),
  };
}
