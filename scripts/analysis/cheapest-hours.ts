// Billigaste och dyraste timmar och fönster per elområde ur vår egen data
// (spot_prices). Underlag för guiderna "När är det billigast att …".
//
// Timmar räknas som på sajten: kvartarna grupperas med quartersToHours, så
// dygn med 23/25 timmar (sommar-/normaltid) blir rätt. Ett fönster på N timmar
// är N timmar i följd; snittet är snittet av timmarnas snitt. Två varianter:
//   inom dygnet  – fönstret ryms helt i kalenderdygnet (slutar senast 24:00)
//   över midnatt – fönstret startar under dygnet men får fortsätta in i nästa
//                  dygns första timmar (dagens data hämtas som påfyllnad för
//                  sista dygnet, men analyseras inte själv)
// Vid lika pris vinner den tidigaste timmen/fönstret.
//
// Dygn som inte har 92, 96 eller 100 kvartar hoppas över.
//
// Användning:
//   npx tsx scripts/analysis/cheapest-hours.ts [från-datum]   (standard 2026-04-13, till och med i går)

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fetchAllPages } from "../../src/lib/supabasePaging";
import { stockholmDayUTCRange, stockholmISODate } from "../../src/lib/time";
import { addDays } from "../../src/lib/dates";
import { toQuarters } from "../../src/lib/prices/quarters";
import { quartersToHours, type HourEntry } from "../../src/lib/prices/hourly";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(raw);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];
const VALID_QUARTERS = new Set([92, 96, 100]);
const MONTH_NAMES = ["", "jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

interface Row {
  id: number;
  area: Area;
  delivery_period_start: string;
  ore_per_kwh: number;
}

interface Window {
  startHour: number;
  avg: number;
}

interface Day {
  date: string;
  month: number;
  weekday: number; // 0 = söndag … 6 = lördag
  avg: number;
  cheapestHour: number;
  dearestHour: number;
  cheap2: Window;
  dear2: Window;
  cheap3: Window;
  /** Över midnatt: får fortsätta in i nästa dygn. */
  cheap2x: Window;
  cheap3x: Window;
}

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });

const pad = (h: number) => String(h).padStart(2, "0");
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : "–");
const f1 = (v: number) => v.toFixed(1).replace(".", ",");

function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Billigaste/dyraste fönster om n timmar i följd. Vid lika vinner det tidigaste.
 * `starts` = antal timmar fönstret får starta i (dygnets timmar); `hours` kan
 * innehålla nästa dygns första timmar efter dem.
 */
function extremeWindow(hours: HourEntry[], n: number, cheapest: boolean, starts = hours.length): Window {
  let best: Window | null = null;
  for (let i = 0; i < starts && i + n <= hours.length; i++) {
    const avg = mean(hours.slice(i, i + n).map((h) => h.ore_per_kwh));
    if (!best || (cheapest ? avg < best.avg : avg > best.avg)) best = { startHour: hours[i].hour, avg };
  }
  return best!;
}

function analyseDay(date: string, hours: HourEntry[], quarterAvg: number, next: HourEntry[]): Day {
  let cheap = hours[0];
  let dear = hours[0];
  for (const h of hours) {
    if (h.ore_per_kwh < cheap.ore_per_kwh) cheap = h;
    if (h.ore_per_kwh > dear.ore_per_kwh) dear = h;
  }
  return {
    date,
    month: parseInt(date.slice(5, 7), 10),
    weekday: new Date(`${date}T12:00:00Z`).getUTCDay(),
    avg: quarterAvg,
    cheapestHour: cheap.hour,
    dearestHour: dear.hour,
    cheap2: extremeWindow(hours, 2, true),
    dear2: extremeWindow(hours, 2, false),
    cheap3: extremeWindow(hours, 3, true),
    cheap2x: extremeWindow([...hours, ...next.slice(0, 1)], 2, true, hours.length),
    cheap3x: extremeWindow([...hours, ...next.slice(0, 2)], 3, true, hours.length),
  };
}

const isWeekend = (d: Day) => d.weekday === 0 || d.weekday === 6;

/** Andel dygn per timme 0–23. */
function distribution(days: Day[], pick: (d: Day) => number): number[] {
  const counts = new Array(24).fill(0);
  for (const d of days) counts[pick(d)]++;
  return counts;
}

