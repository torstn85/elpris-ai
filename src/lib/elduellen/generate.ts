// Generator för dagens dueller. Ren funktion: samma datum + samma priser ger
// samma pussel, på server och i skript. Ingen lagrad state behövs — variationen
// mellan dagar härleds ur datumet.

import { CITIES, type City } from "@/lib/cities";
import { ACTIVITIES, type Activity } from "./activities";
import {
  DAILY_AVERAGE_NOTE,
  costAtTime,
  costDailyAverage,
  validStartHours,
  type CostResult,
} from "./cost";
import {
  DUELS_PER_DAY,
  EXCLUDED_ACTIVITY_IDS,
  LAUNCH_DATE,
  MAX_ATTEMPTS,
  MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY,
  MAX_RATIO,
  MIN_DIFF_KR,
  MIN_EXPENSIVE_KR,
  MIN_RATIO,
  EMERGENCY_MIN_DIFF_KR,
  EMERGENCY_MIN_EXPENSIVE_KR,
  ACTIVITY_REPEAT_WINDOW_DAYS,
} from "./config";
import { linkForDuel } from "./links";
import type { Area, DayPrices, Quarter } from "./prices";
import { createRng, shuffle, type Rng } from "./rng";
import type { Duel, DuelType, EmergencyLevel, Option, Puzzle } from "./types";

/** Duelltyp per position 1–5 (index 0–4). */
export const DUEL_ORDER: DuelType[] = [
  "samma-aktivitet-olika-tid",
  "samma-aktivitet-olika-stad",
  "olika-aktivitet",
  "olika-aktivitet",
  "allt-olika",
];

const FALLBACK_ORDER: DuelType[] = [
  "allt-olika",
  "olika-aktivitet",
  "samma-aktivitet-olika-stad",
  "samma-aktivitet-olika-tid",
];

/**
 * Dagens pooler. Aktiviteter: ACTIVITIES_PER_DAY ur biblioteket, och ingen
 * aktivitet får återkomma inom ACTIVITY_REPEAT_WINDOW_DAYS dagar — därför måste
 * ACTIVITIES_PER_DAY × fönstret rymmas i v1-biblioteket (13 × 4 = 52 ≤ 53).
 * Städer: ett antal per elområde, så att duell 2 alltid har olika områden att
 * välja på; en stad återkommer inte två dagar i rad.
 */
const ACTIVITIES_PER_DAY = 13;
const CITY_REPEAT_WINDOW_DAYS = 2;
const CITIES_PER_AREA_PER_DAY: Record<Area, number> = {
  SE1: 1,
  SE2: 1,
  SE3: 3,
  SE4: 2,
};
const EPOCH = "2026-01-01";
/** Antal seed-varianter av en hel dag som provas för att undvika typbyten/luckor. */
const DAY_VARIANTS = 20;

// ─── Datum ────────────────────────────────────────────────────────────────────

export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function puzzleNumber(date: string): number | null {
  return LAUNCH_DATE ? daysBetween(LAUNCH_DATE, date) + 1 : null;
}

// ─── Urval ────────────────────────────────────────────────────────────────────

/** Alla aktiviteter som används i v1, oavsett säsong. Fast underlag för rotationen. */
export const V1_ACTIVITIES: Activity[] = ACTIVITIES.filter(
  (a) => a.confidence !== "låg" && !EXCLUDED_ACTIVITY_IDS.has(a.id),
);

export function inSeason(activity: Activity, date: string): boolean {
  const month = Number(date.slice(5, 7));
  return !activity.months || activity.months.includes(month);
}

/**
 * Roterande dagspool: en seedad kortlek per "varv" som dagarna läser ur i följd
 * (`perDay` kort per dag). Poolerna från de senaste `windowDays - 1` dagarna
 * tas alltid bort och ersätts med nästa kort, så samma aktivitet/stad aldrig
 * förekommer två gånger inom fönstret — även när ett varv tar slut och nästa
 * kortlek blandas. Ren funktion av datumet.
 *
 * Returnerar dagens pool och nycklarna som är spärrade av de föregående dagarna.
 */
