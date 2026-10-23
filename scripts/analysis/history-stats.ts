// Prishistorik per elområde ur spot_prices – alla upplösningar (timpriser före
// 1 oktober 2025, kvartspriser därefter). Underlag för /elpris-historik.
//
// Snitt är tidsviktade: en timrad väger 60 min, en kvartsrad 15 min
// (spotpris, öre/kWh exkl. moms). Bara fullständiga svenska kalenderdygn räknas
// (periodernas minuter = dygnets längd, 23/24/25 h); dygn som saknas eller är
// ofullständiga hoppas över och redovisas per månad.
//
// Användning:
//   npx tsx scripts/analysis/history-stats.ts [från-datum]   (standard 2021-11-01, till och med i går)

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fetchAllPages } from "../../src/lib/supabasePaging";
import { stockholmDayUTCRange, stockholmISODate } from "../../src/lib/time";
import { addDays } from "../../src/lib/dates";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(raw);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

interface Row {
  id: number;
  delivery_period_start: string;
  resolution_minutes: number;
  ore_per_kwh: number;
}

/** Ett fullständigt dygn: tidsviktad summa och minuter, negativa minuter. */
interface Day {
  date: string;
  sum: number; // Σ öre × minuter
  minutes: number;
  negMinutes: number;
  periods: number;
  negPeriods: number;
}

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const MIN = 60_000;
const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(1).replace(".", ",").replace("-", "−") : "–");
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
const col = (s: string, w = 8) => s.padStart(w);

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (days: Day[]) => days.reduce((s, d) => s + d.sum, 0) / days.reduce((s, d) => s + d.minutes, 0);

