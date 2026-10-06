import type { Area } from "./prices";

export type DuelType =
  | "samma-aktivitet-olika-tid"
  | "samma-aktivitet-olika-stad"
  | "olika-aktivitet"
  | "allt-olika";

export type Pick = "A" | "B";

export type EmergencyLevel =
  "utanför-pool" | "alla-städer" | "lägre-gräns" | "återanvändning";

export interface Option {
  activityId: string;
  label: string;
  emoji: string;
  citySlug: string;
  cityName: string;
  area: Area;
  /** Starttimme (lokal tid) för 'tidpunkt'; null för 'dygnssnitt'. */
  hour: number | null;
  kWh: number;
  assumption: string;
  /** Spotpris som använts, öre/kWh exkl. moms (snitt över fönstret). */
  spotOre: number;
  /** Energiskatt som använts, öre/kWh exkl. moms. */
  taxOre: number;
  reducedEnergyTax: boolean;
  krPerKwh: number;
  costKr: number;
  /** "10 kWh × 1,12 kr/kWh ≈ 11,20 kr" */
  breakdown: string;
  /** "räknat på dagens snittpris" för dygnssnitt, annars null. */
  priceNote: string | null;
}

export interface Duel {
  type: DuelType;
  /** Den typ som först provades, om generatorn fick byta (för granskning). */
  requestedType: DuelType;
  /** En stad i duellen förekommer också i en tidigare duell samma dag. */
  reusesCity: boolean;
  /** Bara bonusduellen: aktiviteten förekommer också i dagens huvuddueller. */
  reusesActivity: boolean;
  /**
   * Nödreserv som behövdes för att dagen ska få 5 dueller, annars null:
   * "utanför-pool" = aktivitet lånad utanför dagens pool (kan bryta fönstret),
   * "alla-städer" = dessutom städer utanför dagens stadspool,
   * "lägre-gräns" = dessutom sänkta beloppsgränser,
   * "återanvändning" = dessutom en aktivitet som redan finns i dagens pussel.
   */
  emergency: EmergencyLevel | null;
  a: Option;
  b: Option;
  answer: Pick;
  /** dyrare / billigare */
  ratio: number;
  link: { href: string; text: string };
}

export interface Puzzle {
  /** Svenskt datum YYYY-MM-DD som pusslet gäller. */
  date: string;
  /** Pusselnummer (#1 = lanseringsdagen), null före lansering. */
  number: number | null;
  duels: Duel[];
  /** Bonusduell om morgondagen, räknas inte i poängen. */
  bonus: Duel | null;
}
