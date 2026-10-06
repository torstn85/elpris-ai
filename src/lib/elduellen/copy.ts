// Verdikt- och resultattexter. Vänliga, aldrig hånfulla. Väljs deterministiskt
// per dag + duell så att alla spelare ser samma text.

import { hashString } from "./rng";

export const RIGHT_VERDICTS = [
  "Pang, rätt! ⚡",
  "Elnördnivå 💡",
  "Kilowattkoll! 🎯",
  "Snyggt läst! 🔌",
  "Helt rätt — du har koll 👌",
  "Rakt i elmätaren! ✅",
];

export const WRONG_VERDICTS = [
  "Aj, där sved det 🔥",
  "Elpriset lurade dig den här gången 😅",
  "Knepig en, den där! 🤔",
  "Inte riktigt — men nu vet du 💡",
  "Där fick elpriset sista ordet ⚡",
  "Nära! Nästa duell är din 🙌",
];

/** En kommentar per slutpoäng 0–5. */
export const SCORE_COMMENTS = [
  "Tuff dag på elmarknaden — imorgon vänder det! 🌱",
  "En rätt är en start. Elpriset är luriga grejer 🔌",
  "Två rätt! Du börjar känna rytmen i elpriset ⚡",
  "Snyggt! Elpriset är inte alltid lätt att gissa 💡",
  "Starkt — nästan full pott! 🔥",
  "Full pott! Du har riktig elkoll 🏆",
];

/** Samma verdikt för alla spelare samma dag och duell. */
export function verdict(date: string, duelKey: string, right: boolean): string {
  const list = right ? RIGHT_VERDICTS : WRONG_VERDICTS;
  const h = hashString(`verdikt:${date}:${duelKey}:${right ? "r" : "f"}`) >>> 0;
  return list[h % list.length];
}

export function scoreComment(score: number): string {
  return SCORE_COMMENTS[
    Math.max(0, Math.min(SCORE_COMMENTS.length - 1, score))
  ];
}
