// Delningstext och delning för Elduellen.

import { MIN_PLAYERS_FOR_PERCENTILE } from "./config";

export const SHARE_URL = "elpris.ai/elduellen";

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(".", "");

/**
 * "⚡ Elduellen #14 — 4/5 🟩🟩🟥🟩🟩\nBättre än 72 % idag. Slå mig: elpris.ai/elduellen"
 * Procentraden tas bara med när tillräckligt många har spelat.
 */
export function shareText(opts: {
  number: number | null;
  date: string;
  score: number;
  total: number;
  results: boolean[];
  betterThanPct: number | null;
  players: number;
}): string {
  const id = opts.number ? `#${opts.number}` : shortDate(opts.date);
  const squares = opts.results.map((r) => (r ? "🟩" : "🟥")).join("");
  const head = `⚡ Elduellen ${id} — ${opts.score}/${opts.total} ${squares}`;
  const pct =
    opts.betterThanPct !== null && opts.players >= MIN_PLAYERS_FOR_PERCENTILE
      ? `Bättre än ${opts.betterThanPct} % idag. `
      : "";
  return `${head}\n${pct}Slå mig: ${SHARE_URL}`;
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** navigator.share på mobil (grov pekare), annars urklipp. */
export async function shareResult(text: string): Promise<ShareOutcome> {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;
  if (isMobile && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // Faller igenom till urklipp.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
