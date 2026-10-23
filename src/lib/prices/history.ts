// Prishistorik per elområde för /elpris-historik, ur vyerna spot_prices_monthly
// och spot_prices_daily (supabase/sql/). Samma definitioner som
// scripts/analysis/history-stats.ts:
//
// - Snitt är tidsviktade: Σ ore_minutes / Σ minutes (timrad 60 min, kvartsrad
//   15 min), spotpris öre/kWh exkl. moms. År, säsonger och andel negativ tid
//   räknas ur summorna, inte som medel av månadssnitt.
// - Bara fullständiga svenska kalenderdygn räknas, och bara dygn före i dag
//   (vyerna innehåller även dagens och morgondagens dygn).
// - Avslutade månader läses ur spot_prices_monthly; innevarande månad räknas
//   ur spot_prices_daily (dygn från den första i månaden till och med i går).
//
// Kastar vid läsfel: hellre ett misslyckat bygge (eller kvar den gamla sidan
// vid omvalidering) än en sida utan siffror.

import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabasePaging";
import { addDays } from "@/lib/dates";
import { stockholmISODate } from "@/lib/time";

export const HISTORY_AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type HistoryArea = (typeof HISTORY_AREAS)[number];

/** Data från och med detta dygn (första dygnet i spot_prices). */
export const HISTORY_FROM = "2021-11-01";

type PerArea<T> = Record<HistoryArea, T>;

interface Sums {
  oreMinutes: number;
  minutes: number;
  negMinutes: number;
}

export interface HistoryMonth {
  /** "YYYY-MM" */
  month: string;
  /** Innevarande månad (snitt hittills). */
  partial: boolean;
  /** Tidsviktat månadssnitt per område, öre/kWh; null om området saknar data. */
  avg: PerArea<number | null>;
}

export interface HistoryYear {
  year: number;
  /** Innevarande år (till och med i går). */
  partial: boolean;
  avg: PerArea<number>;
  /** Andel tid med negativt spotpris, procent. */
  negativeShare: PerArea<number>;
}

export interface HistorySeason {
  kind: "winter" | "summer";
  /** Vintern 2023/24 och sommaren 2024 har year = 2024. */
  year: number;
  avg: PerArea<number>;
}

export interface MonthRecord {
  month: string;
  avg: number;
}

export interface DayRecord {
  date: string;
  avg: number;
}

export interface PriceHistory {
  /** I går (svenskt datum) – sista dygnet som räknas. */
  latest: string;
  months: HistoryMonth[];
  years: HistoryYear[];
  /** Bara hela säsonger, i tidsordning (vinter 2021/22, sommar 2022, …). */
  seasons: HistorySeason[];
  records: PerArea<{
    maxMonth: MonthRecord;
    minMonth: MonthRecord;
    maxDay: DayRecord;
    minDay: DayRecord;
  }>;
  /** Dygnssnittet per område det dygn då något område hade sitt lägsta dygn – för "i hela landet". */
  cheapestDayAllAreas: { date: string; avg: PerArea<number | null> };
}

// ─── Läsning ──────────────────────────────────────────────────────────────────

interface MonthlyRow {
  area: HistoryArea;
  month: string; // "YYYY-MM-01"
  ore_minutes: number | string;
  minutes: number;
  neg_minutes: number;
}

interface DailyRow {
  area: HistoryArea;
  delivery_date: string;
  ore_minutes: number | string;
  minutes: number;
  neg_minutes: number;
  avg_ore_per_kwh: number | string;
}

const num = (v: number | string) => (typeof v === "number" ? v : Number(v));

async function dayRecord(area: HistoryArea, today: string, ascending: boolean): Promise<DayRecord> {
  const { data, error } = await supabase
    .from("spot_prices_daily")
    .select("delivery_date, avg_ore_per_kwh")
    .eq("area", area)
    .eq("complete", true)
    .lt("delivery_date", today)
    .order("avg_ore_per_kwh", { ascending })
    .order("delivery_date", { ascending: true })
    .limit(1);
  if (error) throw new Error(`spot_prices_daily (${area}): ${error.message}`);
  if (!data?.[0]) throw new Error(`spot_prices_daily (${area}): inga dygn`);
  return { date: data[0].delivery_date, avg: num(data[0].avg_ore_per_kwh) };
}

async function readHistory(today: string) {
  const monthStart = `${today.slice(0, 7)}-01`;

  const [monthly, currentDays, extremes] = await Promise.all([
    fetchAllPages<MonthlyRow>((a, b) =>
      supabase
        .from("spot_prices_monthly")
        .select("area, month, ore_minutes, minutes, neg_minutes")
        .lt("month", monthStart)
        .order("area")
        .order("month")
        .range(a, b),
    ),
    fetchAllPages<DailyRow>((a, b) =>
      supabase
        .from("spot_prices_daily")
        .select("area, delivery_date, ore_minutes, minutes, neg_minutes, avg_ore_per_kwh")
        .eq("complete", true)
        .gte("delivery_date", monthStart)
        .lt("delivery_date", today)
        .order("area")
        .order("delivery_date")
        .range(a, b),
    ),
    Promise.all(
      HISTORY_AREAS.map(async (area) => ({
        area,
        max: await dayRecord(area, today, false),
        min: await dayRecord(area, today, true),
      })),
    ),
  ]);

  // Alla områdens dygnssnitt det dygn som är billigast (i något område).
  const cheapestDate = extremes.reduce((m, e) => (e.min.avg < m.avg ? e.min : m), extremes[0].min).date;
  const { data: dayRows, error } = await supabase
    .from("spot_prices_daily")
    .select("area, avg_ore_per_kwh, complete")
    .eq("delivery_date", cheapestDate);
  if (error) throw new Error(`spot_prices_daily (${cheapestDate}): ${error.message}`);

  return { monthly, currentDays, extremes, cheapestDate, dayRows: dayRows ?? [] };
}

