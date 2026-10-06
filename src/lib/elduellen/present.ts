// Hur en duell formuleras för spelaren. När båda alternativen har samma
// aktivitet lyfts det gemensamma till frågan och korten visar bara skillnaden:
//   samma aktivitet + samma stad  → "… i Göteborg — när kostar det mest?"  kort: "Kl 20" / "Kl 15"
//   samma aktivitet, olika städer → "… kl 18 — var kostar det mest?"       kort: "Östersund" / "Halmstad"
// Avgörs av innehållet (inte duelltypen), så det fungerar även efter typbyte.

import type { Duel, Option } from "./types";

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "kl 20" — men "vid midnatt" för 00. */
export function clockLabel(hour: number): string {
  return hour === 0 ? "vid midnatt" : `kl ${String(hour).padStart(2, "0")}`;
}

/** "kl 20 i Göteborg" / "vid midnatt i Göteborg" / "i Göteborg" (dygnssnitt). */
export function when(o: Option): string {
  return o.hour === null
    ? `i ${o.cityName}`
    : `${clockLabel(o.hour)} i ${o.cityName}`;
}

export type DuelShape = "olika-tid" | "olika-stad" | "fritt";

export function duelShape(d: Duel): DuelShape {
  if (d.a.activityId !== d.b.activityId) return "fritt";
  return d.a.citySlug === d.b.citySlug ? "olika-tid" : "olika-stad";
}

/** Rubriken ovanför korten. `lead` = det gemensamma (null när inget delas). */
export function duelQuestion(d: Duel): {
  lead: string | null;
  question: string;
} {
  const shape = duelShape(d);
  const label = capitalize(d.a.label);
  if (shape === "olika-tid") {
    return {
      lead: `${d.a.emoji} ${label} i ${d.a.cityName}`,
      question: "när kostar det mest?",
    };
  }
  if (shape === "olika-stad") {
    const time = d.a.hour === null ? "" : ` ${clockLabel(d.a.hour)}`;
    return {
      lead: `${d.a.emoji} ${label}${time}`,
      question: "var kostar det mest?",
    };
  }
  return { lead: null, question: "Vad kostar mest?" };
}

/** Vad ett kort visar: bara skillnaden när det gemensamma står i frågan. */
export function optionHeadline(
  d: Duel,
  o: Option,
): { emoji: string | null; main: string; sub: string | null } {
  const shape = duelShape(d);
  if (shape === "olika-tid")
    return {
      emoji: null,
      main: capitalize(clockLabel(o.hour ?? 0)),
      sub: null,
    };
  if (shape === "olika-stad")
    return { emoji: null, main: o.cityName, sub: o.area };
  return {
    emoji: o.emoji,
    main: capitalize(o.label),
    sub: capitalize(when(o)),
  };
}

/** Kort namn på ett alternativ i löptext: "Kl 20", "Halmstad" eller "A". */
export function optionShortName(d: Duel, o: Option, letter: "A" | "B"): string {
  const shape = duelShape(d);
  return shape === "fritt" ? letter : optionHeadline(d, o).main;
}

/** En rad i slutsammanställningen: vad som var dyrast. */
export function summaryLine(
  d: Duel,
  opts: { tomorrow?: boolean } = {},
): string {
  const pricier = d.answer === "A" ? d.a : d.b;
  const shape = duelShape(d);
  const label = capitalize(pricier.label) + (opts.tomorrow ? " imorgon" : "");
  if (shape === "olika-tid")
    return `${label} i ${pricier.cityName}: ${clockLabel(pricier.hour ?? 0)} var dyrast`;
  if (shape === "olika-stad") {
    const time = pricier.hour === null ? "" : ` ${clockLabel(pricier.hour)}`;
    return `${label}${time}: ${pricier.cityName} var dyrast`;
  }
  return `${label} ${when(pricier)} var dyrast`;
}