function rotatingPool<T>(
  items: T[],
  key: (t: T) => string,
  perDay: number,
  windowDays: number,
  dayIndex: number,
  salt: string,
): { pool: T[]; blocked: Set<string> } {
  const n = items.length;
  if (n === 0) return { pool: [], blocked: new Set() };
  const sorted = [...items].sort((a, b) => key(a).localeCompare(key(b)));
  const decks = new Map<number, T[]>();
  const deck = (lap: number) => {
    if (!decks.has(lap))
      decks.set(lap, shuffle(createRng(`${salt}:lap:${lap}`), sorted));
    return decks.get(lap)!;
  };

  const take = (day: number, exclude: Set<string>): T[] => {
    const out: T[] = [];
    const seen = new Set<string>();
    let pos = day * perDay;
    // Läs högst två varv framåt — räcker för att fylla poolen efter uteslutningar.
    for (
      let guard = 0;
      out.length < perDay && guard < 2 * n + perDay;
      guard++, pos++
    ) {
      const item = deck(Math.floor(pos / n))[pos % n];
      const k = key(item);
      if (exclude.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(item);
    }
    return out;
  };

  // Gå fram från startdagen så att de föregående dagarnas pooler är exakt de som
  // faktiskt användes (de kan själva ha påverkats av sina föregångare).
  const recent: T[][] = [];
  let blocked = new Set<string>();
  let pool: T[] = [];
  for (let d = 0; d <= dayIndex; d++) {
    blocked = new Set(recent.flat().map(key));
    pool = take(d, blocked);
    recent.push(pool);
    if (recent.length > windowDays - 1) recent.shift();
  }
  return { pool, blocked };
}

function pickFrom<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

// ─── Alternativ och dueller ───────────────────────────────────────────────────

interface Ctx {
  date: string;
  prices: DayPrices;
  activities: Activity[];
  cities: City[];
  usedActivities: Set<string>;
  usedCities: Set<string>;
  /** Antal dygnssnitt-aktiviteter som redan används i dagens pussel. */
  dailyAverageCount: { value: number };
}

function quarters(ctx: Ctx, city: City): Quarter[] {
  return ctx.prices[city.area];
}

function makeOption(
  ctx: Ctx,
  activity: Activity,
  city: City,
  hour: number | null,
): Option | null {
  const reduced = city.reducedEnergyTax === true;
  const q = quarters(ctx, city);
  const cost: CostResult | null =
    activity.priceMode === "dygnssnitt"
      ? costDailyAverage(activity, q, reduced)
      : costAtTime(activity, q, hour!, reduced);
  if (!cost) return null;
  return {
    activityId: activity.id,
    label: activity.label,
    emoji: activity.emoji,
    citySlug: city.slug,
    cityName: city.name,
    area: city.area,
    hour: activity.priceMode === "dygnssnitt" ? null : hour,
    kWh: activity.kWh,
    assumption: activity.assumption,
    spotOre: cost.spotOre,
    taxOre: cost.taxOre,
    reducedEnergyTax: reduced,
    krPerKwh: cost.krPerKwh,
    costKr: cost.costKr,
    breakdown: cost.breakdown,
    priceNote: activity.priceMode === "dygnssnitt" ? DAILY_AVERAGE_NOTE : null,
  };
}

function isValidPair(a: Option, b: Option, relaxed = false): boolean {
  if (a.costKr <= 0 || b.costKr <= 0) return false;
  const hi = Math.max(a.costKr, b.costKr);
  const lo = Math.min(a.costKr, b.costKr);
  const ratio = hi / lo;
  return (
    ratio >= MIN_RATIO &&
    ratio <= MAX_RATIO &&
    hi >= (relaxed ? EMERGENCY_MIN_EXPENSIVE_KR : MIN_EXPENSIVE_KR) &&
    hi - lo >= (relaxed ? EMERGENCY_MIN_DIFF_KR : MIN_DIFF_KR)
  );
}

/** Föredra det som inte redan används i dagens pussel. */
function fresh<T>(items: T[], used: Set<string>, key: (t: T) => string): T[] {
  const unused = items.filter((i) => !used.has(key(i)));
  return unused.length > 0 ? unused : items;
}

interface Reuse {
  activities: boolean;
  cities: boolean;
}

/** Huvuddueller: aldrig samma aktivitet två gånger samma dag; städer får upprepas. */
const MAIN_STAGES: Reuse[] = [
  { activities: false, cities: false },
  { activities: false, cities: true },
];

/** Bonusduellen (om morgondagen, räknas inte) får som sista utväg återanvända aktiviteter. */
const BONUS_STAGES: Reuse[] = [
  ...MAIN_STAGES,
  { activities: true, cities: true },
];

function candidate(
  ctx: Ctx,
  rng: Rng,
  type: DuelType,
  reuse: Reuse,
): [Option, Option] | null {
  // Högst MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY dygnssnitt-aktiviteter per dag.
  const avgLeft =
    MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY - ctx.dailyAverageCount.value;
  const allowedActs = ctx.activities.filter(
    (a) => avgLeft > 0 || a.priceMode !== "dygnssnitt",
  );
  // En aktivitet förekommer bara i en duell per dag (strikt). Städer får
  // upprepas, men oanvända föredras först.
  const acts = reuse.activities
    ? allowedActs
    : allowedActs.filter((a) => !ctx.usedActivities.has(a.id));
  if (acts.length === 0) return null;
  const cities = reuse.cities
    ? ctx.cities
    : fresh(ctx.cities, ctx.usedCities, (c) => c.slug);

  switch (type) {
    case "samma-aktivitet-olika-tid": {
      const city = pickFrom(rng, cities);
      const pool = acts.filter(
        (a) => validStartHours(a, quarters(ctx, city)).length >= 2,
      );
      if (pool.length === 0) return null;
      const act = pickFrom(rng, pool);
      const hours = shuffle(rng, validStartHours(act, quarters(ctx, city)));
      const a = makeOption(ctx, act, city, hours[0]);
      const b = makeOption(ctx, act, city, hours[1]);
      return a && b ? [a, b] : null;
    }
    case "samma-aktivitet-olika-stad": {
      const act = pickFrom(rng, acts);
      const cityA = pickFrom(rng, cities);
      const others = cities.filter((c) => c.slug !== cityA.slug);
      if (others.length === 0) return null;
      const otherArea = others.filter((c) => c.area !== cityA.area);
      const cityB = pickFrom(
        rng,
        otherArea.length > 0 && rng() < 0.8 ? otherArea : others,
      );
      let hour: number | null = null;
      if (act.priceMode === "tidpunkt") {
        const common = validStartHours(act, quarters(ctx, cityA)).filter((h) =>
          validStartHours(act, quarters(ctx, cityB)).includes(h),
        );
        if (common.length === 0) return null;
        hour = common[Math.floor(rng() * common.length)];
      }
      const a = makeOption(ctx, act, cityA, hour);
      const b = makeOption(ctx, act, cityB, hour);
      return a && b ? [a, b] : null;
    }
    case "olika-aktivitet": {
      const city = pickFrom(rng, cities);
      const modeOk = acts.filter(
        (a) => a.priceMode === "tidpunkt" || avgLeft >= 2,
      );
      if (modeOk.length < 2) return null;
      const actA = pickFrom(rng, modeOk);
      const sameMode = modeOk.filter(
        (a) => a.id !== actA.id && a.priceMode === actA.priceMode,
      );
      if (sameMode.length === 0) return null;
      const actB = pickFrom(rng, sameMode);
      let hour: number | null = null;
      if (actA.priceMode === "tidpunkt") {
        const common = validStartHours(actA, quarters(ctx, city)).filter((h) =>
          validStartHours(actB, quarters(ctx, city)).includes(h),
        );
        if (common.length === 0) return null;
        hour = common[Math.floor(rng() * common.length)];
      }
      const a = makeOption(ctx, actA, city, hour);
      const b = makeOption(ctx, actB, city, hour);
      return a && b ? [a, b] : null;
    }
    case "allt-olika": {
      const actA = pickFrom(rng, acts);
      const restB = acts.filter(
        (a) =>
          a.id !== actA.id &&
          (a.priceMode === "tidpunkt" ||
            avgLeft - (actA.priceMode === "dygnssnitt" ? 1 : 0) > 0),
      );
      if (restB.length === 0) return null;
      const actB = pickFrom(rng, restB);
      const cityA = pickFrom(rng, cities);
      const otherCities = cities.filter((c) => c.slug !== cityA.slug);
      if (otherCities.length === 0) return null;
      const cityB = pickFrom(rng, otherCities);
      const hourFor = (act: Activity, city: City): number | null => {
        if (act.priceMode === "dygnssnitt") return null;
        const hs = validStartHours(act, quarters(ctx, city));
        return hs.length > 0 ? hs[Math.floor(rng() * hs.length)] : -1;
      };
      const hA = hourFor(actA, cityA);
      const hB = hourFor(actB, cityB);
      if (hA === -1 || hB === -1) return null;
      const a = makeOption(ctx, actA, cityA, hA);
      const b = makeOption(ctx, actB, cityB, hB);
      return a && b ? [a, b] : null;
    }
  }
}

function buildDuel(
  ctx: Ctx,
  seed: string,
  requested: DuelType,
  isBonus: boolean,
  emergency: EmergencyLevel | null = null,
): Duel | null {
  const types = [requested, ...FALLBACK_ORDER.filter((t) => t !== requested)];
  // Generatorn lämnar aldrig dagens pooler — annars kan en aktivitet "lånas"
  // från en dag inom fönstret och bryta 5-dagarsregeln. Per duelltyp: först med
  // städer som inte redan används i dagens pussel, sedan får städer upprepas.
  // Typen byts först när inget av det ger ett giltigt par.
  const stages =
    isBonus || emergency === "återanvändning" ? BONUS_STAGES : MAIN_STAGES;
  const relaxed = emergency === "lägre-gräns" || emergency === "återanvändning";
  for (const type of types) {
    for (let stage = 0; stage < stages.length; stage++) {
      const reuse = stages[stage];
      const rng = createRng(`${seed}:${stage}:${type}`);
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const pair = candidate(ctx, rng, type, reuse);
        if (!pair || !isValidPair(pair[0], pair[1], relaxed)) continue;
        const [a, b] = rng() < 0.5 ? pair : [pair[1], pair[0]];
        const usedCitiesBefore = new Set(ctx.usedCities);
        const avgIds = new Set<string>();
        for (const o of [a, b]) {
          ctx.usedActivities.add(o.activityId);
          ctx.usedCities.add(o.citySlug);
          if (o.hour === null) avgIds.add(o.activityId);
        }
        ctx.dailyAverageCount.value += avgIds.size;
        return {
          type,
          requestedType: requested,
          reusesCity:
            reuse.cities && pair.some((o) => usedCitiesBefore.has(o.citySlug)),
          reusesActivity: reuse.activities,
          emergency,
          a,
          b,
          answer: a.costKr > b.costKr ? "A" : "B",
          ratio: Math.max(a.costKr, b.costKr) / Math.min(a.costKr, b.costKr),
          link: linkForDuel(createRng(`${seed}:link`), type, a, b, isBonus),
        };
      }
    }
  }
  return null;
}

