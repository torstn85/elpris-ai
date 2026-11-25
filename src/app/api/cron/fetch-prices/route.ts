import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase, type SpotPriceRow } from "@/lib/supabase";
import { stockholmISODate } from "@/lib/time";
import { addDays } from "@/lib/dates";
import { fetchAllPages } from "@/lib/supabasePaging";
import { toSpotPriceRows, type ElprisetjustnuEntry } from "@/lib/prices/spotRows";
import { completeAreas, dayBoundsMs, type PeriodRow } from "@/lib/prices/completeDays";

// Aldrig statisk: utan detta försöker next build förrendera routen och köra
// hämtningen. Ingen Data Cache för fetch (elprisetjustnu och Supabase).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

/** Svenskt datum "YYYY-MM-DD" → elprisetjustnu-sökväg "YYYY/MM-DD". */
function toPath(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${y}/${m}-${d}`;
}

/**
 * Områden per dygn som redan är fullständiga i spot_prices. En fråga för alla
 * dygnen (högst 2 dygn × 4 områden × 100 kvartar = 800 rader).
 */
async function loadCompleteAreas(isoDates: string[]): Promise<Map<string, Set<string>>> {
  const fromMs = dayBoundsMs(isoDates[0]).startMs;
  const toMs = dayBoundsMs(isoDates[isoDates.length - 1]).endMs;
  const rows = await fetchAllPages<PeriodRow>((a, b) =>
    supabase
      .from("spot_prices")
      .select("area, delivery_period_start, delivery_period_end")
      .gte("delivery_period_start", new Date(fromMs).toISOString())
      .lt("delivery_period_start", new Date(toMs).toISOString())
      .order("delivery_period_start")
      .order("id")
      .range(a, b),
  );
  return new Map(isoDates.map((d) => [d, completeAreas(rows, d)]));
}

async function fetchRawArea(area: Area, dateStr: string): Promise<ElprisetjustnuEntry[]> {
  const url = `https://www.elprisetjustnu.se/api/v1/prices/${dateStr}_${area}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${area}: ${res.status}`);
  return res.json() as Promise<ElprisetjustnuEntry[]>;
}

async function upsertRows(rows: SpotPriceRow[]): Promise<number> {
  const { error, count } = await supabase
    .from("spot_prices")
    .upsert(rows, {
      onConflict: "area,delivery_period_start",
      count: "exact",
    });
  if (error) throw new Error(error.message);
  return count ?? rows.length;
}

interface AreaResult {
  area: Area;
  rows_upserted?: number;
  error?: string;
}

// Fetch + upsert one area, returning a structured result either way
async function fetchAndUpsertArea(area: Area, dateStr: string): Promise<AreaResult> {
  try {
    const entries = await fetchRawArea(area, dateStr);
    const rows = toSpotPriceRows(area, entries);
    const count = await upsertRows(rows);
    return { area, rows_upserted: count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[fetch-prices] ${area} failed for ${dateStr}: ${message}`);
    return { area, error: message };
  }
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Anropas av GitHub Actions (.github/workflows/fetch-prices.yml) med
 * Authorization: Bearer <CRON_SECRET>. Jämför SHA-256 av värdena med
 * timingSafeEqual (samma längd oavsett indata). Hemligheten loggas aldrig.
 */
function authorize(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[fetch-prices] CRON_SECRET saknas i miljön — alla anrop nekas");
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

interface DayResult {
  date: string; // "YYYY/MM-DD" som tidigare
  rows_upserted: number;
  areas_ok: Area[];
  /** Redan fullständiga i databasen — inte hämtade. */
  areas_skipped: Area[];
  areas_failed: { area: Area; error?: string }[];
}

/**
 * Hämtar dagens dygn och, efter 13:15 svensk tid, morgondagens — men bara de
 * områden som inte redan är fullständiga i spot_prices. Är allt fullständigt
 * görs inga anrop till elprisetjustnu (skipped: true). ?force=1 hämtar allt.
 * Kan inte databasen läsas hämtas allt, som före överhoppningen.
 */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    const now = new Date();
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      parseInt(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", ...opts }).format(now), 10);
    const stockholmHour = fmt({ hour: "numeric", hour12: false });
    const stockholmMinute = fmt({ minute: "numeric" });
    const afterDayAhead = stockholmHour > 13 || (stockholmHour === 13 && stockholmMinute >= 15);

    const today = stockholmISODate();
    const dates = afterDayAhead ? [today, addDays(today, 1)] : [today];

    let complete = new Map<string, Set<string>>();
    if (!force) {
      try {
        complete = await loadCompleteAreas(dates);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[fetch-prices] could not read existing rows, fetching all: ${message}`);
      }
    }

    const [todayResult, tomorrowResult] = await Promise.all(
      dates.map(async (iso): Promise<DayResult> => {
        const done = complete.get(iso) ?? new Set<string>();
        const skipped = AREAS.filter((a) => done.has(a));
        const missing = AREAS.filter((a) => !done.has(a));
        const path = toPath(iso);
        const results = await Promise.all(missing.map((area) => fetchAndUpsertArea(area, path)));
        const ok = results.filter((r) => !r.error);
        const failed = results.filter((r) => r.error);
        if (missing.length > 0) {
          console.log(
            `[fetch-prices] ${path}: fetched ${ok.length}/${missing.length}` +
              (skipped.length ? `, skipped ${skipped.join("+")} (complete)` : "") +
              (failed.length ? `, failed ${failed.map((r) => `${r.area}(${r.error})`).join(", ")}` : ""),
          );
        }
        return {
          date: path,
          rows_upserted: ok.reduce((s, r) => s + (r.rows_upserted ?? 0), 0),
          areas_ok: ok.map((r) => r.area),
          areas_skipped: skipped,
          areas_failed: failed.map((r) => ({ area: r.area, error: r.error })),
        };
      }),
    );

    const fetchedNothing = [todayResult, tomorrowResult].every((d) => !d || d.areas_ok.length + d.areas_failed.length === 0);
    if (fetchedNothing) console.log(`[fetch-prices] skipped: ${dates.join(" + ")} already complete`);

    // 500 bara om inget område har dagens dygn — varken hämtat nu eller redan i databasen.
    if (todayResult.areas_ok.length + todayResult.areas_skipped.length === 0) {
      return NextResponse.json(
        { ok: false, error: "All four areas failed for today", today: todayResult },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      skipped: fetchedNothing,
      forced: force,
      today: todayResult,
      tomorrow: tomorrowResult ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[fetch-prices] Unexpected error: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
