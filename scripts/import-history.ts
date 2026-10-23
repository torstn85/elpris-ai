// Importerar historiska spotpriser från elprisetjustnu.se till spot_prices.
//
// Timpriser (60 min) före 1 oktober 2025, kvartspriser (15 min) från och med.
// Sekventiellt, ett dygn och område i taget, med paus mellan anropen. Varje
// dygn kontrolleras (antal rader, steg, inga luckor eller överlapp, hela det
// svenska kalenderdygnet) innan det skrivs; dygn som inte klarar kontrollen
// loggas och skrivs inte.
//
// Idempotent: upsert med ignoreDuplicates — befintliga rader (t.ex. från
// cron-jobbet) skrivs aldrig över, och en avbruten körning kan köras om.
// Till-datum är låst till senast 2026-04-13 (dagen före vår egen data).
//
// Användning:
//   npx tsx scripts/import-history.ts --from 2022-10-01 --to 2022-10-31 [--area SE3] [--dry-run]
//
// Avslutar med exit 1 om något dygn avvek eller inte kunde hämtas.

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { addDays } from "../src/lib/dates";
import { stockholmDayUTCRange } from "../src/lib/time";
import type { SpotPriceRow } from "../src/lib/supabase";
import {
  elprisetjustnuUrl,
  toSpotPriceRows,
  type ElprisetjustnuEntry,
  type SpotArea,
} from "../src/lib/prices/spotRows";

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

const AREAS: SpotArea[] = ["SE1", "SE2", "SE3", "SE4"];
const LATEST_TO = "2026-04-13"; // vår egen data börjar 2026-04-14
const QUARTER_FROM = "2025-10-01"; // kvartspriser från och med detta dygn
const PAUSE_MS = 500;
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000]; // 3 nya försök vid 429/5xx/nätverksfel
const USER_AGENT = "elpris.ai history import (www.elpris.ai)";
const MIN = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Argument ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const from = value("--from");
  const to = value("--to");
  const area = value("--area");
  const dryRun = args.includes("--dry-run");

  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    throw new Error("Ange --from YYYY-MM-DD och --to YYYY-MM-DD.");
  }
  if (from > to) throw new Error(`--from (${from}) är efter --to (${to}).`);
  if (to > LATEST_TO) {
    throw new Error(`--to får vara senast ${LATEST_TO} (vår egen data börjar dagen efter), fick ${to}.`);
  }
  if (area && !AREAS.includes(area as SpotArea)) throw new Error(`Okänt område: ${area}`);

  return { from, to, areas: area ? [area as SpotArea] : AREAS, dryRun };
}

// ─── Hämtning ─────────────────────────────────────────────────────────────────

type FetchResult =
  | { ok: true; entries: ElprisetjustnuEntry[] }
  | { ok: false; reason: string };

async function fetchDay(area: SpotArea, date: string): Promise<FetchResult> {
  const url = elprisetjustnuUrl(area, date);
  for (let attempt = 0; ; attempt++) {
    let reason: string;
    let retryable: boolean;
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) return { ok: true, entries: (await res.json()) as ElprisetjustnuEntry[] };
      reason = `HTTP ${res.status}`;
      retryable = res.status === 429 || res.status >= 500;
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
      retryable = true;
    }
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) return { ok: false, reason };
    console.warn(`  ${area} ${date}: ${reason}, nytt försök om ${RETRY_DELAYS_MS[attempt] / 1000} s`);
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

// ─── Kontroll ─────────────────────────────────────────────────────────────────

const VALID_COUNTS: Record<number, number[]> = { 60: [23, 24, 25], 15: [92, 96, 100] };

/**
 * Kontrollerar raderna efter omvandlingen (toSpotPriceRows rättar källans
 * sluttid vid omställningen till normaltid). null om dygnet är korrekt,
 * annars en beskrivning av felet.
 */
