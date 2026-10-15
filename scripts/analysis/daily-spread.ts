// Dygnsspridning per elområde ur vår egen data (spot_prices).
//
// Spridning = dyraste kvart − billigaste kvart under ett svenskt kalenderdygn
// (öre/kWh exkl. moms). Dygn som inte har 92, 96 eller 100 kvartar hoppas över.
//
// Användning:
//   npx tsx scripts/analysis/daily-spread.ts [från-datum] [--monthly]   (standard 2026-04-13, till och med i går)
//   --monthly  skriver även median av dygnssnittet per månad och område

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
const VALID_QUARTERS = new Set([92, 96, 100]);

interface Row {
  id: number;
  area: Area;
  delivery_period_start: string;
  ore_per_kwh: number;
}

interface Day {
  date: string;
  spread: number;
  avg: number;
}

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const swedishDate = (iso: string) => SWEDISH_DATE.format(new Date(iso));

/** Percentil med linjär interpolation (p i 0..1) på sorterad lista. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs: number[]) => percentile([...xs].sort((a, b) => a - b), 0.5);
const f1 = (v: number) => v.toFixed(1).replace(".", ",");
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1).replace(".", ",")} %`;

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SECRET_KEY");
  const supabase = createClient(url, key);

  const args = process.argv.slice(2);
  const monthly = args.includes("--monthly");
  const fromDate = args.find((a) => !a.startsWith("--")) ?? "2026-04-13";
  const toDate = addDays(stockholmISODate(), -1);
  const from = stockholmDayUTCRange(fromDate).from;
  const to = stockholmDayUTCRange(toDate).to;

  const rows = await fetchAllPages<Row>((a, b) =>
    supabase
      .from("spot_prices")
      .select("id, area, delivery_period_start, ore_per_kwh")
      .gte("delivery_period_start", from)
      .lte("delivery_period_start", to)
      .order("delivery_period_start")
      .order("id")
      .range(a, b),
  );

  console.log(`Period: ${fromDate} – ${toDate} (svenska kalenderdygn)`);
  console.log(`Rader hämtade: ${rows.length}\n`);

  // område → datum → kvartspriser (och starttid → pris för SE3/SE4-jämförelsen)
  const byAreaDate = new Map<Area, Map<string, number[]>>();
  const byStart = new Map<Area, Map<string, number>>();
  for (const a of AREAS) {
    byAreaDate.set(a, new Map());
    byStart.set(a, new Map());
  }
  for (const r of rows) {
    if (!byAreaDate.has(r.area)) continue;
    const date = swedishDate(r.delivery_period_start);
    const ore = Number(r.ore_per_kwh);
    const m = byAreaDate.get(r.area)!;
    if (!m.has(date)) m.set(date, []);
    m.get(date)!.push(ore);
    byStart.get(r.area)!.set(new Date(r.delivery_period_start).toISOString(), ore);
  }

  const days = new Map<Area, Day[]>();
  console.log("Överhoppade dygn (inte 92/96/100 kvartar):");
  for (const a of AREAS) {
    const ok: Day[] = [];
    const skipped: string[] = [];
    for (const [date, prices] of Array.from(byAreaDate.get(a)!.entries()).sort(([x], [y]) => x.localeCompare(y))) {
      if (!VALID_QUARTERS.has(prices.length)) {
        skipped.push(`${date} (${prices.length})`);
        continue;
      }
      ok.push({ date, spread: Math.max(...prices) - Math.min(...prices), avg: mean(prices) });
    }
    days.set(a, ok);
    console.log(`  ${a}: ${skipped.length}${skipped.length ? " — " + skipped.join(", ") : ""}`);
  }

  console.log("\n═══ Sammanställning per elområde (öre/kWh exkl. moms) ═══");
  for (const a of AREAS) {
    const d = days.get(a)!;
    const spreads = d.map((x) => x.spread).sort((x, y) => x - y);
    const avgs = d.map((x) => x.avg);
    console.log(`\n${a}: ${d.length} dygn`);
    console.log(
      `  Spridning  medel ${f1(mean(spreads))} · median ${f1(percentile(spreads, 0.5))} · p25 ${f1(percentile(spreads, 0.25))} · p90 ${f1(percentile(spreads, 0.9))} · max ${f1(spreads.at(-1)!)}`,
    );
    console.log(`  Dygnssnitt medel ${f1(mean(avgs))} · median ${f1(median(avgs))}`);
  }

  console.log("\n═══ Spridning per månad (median, öre/kWh) ═══");
  const months = Array.from(new Set(AREAS.flatMap((a) => days.get(a)!.map((x) => x.date.slice(0, 7))))).sort();
  console.log("  Månad     " + AREAS.map((a) => a.padStart(8)).join("") + "   (antal dygn)");
  for (const mo of months) {
    const cells = AREAS.map((a) => {
      const s = days.get(a)!.filter((x) => x.date.startsWith(mo)).map((x) => x.spread);
      return (s.length ? f1(median(s)) : "–").padStart(8);
    });
    const n = days.get("SE3")!.filter((x) => x.date.startsWith(mo)).length;
    console.log(`  ${mo}   ${cells.join("")}   (${n})`);
  }

  if (monthly) {
    console.log("\n═══ Dygnssnitt per månad (median, öre/kWh exkl. moms) ═══");
    console.log("  Månad     " + AREAS.map((a) => a.padStart(8)).join("") + "   (antal dygn, första–sista)");
    for (const mo of months) {
      const cells = AREAS.map((a) => {
        const v = days.get(a)!.filter((x) => x.date.startsWith(mo)).map((x) => x.avg);
        return (v.length ? f1(median(v)) : "–").padStart(8);
      });
      const d = days.get("SE3")!.filter((x) => x.date.startsWith(mo)).map((x) => x.date);
      console.log(`  ${mo}   ${cells.join("")}   (${d.length}, ${d[0]}–${d.at(-1)})`);
    }
  }

  console.log("\n═══ SE4 jämfört med SE3 ═══");
  const se3 = new Map(days.get("SE3")!.map((x) => [x.date, x]));
  const both = days.get("SE4")!.filter((x) => se3.has(x.date));
  let higher = 0, equal = 0, lower = 0, widerSpread = 0;
  for (const d4 of both) {
    const d3 = se3.get(d4.date)!;
    const diff = d4.avg - d3.avg;
    if (Math.abs(diff) < 0.1) equal++;
    else if (diff > 0) higher++;
    else lower++;
    if (d4.spread > d3.spread) widerSpread++;
  }
  console.log(`  Dygn med data i båda: ${both.length}`);
  console.log(`  Dygnssnitt SE4 > SE3: ${pct(higher, both.length)} (${higher}) · lika (< 0,1 öre): ${pct(equal, both.length)} (${equal}) · SE4 < SE3: ${pct(lower, both.length)} (${lower})`);

  const validDates = new Set(both.map((x) => x.date));
  const q3 = byStart.get("SE3")!;
  let quarters = 0, dearer = 0, sameQ = 0;
  const dearerDiffs: number[] = [];
  for (const [start, p4] of Array.from(byStart.get("SE4")!.entries())) {
    if (!validDates.has(swedishDate(start))) continue;
    const p3 = q3.get(start);
    if (p3 === undefined) continue;
    quarters++;
    if (p4 > p3) {
      dearer++;
      dearerDiffs.push(p4 - p3);
    } else if (p4 === p3) sameQ++;
  }
  console.log(`  Kvartar med pris i båda: ${quarters}`);
  console.log(`  SE4 dyrare än SE3: ${pct(dearer, quarters)} av kvartarna · exakt samma pris: ${pct(sameQ, quarters)}`);
  console.log(`  Medianskillnad de kvartar SE4 är dyrare: ${f1(median(dearerDiffs))} öre/kWh`);
  console.log(`  Dygn där SE4 har större spridning än SE3: ${pct(widerSpread, both.length)} (${widerSpread} av ${both.length})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