/** "22 (31 %), 23 (18 %), 13 (9 %)" — de vanligaste timmarna. */
function top(days: Day[], pick: (d: Day) => number, n = 3): string {
  const c = distribution(days, pick);
  return c
    .map((count, hour) => ({ hour, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, n)
    .map((x) => `${pad(x.hour)} (${pct(x.count, days.length)})`)
    .join(", ");
}

function months(days: Day[]): number[] {
  return Array.from(new Set(days.map((d) => d.month))).sort((a, b) => a - b);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SECRET_KEY");
  const supabase = createClient(url, key);

  const fromDate = process.argv[2] ?? "2026-04-13";
  const toDate = addDays(stockholmISODate(), -1);
  // Dagens priser hämtas bara som påfyllnad för fönster över midnatt från i går.
  const lookahead = stockholmISODate();

  const rows = await fetchAllPages<Row>((a, b) =>
    supabase
      .from("spot_prices")
      .select("id, area, delivery_period_start, ore_per_kwh")
      .gte("delivery_period_start", stockholmDayUTCRange(fromDate).from)
      .lte("delivery_period_start", stockholmDayUTCRange(lookahead).to)
      .order("delivery_period_start")
      .order("id")
      .range(a, b),
  );

  // område → datum → rader
  const grouped = new Map<Area, Map<string, { start: string; ore: number }[]>>();
  for (const a of AREAS) grouped.set(a, new Map());
  for (const r of rows) {
    const m = grouped.get(r.area);
    if (!m) continue;
    const date = SWEDISH_DATE.format(new Date(r.delivery_period_start));
    if (!m.has(date)) m.set(date, []);
    m.get(date)!.push({ start: r.delivery_period_start, ore: Number(r.ore_per_kwh) });
  }

  const days = new Map<Area, Day[]>();
  const skipped: string[] = [];
  let missingNext = 0;
  for (const a of AREAS) {
    const list: Day[] = [];
    const byDate = grouped.get(a)!;
    const hoursOf = (date: string) => {
      const entries = byDate.get(date);
      if (!entries) return null;
      const q = toQuarters(date, entries);
      return VALID_QUARTERS.has(q.length) ? { q, hours: quartersToHours(q) } : null;
    };
    for (const date of Array.from(byDate.keys()).sort()) {
      if (date > toDate) continue; // dagen själv analyseras inte
      const quarters = toQuarters(date, byDate.get(date)!);
      if (!VALID_QUARTERS.has(quarters.length)) {
        skipped.push(`${a} ${date} (${quarters.length})`);
        continue;
      }
      const next = hoursOf(addDays(date, 1))?.hours ?? [];
      if (next.length === 0) missingNext++;
      list.push(analyseDay(date, quartersToHours(quarters), mean(quarters.map((q) => q.ore)), next));
    }
    days.set(a, list);
  }

  const line = "═".repeat(78);
  console.log(line);
  console.log(`OBS: perioden täcker BARA ${fromDate} – ${toDate}, alltså april–oktober 2026.`);
  console.log("Inga slutsatser om vintern kan dras ur den här datan.");
  console.log("Priser: spotpris, öre/kWh exkl. moms. Timmar = svensk klocktid, timsnitt av kvartarna.");
  console.log(line);
  console.log(`Rader: ${rows.length}. Dygn per område: ${AREAS.map((a) => `${a} ${days.get(a)!.length}`).join(", ")}.`);
  console.log(`Överhoppade dygn: ${skipped.length ? skipped.join(", ") : "inga"}`);
  console.log(`Dygn utan nästa dygn för fönster över midnatt: ${missingNext}`);

  // ── 1. Billigaste och dyraste timmen ───────────────────────────────────────
  for (const [title, pick] of [
    ["BILLIGASTE timmen", (d: Day) => d.cheapestHour],
    ["DYRASTE timmen", (d: Day) => d.dearestHour],
  ] as const) {
    console.log(`\n${line}\n1. ${title}: andel dygn per starttimme (vardag / helg)\n${line}`);
    console.log("  Timme   " + AREAS.map((a) => `${a} vard / helg`.padStart(17)).join(""));
    const dists = AREAS.map((a) => {
      const d = days.get(a)!;
      const wd = d.filter((x) => !isWeekend(x));
      const we = d.filter(isWeekend);
      return { wd: distribution(wd, pick), we: distribution(we, pick), nwd: wd.length, nwe: we.length };
    });
    for (let h = 0; h < 24; h++) {
      if (dists.every((x) => x.wd[h] === 0 && x.we[h] === 0)) continue;
      console.log(
        `  ${pad(h)}–${pad((h + 1) % 24)}   ` +
          dists.map((x) => `${pct(x.wd[h], x.nwd).padStart(6)} / ${pct(x.we[h], x.nwe).padEnd(5)}`.padStart(17)).join(""),
      );
    }
    console.log(`  (timmar som aldrig var ${title.split(" ")[0].toLowerCase()} är utelämnade)`);
    console.log(`\n  Per månad — vanligaste timmarna (andel av månadens dygn):`);
    for (const a of AREAS) {
      const d = days.get(a)!;
      console.log(`  ${a}:`);
      for (const m of months(d)) {
        const md = d.filter((x) => x.month === m);
        console.log(`    ${MONTH_NAMES[m]} (${String(md.length).padStart(2)} d): ${top(md, pick)}`);
      }
    }
  }

  // ── 2. Billigaste fönster på 2 och 3 timmar ───────────────────────────────
  for (const n of [2, 3] as const) {
    const variants = [
      ["inom dygnet ", (d: Day) => (n === 2 ? d.cheap2 : d.cheap3).startHour],
      ["över midnatt", (d: Day) => (n === 2 ? d.cheap2x : d.cheap3x).startHour],
    ] as const;
    console.log(`\n${line}\n2. Billigaste fönstret på ${n} timmar i följd — vanligaste starttimme (topp 3)\n${line}`);
    for (const a of AREAS) {
      const d = days.get(a)!;
      console.log(`  ${a}:`);
      for (const [name, pick] of variants) {
        console.log(`    ${name}  alla ${top(d, pick)}`);
        console.log(`    ${" ".repeat(name.length)}  vardag ${top(d.filter((x) => !isWeekend(x)), pick)} | helg ${top(d.filter(isWeekend), pick)}`);
        console.log(`    ${" ".repeat(name.length)}  per månad: ${months(d).map((m) => `${MONTH_NAMES[m]} ${top(d.filter((x) => x.month === m), pick, 1)}`).join(" · ")}`);
      }
    }
  }

  // ── 3. Prisskillnad billigaste vs dyraste 2-timmarsfönster ────────────────
  console.log(`\n${line}\n3. Skillnad dyraste − billigaste 2-timmarsfönster per dygn (öre/kWh, median [p25–p75])\n${line}`);
  const spreadStr = (d: Day[]) => {
    if (d.length === 0) return "–";
    const s = d.map((x) => x.dear2.avg - x.cheap2.avg);
    return `${f1(percentile(s, 0.5))} [${f1(percentile(s, 0.25))}–${f1(percentile(s, 0.75))}]`;
  };
  console.log("            " + AREAS.map((a) => a.padStart(20)).join(""));
  console.log("  alla      " + AREAS.map((a) => spreadStr(days.get(a)!).padStart(20)).join(""));
  console.log("  vardag    " + AREAS.map((a) => spreadStr(days.get(a)!.filter((x) => !isWeekend(x))).padStart(20)).join(""));
  console.log("  helg      " + AREAS.map((a) => spreadStr(days.get(a)!.filter(isWeekend)).padStart(20)).join(""));
  for (const m of months(days.get("SE3")!)) {
    console.log(`  ${MONTH_NAMES[m].padEnd(10)}` + AREAS.map((a) => spreadStr(days.get(a)!.filter((x) => x.month === m)).padStart(20)).join(""));
  }

  // ── 4. Natt mot mitt på dagen ─────────────────────────────────────────────
  for (const [title, pick] of [
    ["2 timmar, inom dygnet", (d: Day) => d.cheap2.startHour],
    ["2 timmar, över midnatt", (d: Day) => d.cheap2x.startHour],
    ["3 timmar, inom dygnet", (d: Day) => d.cheap3.startHour],
    ["3 timmar, över midnatt", (d: Day) => d.cheap3x.startHour],
  ] as const) {
    console.log(`\n${line}\n4. Var startar billigaste fönstret (${title})?\n   Andel dygn: natt 00–05 / dag 10–15 / övrigt (varav kväll 20–23)\n${line}`);
    const bucket = (d: Day[]) => {
      const n = d.filter((x) => pick(x) <= 5).length;
      const m = d.filter((x) => pick(x) >= 10 && pick(x) <= 15).length;
      const e = d.filter((x) => pick(x) >= 20).length;
      return `${pct(n, d.length)} / ${pct(m, d.length)} / ${pct(d.length - n - m, d.length)} (${pct(e, d.length)})`;
    };
    console.log("            " + AREAS.map((a) => a.padStart(26)).join(""));
    console.log("  alla      " + AREAS.map((a) => bucket(days.get(a)!).padStart(26)).join(""));
    for (const m of months(days.get("SE3")!)) {
      console.log(`  ${MONTH_NAMES[m].padEnd(10)}` + AREAS.map((a) => bucket(days.get(a)!.filter((x) => x.month === m)).padStart(26)).join(""));
    }
  }

  // ── 5. Helg mot vardag ────────────────────────────────────────────────────
  console.log(`\n${line}\n5. Medel av dygnssnittet (öre/kWh): vardagar mån–fre, lördag, söndag\n${line}`);
  for (const a of AREAS) {
    const d = days.get(a)!;
    const wd = d.filter((x) => !isWeekend(x));
    const sat = d.filter((x) => x.weekday === 6);
    const sun = d.filter((x) => x.weekday === 0);
    console.log(
      `  ${a}: vardag ${f1(mean(wd.map((x) => x.avg)))} (${wd.length} d) · lördag ${f1(mean(sat.map((x) => x.avg)))} (${sat.length} d) · söndag ${f1(mean(sun.map((x) => x.avg)))} (${sun.length} d)`,
    );
  }
  console.log(`\n${line}\nOBS igen: bara april–oktober 2026. Vintern saknas i underlaget.\n${line}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
