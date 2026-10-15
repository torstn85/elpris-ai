// Gemensamma typer och texter för elområdessidorna (/elomrade och /elomrade/seX).
// Texterna kommer från innehållsfilen "Elområdessidorna – nytt innehåll och
// struktur" och ska stå ordagrant. Hårt mellanslag ( ) före % och mellan
// tal och öre/kWh.

import type { Area } from "@/lib/prices/today";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ElomradeContent {
  /** "1"–"4" — elområde {N}. */
  number: 1 | 2 | 3 | 4;
  area: Area;
  /** Regionnamn med versal, t.ex. "Norra Mellansverige". */
  region: string;
  /** Regionnamn mitt i en mening, t.ex. "norra Mellansverige". */
  regionInSentence: string;
  /** Stad i områdesväljaren: "Elområde 1 · Luleå". */
  selectorCity: string;
  h1: string;
  /** Stycken under H2 "Om elområde {N} ({SEx})". */
  about: string[];
  faq: FaqItem[];
}

/** "Elområde 1 (SE1)" / "elområde 1 (SE1)". */
export const areaLabel = (c: Pick<ElomradeContent, "number" | "area">, capital = true) =>
  `${capital ? "Elområde" : "elområde"} ${c.number} (${c.area})`;

/** Under stadskorten och under "Vilket elområde bor jag i?" på översikten. */
export const BORDER_NOTE =
  "Elområdena följer inte kommun- eller länsgränser. Bor du nära en gräns kan ditt nätbolag eller din elhandlare tala om vilket elområde din anläggning tillhör.";

/** Liten text under kartan. */
export const MAP_NOTE = "Kartan är förenklad. Elområdenas gränser följer inte länsgränserna.";