function validateDay(date: string, rows: SpotPriceRow[], resolution: number): string | null {
  if (rows.length === 0) return "tomt svar";
  if (!VALID_COUNTS[resolution].includes(rows.length)) {
    return `${rows.length} rader (väntat ${VALID_COUNTS[resolution].join("/")})`;
  }

  // Hela det svenska kalenderdygnet: 00:00 till nästa dygns 00:00.
  const dayStart = Date.parse(stockholmDayUTCRange(date).from);
  const dayEnd = Date.parse(stockholmDayUTCRange(addDays(date, 1)).from);
  const expected = (dayEnd - dayStart) / (resolution * MIN);
  if (rows.length !== expected) return `${rows.length} rader, dygnet har ${expected} perioder om ${resolution} min`;

  let prevEnd = dayStart;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const start = Date.parse(r.delivery_period_start);
    const end = Date.parse(r.delivery_period_end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return `rad ${i + 1}: ogiltig tid`;
    if (typeof r.sek_per_kwh !== "number" || !Number.isFinite(r.sek_per_kwh)) return `rad ${i + 1}: ogiltigt pris`;
    if (start !== prevEnd) {
      return `rad ${i + 1}: ${start > prevEnd ? "lucka" : "överlapp"} vid ${r.delivery_period_start}`;
    }
    if (end - start !== resolution * MIN) return `rad ${i + 1}: steg ${(end - start) / MIN} min (väntat ${resolution})`;
    prevEnd = end;
  }
  if (prevEnd !== dayEnd) return "dygnet slutar inte vid nästa dygns 00:00";
  return null;
}

// ─── Rapport ──────────────────────────────────────────────────────────────────

interface Bucket {
  days: number;
  rows: number;
  written: number;
  deviating: string[];
  failed: string[];
}

const newBucket = (): Bucket => ({ days: 0, rows: 0, written: 0, deviating: [], failed: [] });

// ─── Huvudprogram ─────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const { from, to, areas, dryRun } = parseArgs();

  const supabase = dryRun
    ? null
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  if (!dryRun && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)) {
    throw new Error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SECRET_KEY i .env.local");
  }

  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  console.log(
    `${dryRun ? "TORRKÖRNING (inget skrivs)" : "IMPORT"}: ${from} – ${to}, ${dates.length} dygn × ${areas.join(", ")}` +
      ` = ${dates.length * areas.length} anrop, ${PAUSE_MS} ms paus\n`,
  );

  // område → upplösning → statistik
  const report = new Map<SpotArea, Map<number, Bucket>>(areas.map((a) => [a, new Map()]));
  const bucket = (area: SpotArea, res: number) => {
    const m = report.get(area)!;
    if (!m.has(res)) m.set(res, newBucket());
    return m.get(res)!;
  };

  let calls = 0;
  for (const date of dates) {
    const resolution = date >= QUARTER_FROM ? 15 : 60;
    for (const area of areas) {
      if (calls++ > 0) await sleep(PAUSE_MS);
      const b = bucket(area, resolution);

      const result = await fetchDay(area, date);
      if (!result.ok) {
        b.failed.push(`${date}: ${result.reason}`);
        console.error(`  ✗ ${area} ${date}: kunde inte hämtas (${result.reason})`);
        continue;
      }

      const rows = Array.isArray(result.entries) ? toSpotPriceRows(area, result.entries) : [];
      const problem = validateDay(date, rows, resolution);
      if (problem) {
        b.deviating.push(`${date}: ${problem}`);
        console.error(`  ✗ ${area} ${date}: avviker – ${problem} (skrivs inte)`);
        continue;
      }

      if (supabase) {
        const { error, count } = await supabase
          .from("spot_prices")
          .upsert(rows, { onConflict: "area,delivery_period_start", ignoreDuplicates: true, count: "exact" });
        if (error) {
          b.failed.push(`${date}: skrivfel ${error.message}`);
          console.error(`  ✗ ${area} ${date}: skrivfel – ${error.message}`);
          continue;
        }
        b.written += count ?? 0;
      }
      b.days++;
      b.rows += rows.length;
    }
    if (date.endsWith("-01") || date === to) console.log(`  … ${date} klart`);
  }

  // Slutrapport
  console.log(`\n══ Slutrapport ${dryRun ? "(torrkörning)" : ""}`);
  console.log("Område  Uppl.   Dygn OK   Rader   Nya i db   Avvikande   Ej hämtade");
  let problems = 0;
  for (const area of areas) {
    const byRes = report.get(area)!;
    for (const [res, b] of Array.from(byRes.entries()).sort(([x], [y]) => y - x)) {
      problems += b.deviating.length + b.failed.length;
      console.log(
        `${area}     ${String(res).padStart(2)} min  ${String(b.days).padStart(7)}  ${String(b.rows).padStart(6)}` +
          `  ${(dryRun ? "–" : String(b.written)).padStart(9)}  ${String(b.deviating.length).padStart(10)}  ${String(b.failed.length).padStart(11)}`,
      );
      for (const d of b.deviating) console.log(`          avviker: ${d}`);
      for (const f of b.failed) console.log(`          ej hämtad: ${f}`);
    }
  }
  console.log(problems === 0 ? "\nInga avvikande eller saknade dygn." : `\n${problems} dygn avvek eller kunde inte hämtas.`);
  if (problems > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
