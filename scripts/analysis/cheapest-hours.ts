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
//   npx tsx scripts/analysis/cheapest-hours.ts [från-datum] [--to till-datum]
//       från-datum standard 2026-04-13, till-datum standard i går (båda YYYY-MM-DD, inklusive)
//   npx tsx scripts/analysis/cheapest-hours.ts [från-datum] --to till-datum --write
//       skriver även src/lib/prices/windowSpreadStats.ts (medianskillnad per
//       fönsterlängd, över midnatt). --write kräver --to, så att perioden i
//       filen inte flyttar sig av sig själv när skriptet körs en annan dag.

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
  /** Billigaste/dyraste fönster per längd (1–4 h). in = inom dygnet, x = över midnatt. */
  win: Record<WinLen, { in: { cheap: Window; dear: Window }; x: { cheap: Window; dear: Window } }>;
}

const WIN_LENGTHS = [1, 2, 3, 4] as const;
type WinLen = (typeof WIN_LENGTHS)[number];
type Variant = "in" | "x";
const VARIANT_LABEL: Record<Variant, string> = { in: "inom dygnet ", x: "över midnatt" };

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
    win: Object.fromEntries(
      WIN_LENGTHS.map((n) => {
        const ext = [...hours, ...next.slice(0, n - 1)];
        return [
          n,
          {
            in: { cheap: extremeWindow(hours, n, true), dear: extremeWindow(hours, n, false) },
            x: { cheap: extremeWindow(ext, n, true, hours.length), dear: extremeWindow(ext, n, false, hours.length) },
          },
        ];
      }),
    ) as Day["win"],
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

  const args = process.argv.slice(2);
  const toIndex = args.indexOf("--to");
  const toArg = toIndex >= 0 ? args[toIndex + 1] : undefined;
  // Från-datum: första argumentet som varken är en flagga eller värdet till --to.
  const fromArg = args.find((a, i) => !a.startsWith("--") && (toIndex < 0 || i !== toIndex + 1));
  const write = args.includes("--write");
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (toIndex >= 0 && !(toArg && ISO.test(toArg))) throw new Error("--to kräver ett datum (YYYY-MM-DD)");
  if (write && toIndex < 0) throw new Error("--write kräver --to YYYY-MM-DD, t.ex. --to 2026-10-12");
  const fromDate = fromArg ?? "2026-04-13";
  if (!ISO.test(fromDate)) throw new Error(`Ogiltigt från-datum: ${fromDate} (YYYY-MM-DD)`);
  const toDate = toArg ?? addDays(stockholmISODate(), -1);
  if (toDate >= stockholmISODate()) throw new Error(`--to måste vara senast i går (${addDays(stockholmISODate(), -1)})`);
  if (toDate < fromDate) throw new Error(`--to (${toDate}) ligger före från-datum (${fromDate})`);
  const MONTH_LONG = ["", "januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
  const monthName = (iso: string) => MONTH_LONG[Number(iso.slice(5, 7))];
  // T.ex. "april–oktober 2026", "maj 2026" eller "november 2026–mars 2027".
  const periodLabel =
    fromDate.slice(0, 7) === toDate.slice(0, 7)
      ? `${monthName(fromDate)} ${fromDate.slice(0, 4)}`
      : fromDate.slice(0, 4) === toDate.slice(0, 4)
        ? `${monthName(fromDate)}–${monthName(toDate)} ${toDate.slice(0, 4)}`
        : `${monthName(fromDate)} ${fromDate.slice(0, 4)}–${monthName(toDate)} ${toDate.slice(0, 4)}`;
  // Dygnet efter till-datum hämtas bara som påfyllnad för fönster över midnatt.
  const lookahead = addDays(toDate, 1);

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
  console.log(`OBS: perioden täcker BARA ${fromDate} – ${toDate}, alltså ${periodLabel}.`);
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

  // ── 2. Billigaste fönster på 2–4 timmar ───────────────────────────────────
  for (const n of [2, 3, 4] as const) {
    const variants = (["in", "x"] as const).map((v) => [VARIANT_LABEL[v], (d: Day) => d.win[n][v].cheap.startHour] as const);
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

  // ── 3. Prisskillnad dyraste − billigaste fönster, 1–4 timmar ──────────────
  const spreadOf = (d: Day[], n: WinLen, v: Variant) => d.map((x) => x.win[n][v].dear.avg - x.win[n][v].cheap.avg);
  const spreadStr = (d: Day[], n: WinLen, v: Variant) => {
    if (d.length === 0) return "–";
    const s = spreadOf(d, n, v);
    return `${f1(percentile(s, 0.5))} [${f1(percentile(s, 0.25))}–${f1(percentile(s, 0.75))}]`;
  };
  for (const n of WIN_LENGTHS) {
    for (const v of ["x", "in"] as const) {
      console.log(`\n${line}\n3. Skillnad dyraste − billigaste ${n}-timmarsfönster per dygn, ${VARIANT_LABEL[v].trim()} (öre/kWh, median [p25–p75])\n${line}`);
      console.log("            " + AREAS.map((a) => a.padStart(20)).join(""));
      console.log("  alla      " + AREAS.map((a) => spreadStr(days.get(a)!, n, v).padStart(20)).join(""));
      console.log("  vardag    " + AREAS.map((a) => spreadStr(days.get(a)!.filter((x) => !isWeekend(x)), n, v).padStart(20)).join(""));
      console.log("  helg      " + AREAS.map((a) => spreadStr(days.get(a)!.filter(isWeekend), n, v).padStart(20)).join(""));
      for (const m of months(days.get("SE3")!)) {
        console.log(`  ${MONTH_NAMES[m].padEnd(10)}` + AREAS.map((a) => spreadStr(days.get(a)!.filter((x) => x.month === m), n, v).padStart(20)).join(""));
      }
    }
  }

  // ── 4. Natt mot mitt på dagen ─────────────────────────────────────────────
  for (const [title, pick] of ([2, 3, 4] as const).flatMap((n) =>
    (["in", "x"] as const).map((v) => [`${n} timmar, ${VARIANT_LABEL[v].trim()}`, (d: Day) => d.win[n][v].cheap.startHour] as const),
  )) {
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
  console.log(`\n${line}\nOBS igen: bara ${periodLabel}. Vintern saknas i underlaget.\n${line}`);

  if (write) {
    const firstMonth = Math.min(...months(days.get("SE3")!));
    const lastMonth = Math.max(...months(days.get("SE3")!));
    const label = `${MONTH_LONG[firstMonth]}–${MONTH_LONG[lastMonth]} ${toDate.slice(0, 4)}`;
    const median = (n: WinLen, a: Area) => Math.round(percentile(spreadOf(days.get(a)!, n, "x"), 0.5) * 10) / 10;
    const body = WIN_LENGTHS.map((n) => `  ${n}: { ${AREAS.map((a) => `${a}: ${median(n, a)}`).join(", ")} },`).join("\n");
    const out = `// GENERERAD FIL — ändra inte för hand.
// Kör: npx tsx scripts/analysis/cheapest-hours.ts ${fromDate} --to ${toDate} --write
//
// Medianskillnad per dygn mellan dygnets dyraste och billigaste fönster om N
// timmar i följd (1–4), per elområde. Fönster räknas i hela timmar på
// kvartspriserna och får fortsätta in i nästa dygn. Spotpris, öre/kWh exkl. moms.
// Källa: elpris.ai:s egen prisdata (spot_prices).

export type SpreadArea = "SE1" | "SE2" | "SE3" | "SE4";
export type WindowHours = 1 | 2 | 3 | 4;

export const WINDOW_SPREAD_PERIOD = {
  from: "${fromDate}",
  to: "${toDate}",
  /** Till källraden, t.ex. "april–oktober 2026". */
  label: "${label}",
  daysPerArea: ${days.get("SE3")!.length},
} as const;

export const WINDOW_SPREAD_MEDIAN: Record<WindowHours, Record<SpreadArea, number>> = {
${body}
};
`;
    fs.writeFileSync("src/lib/prices/windowSpreadStats.ts", out);
    console.log("\nSkrev src/lib/prices/windowSpreadStats.ts:\n" + out);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