export interface GenerateInput {
  /** Svenskt datum YYYY-MM-DD. */
  date: string;
  today: DayPrices;
  /** Morgondagens priser om de är publicerade (ger bonusduell). */
  tomorrow?: DayPrices | null;
}

export function generatePuzzle({
  date,
  today,
  tomorrow,
}: GenerateInput): Puzzle {
  const dayIndex = daysBetween(EPOCH, date);
  const allCities = Object.values(CITIES);

  // Rotationen går över ett fast underlag (alla v1-aktiviteter) så att fönstret
  // gäller även över månadsskiften när säsongsfiltret ändras. Säsongen filtreras
  // först på dagens pool.
  const actPool = rotatingPool(
    V1_ACTIVITIES,
    (a) => a.id,
    ACTIVITIES_PER_DAY,
    ACTIVITY_REPEAT_WINDOW_DAYS,
    dayIndex,
    "act",
  );
  const activities = actPool.pool.filter((a) => inSeason(a, date));
  const cityPools = (Object.keys(CITIES_PER_AREA_PER_DAY) as Area[]).map(
    (area) =>
      rotatingPool(
        allCities.filter((c) => c.area === area),
        (c) => c.slug,
        CITIES_PER_AREA_PER_DAY[area],
        CITY_REPEAT_WINDOW_DAYS,
        dayIndex,
        `city:${area}`,
      ),
  );
  const cities = cityPools.flatMap((p) => p.pool);

  const freshCtx = (): Ctx => ({
    date,
    prices: today,
    activities,
    cities,
    usedActivities: new Set(),
    usedCities: new Set(),
    dailyAverageCount: { value: 0 },
  });

  // Dueller väljs girigt i tur och ordning, så tidiga dueller kan förbruka de
  // aktiviteter som senare dueller hade behövt. Prova därför hela dagen med upp
  // till DAY_VARIANTS seed-varianter och välj den första felfria (5 dueller utan
  // typbyte), annars den med minst brister. Deterministiskt ur datumet.
  let best: { slots: (Duel | null)[]; ctx: Ctx; score: number } | null = null;
  for (let variant = 0; variant < DAY_VARIANTS; variant++) {
    const ctx = freshCtx();
    const slots: (Duel | null)[] = [];
    for (let i = 0; i < DUELS_PER_DAY; i++) {
      const seed =
        variant === 0
          ? `elduellen:${date}:${i}`
          : `elduellen:${date}:v${variant}:${i}`;
      slots.push(buildDuel(ctx, seed, DUEL_ORDER[i], false));
    }
    const missing = slots.filter((d) => d === null).length;
    const swaps = slots.filter((d) => d && d.type !== d.requestedType).length;
    const score = missing * 100 + swaps;
    if (!best || score < best.score) best = { slots, ctx, score };
    if (score === 0) break;
  }
  const { slots, ctx } = best!;

  // Nödreserv: en dag får aldrig färre än DUELS_PER_DAY dueller. Fyll tomma
  // platser stegvis — varje steg släpper på fler regler — och märk duellen.
  const inSeasonV1 = V1_ACTIVITIES.filter((a) => inSeason(a, date));
  const emergencyCtx = (level: EmergencyLevel): Ctx => ({
    ...ctx,
    activities: inSeasonV1,
    cities: level === "utanför-pool" ? cities : allCities,
  });
  const levels: EmergencyLevel[] = [
    "utanför-pool",
    "alla-städer",
    "lägre-gräns",
    "återanvändning",
  ];
  for (let i = 0; i < DUELS_PER_DAY; i++) {
    for (const level of levels) {
      if (slots[i]) break;
      slots[i] = buildDuel(
        emergencyCtx(level),
        `elduellen:${date}:nod:${level}:${i}`,
        DUEL_ORDER[i],
        false,
        level,
      );
    }
  }
  const duels = slots.filter((d): d is Duel => d !== null);

  let bonus: Duel | null = null;
  if (tomorrow) {
    const bonusCtx: Ctx = { ...ctx, date: addDays(date, 1), prices: tomorrow };
    bonus = buildDuel(
      bonusCtx,
      `elduellen:${date}:bonus`,
      "samma-aktivitet-olika-tid",
      true,
    );
  }

  return { date, number: puzzleNumber(date), duels, bonus };
}