function dayLengthMinutes(date: string): number {
  return (Date.parse(stockholmDayUTCRange(addDays(date, 1)).from) - Date.parse(stockholmDayUTCRange(date).from)) / MIN;
}

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const fromDate = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "2021-11-01";
  const toDate = addDays(stockholmISODate(), -1);
  const allDates: string[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) allDates.push(d);

  // Alla rader, ett område i taget (alla fyra parallellt), paginerat.
  const rowsByArea = new Map<Area, Row[]>();
  await Promise.all(
    AREAS.map(async (area) => {
      const rows = await fetchAllPages<Row>((a, b) =>
        supabase
          .from("spot_prices")
          .select("id, delivery_period_start, resolution_minutes, ore_per_kwh")
          .eq("area", area)
          .gte("delivery_period_start", stockholmDayUTCRange(fromDate).from)
          .lte("delivery_period_start", stockholmDayUTCRange(toDate).to)
          .order("delivery_period_start")
          .order("id")
          .range(a, b),
      );
      rowsByArea.set(area, rows);
    }),
  );

  console.log(`Period: ${fromDate} – ${toDate} (svenska kalenderdygn, ${allDates.length} dygn)`);
  console.log(`Rader hämtade: ${AREAS.map((a) => `${a} ${rowsByArea.get(a)!.length}`).join(" · ")}`);
  console.log("Snitt är tidsviktade (timrad 60 min, kvartsrad 15 min), spotpris öre/kWh exkl. moms.\n");

  // område → fullständiga dygn; område → saknade/ofullständiga dygn
  const days = new Map<Area, Day[]>();
  const missing = new Map<Area, string[]>();
  for (const area of AREAS) {
    const byDate = new Map<string, Day>();
    for (const r of rowsByArea.get(area)!) {
      const date = SWEDISH_DATE.format(new Date(r.delivery_period_start));
      let d = byDate.get(date);
      if (!d) byDate.set(date, (d = { date, sum: 0, minutes: 0, negMinutes: 0, periods: 0, negPeriods: 0 }));
      d.sum += r.ore_per_kwh * r.resolution_minutes;
      d.minutes += r.resolution_minutes;
      d.periods++;
      if (r.ore_per_kwh < 0) {
        d.negMinutes += r.resolution_minutes;
        d.negPeriods++;
      }
    }
    const complete: Day[] = [];
    const miss: string[] = [];
    for (const date of allDates) {
      const d = byDate.get(date);
      if (d && d.minutes === dayLengthMinutes(date)) complete.push(d);
      else miss.push(d ? `${date} (${d.minutes / 60} h)` : date);
    }
    days.set(area, complete);
    missing.set(area, miss);
  }

  const months = Array.from(new Set(allDates.map((d) => d.slice(0, 7))));
  const daysInMonth = (m: string) => allDates.filter((d) => d.startsWith(m)).length;
  const calendarDays = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
  const inMonth = (area: Area, m: string) => days.get(area)!.filter((d) => d.date.startsWith(m));
  const lastMonth = months[months.length - 1];
  const partialLast = daysInMonth(lastMonth) < calendarDays(lastMonth);
  const firstMonth = months[0];
  const partialFirst = daysInMonth(firstMonth) < calendarDays(firstMonth);

  // ── 1. Månadssnitt ──
  console.log("═══ 1. Månadssnitt per område (tidsviktat medel, öre/kWh exkl. moms) ═══");
  console.log(`  Månad    ${AREAS.map((a) => col(a)).join("")}   Anmärkning`);
  for (const m of months) {
    const notes: string[] = [];
    if ((m === firstMonth && partialFirst) || (m === lastMonth && partialLast)) {
      notes.push(`ofullständig månad: ${daysInMonth(m)} av ${calendarDays(m)} dygn`);
    }
    for (const a of AREAS) {
      const miss = missing.get(a)!.filter((d) => d.startsWith(m));
      if (miss.length) notes.push(`${a} saknar ${miss.join(", ")}`);
    }
    console.log(`  ${m}  ${AREAS.map((a) => col(fmt(mean(inMonth(a, m))))).join("")}   ${notes.join("; ")}`);
  }

  // ── 2. Årssnitt ──
  const years = Array.from(new Set(allDates.map((d) => d.slice(0, 4)))).filter((y) => y >= "2022");
  console.log("\n═══ 2. Årssnitt per område (tidsviktat över året) ═══");
  console.log(`  År                  ${AREAS.map((a) => col(a)).join("")}   Dygn`);
  for (const y of years) {
    const label = y === toDate.slice(0, 4) ? `${y} t.o.m. ${toDate.slice(5)}` : y;
    const counts = AREAS.map((a) => days.get(a)!.filter((d) => d.date.startsWith(y)).length);
    console.log(`  ${label.padEnd(20)}${AREAS.map((a) => col(fmt(mean(days.get(a)!.filter((d) => d.date.startsWith(y)))))).join("")}   ${counts.join("/")}`);
  }

  // ── 3. Dyraste och billigaste månad och dygn ──
  const fullMonths = months.filter((m) => !(m === lastMonth && partialLast) && !(m === firstMonth && partialFirst));
  console.log("\n═══ 3. Dyraste och billigaste månad och dygn per område ═══");
  console.log(`  (månader: hela kalendermånader ${fullMonths[0]} – ${fullMonths[fullMonths.length - 1]}; dygn: tidsviktat dygnssnitt)`);
  for (const a of AREAS) {
    const ms = fullMonths.map((m) => ({ m, v: mean(inMonth(a, m)) })).sort((x, y) => x.v - y.v);
    const ds = days.get(a)!.map((d) => ({ date: d.date, v: d.sum / d.minutes })).sort((x, y) => x.v - y.v);
    console.log(
      `  ${a}  månad: dyrast ${ms[ms.length - 1].m} ${fmt(ms[ms.length - 1].v)} · billigast ${ms[0].m} ${fmt(ms[0].v)}` +
        `  |  dygn: dyrast ${ds[ds.length - 1].date} ${fmt(ds[ds.length - 1].v)} · billigast ${ds[0].date} ${fmt(ds[0].v)}`,
    );
  }

  // ── 4. Vinter mot sommar ──
  console.log("\n═══ 4. Vinter (dec–feb) mot sommar (jun–aug), tidsviktat medel ═══");
  const winterOf = (y: number) => [`${y - 1}-12`, `${y}-01`, `${y}-02`];
  const summerOf = (y: number) => [`${y}-06`, `${y}-07`, `${y}-08`];
  const seasonMean = (a: Area, ms: string[]) => {
    const ds = days.get(a)!.filter((d) => ms.includes(d.date.slice(0, 7)));
    const complete = ms.every((m) => months.includes(m) && !(m === lastMonth && partialLast));
    return { v: ds.length ? mean(ds) : NaN, complete };
  };
  console.log(`  Säsong                    ${AREAS.map((a) => col(a)).join("")}`);
  for (let y = 2022; y <= +toDate.slice(0, 4); y++) {
    for (const [label, ms] of [
      [`vinter ${y - 1}/${String(y).slice(2)} (dec–feb)`, winterOf(y)],
      [`sommar ${y} (jun–aug)`, summerOf(y)],
    ] as const) {
      const vals = AREAS.map((a) => seasonMean(a, [...ms]));
      if (vals.every((v) => !Number.isFinite(v.v))) continue;
      const note = vals.some((v) => !v.complete) ? "   (ofullständig)" : "";
      console.log(`  ${label.padEnd(26)}${vals.map((v) => col(fmt(v.v))).join("")}${note}`);
    }
  }
  console.log("  Kvot vinter/sommar samma år (vintern som börjar i december året innan):");
  for (let y = 2022; y <= +toDate.slice(0, 4); y++) {
    const r = AREAS.map((a) => seasonMean(a, winterOf(y)).v / seasonMean(a, summerOf(y)).v);
    if (r.some((v) => Number.isFinite(v))) console.log(`    ${y}: ${AREAS.map((a, i) => `${a} ${fmt(r[i])}×`).join("  ")}`);
  }

  // ── 5. Negativa priser ──
  console.log("\n═══ 5. Andel tid med negativt spotpris per område och år ═══");
  console.log("  (andel av tiden; före 2025-10-01 timmar, därefter kvartar – inom ett år med båda vägs de efter tid)");
  console.log(`  År                  ${AREAS.map((a) => col(a, 18)).join("")}`);
  for (const y of Array.from(new Set(allDates.map((d) => d.slice(0, 4))))) {
    const label = y === "2021" ? "2021 (nov–dec)" : y === toDate.slice(0, 4) ? `${y} t.o.m. ${toDate.slice(5)}` : y;
    const cells = AREAS.map((a) => {
      const ds = days.get(a)!.filter((d) => d.date.startsWith(y));
      const share = ds.reduce((s, d) => s + d.negMinutes, 0) / ds.reduce((s, d) => s + d.minutes, 0);
      const n = ds.reduce((s, d) => s + d.negPeriods, 0);
      return col(`${pct(share)} (${n})`, 18);
    });
    console.log(`  ${label.padEnd(20)}${cells.join("")}`);
  }
  console.log("  (antal negativa perioder inom parentes)");

  // ── 6. Kontroll mot daily-spread --monthly ──
  console.log("\n═══ 6. Kontroll april–oktober 2026: tidsviktat medel mot median av dygnssnitt ═══");
  console.log("  daily-spread --monthly räknar median av dygnssnitten från 2026-04-14. Här samma dygn:");
  console.log(`  Månad      ${AREAS.map((a) => col(`${a} medel`, 11) + col("median", 8)).join("  ")}`);
  for (const m of months.filter((x) => x >= "2026-04")) {
    const cells = AREAS.map((a) => {
      const ds = inMonth(a, m).filter((d) => d.date >= "2026-04-14");
      return col(fmt(mean(ds)), 11) + col(fmt(median(ds.map((d) => d.sum / d.minutes))), 8);
    });
    console.log(`  ${m}    ${cells.join("  ")}`);
  }
  console.log("  April med alla dygn (1–30, importerad data 1–13): " + AREAS.map((a) => `${a} ${fmt(mean(inMonth(a, "2026-04")))}`).join(" · "));

  // ── Saknade dygn ──
  console.log("\n═══ Saknade eller ofullständiga dygn (räknas inte) ═══");
  for (const a of AREAS) console.log(`  ${a}: ${missing.get(a)!.length ? missing.get(a)!.join(", ") : "inga"}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