// ─── Beräkning ────────────────────────────────────────────────────────────────

const emptySums = (): Sums => ({ oreMinutes: 0, minutes: 0, negMinutes: 0 });
const perArea = <T>(f: (a: HistoryArea) => T) =>
  Object.fromEntries(HISTORY_AREAS.map((a) => [a, f(a)])) as PerArea<T>;
const avgOf = (s: Sums) => s.oreMinutes / s.minutes;

function add(target: Sums, s: Sums) {
  target.oreMinutes += s.oreMinutes;
  target.minutes += s.minutes;
  target.negMinutes += s.negMinutes;
}

export async function loadHistory(): Promise<PriceHistory> {
  const today = stockholmISODate();
  const latest = addDays(today, -1);
  const currentMonth = today.slice(0, 7);
  const { monthly, currentDays, extremes, cheapestDate, dayRows } = await readHistory(today);

  // område → månad → summor
  const byMonth = perArea(() => new Map<string, Sums>());
  for (const r of monthly) {
    byMonth[r.area].set(r.month.slice(0, 7), {
      oreMinutes: num(r.ore_minutes),
      minutes: r.minutes,
      negMinutes: r.neg_minutes,
    });
  }
  for (const r of currentDays) {
    const m = byMonth[r.area];
    if (!m.has(currentMonth)) m.set(currentMonth, emptySums());
    add(m.get(currentMonth)!, { oreMinutes: num(r.ore_minutes), minutes: r.minutes, negMinutes: r.neg_minutes });
  }

  const monthKeys = Array.from(
    new Set(HISTORY_AREAS.flatMap((a) => Array.from(byMonth[a].keys()))),
  ).sort();
  if (monthKeys.length === 0) throw new Error("Ingen prishistorik i spot_prices_monthly");

  const months: HistoryMonth[] = monthKeys.map((month) => ({
    month,
    partial: month === currentMonth,
    avg: perArea((a) => {
      const s = byMonth[a].get(month);
      return s ? avgOf(s) : null;
    }),
  }));

  // År (från 2022 – 2021 har bara november–december).
  const yearKeys = Array.from(new Set(monthKeys.map((m) => Number(m.slice(0, 4))))).filter((y) => y >= 2022);
  const years: HistoryYear[] = yearKeys.map((year) => {
    const sums = perArea((a) => {
      const s = emptySums();
      byMonth[a].forEach((v, m) => {
        if (m.startsWith(`${year}-`)) add(s, v);
      });
      return s;
    });
    return {
      year,
      partial: year === Number(today.slice(0, 4)),
      avg: perArea((a) => avgOf(sums[a])),
      negativeShare: perArea((a) => (100 * sums[a].negMinutes) / sums[a].minutes),
    };
  });

  // Säsonger: bara när alla tre månaderna är avslutade och finns i alla områden.
  const seasonAvg = (ms: string[]) => {
    const complete = ms.every((m) => m < currentMonth && HISTORY_AREAS.every((a) => byMonth[a].has(m)));
    if (!complete) return null;
    return perArea((a) => {
      const s = emptySums();
      for (const m of ms) add(s, byMonth[a].get(m)!);
      return avgOf(s);
    });
  };
  const seasons: HistorySeason[] = [];
  for (let y = Number(monthKeys[0].slice(0, 4)) + 1; y <= Number(today.slice(0, 4)); y++) {
    const winter = seasonAvg([`${y - 1}-12`, `${y}-01`, `${y}-02`]);
    if (winter) seasons.push({ kind: "winter", year: y, avg: winter });
    const summer = seasonAvg([`${y}-06`, `${y}-07`, `${y}-08`]);
    if (summer) seasons.push({ kind: "summer", year: y, avg: summer });
  }

  // Rekord: månader bara avslutade kalendermånader; dygn ur vyn.
  const records = perArea((a) => {
    const done = months.filter((m) => !m.partial && m.avg[a] !== null).map((m) => ({ month: m.month, avg: m.avg[a]! }));
    const maxMonth = done.reduce((x, m) => (m.avg > x.avg ? m : x), done[0]);
    const minMonth = done.reduce((x, m) => (m.avg < x.avg ? m : x), done[0]);
    const e = extremes.find((x) => x.area === a)!;
    return { maxMonth, minMonth, maxDay: e.max, minDay: e.min };
  });

  const cheapestDayAllAreas = {
    date: cheapestDate,
    avg: perArea((a) => {
      const r = dayRows.find((x) => x.area === a && x.complete);
      return r ? num(r.avg_ore_per_kwh) : null;
    }),
  };

  return { latest, months, years, seasons, records, cheapestDayAllAreas };
}
