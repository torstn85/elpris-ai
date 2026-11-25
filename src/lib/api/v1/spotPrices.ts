// GET /api/v1/spot-prices — spotpriser för externa partner (först Cajoto).
// Kontraktet finns i docs/api-v1.md.
//
// Ren modul: autentisering, validering, omvandling och svar. Databasen och
// Upstash kommer in som beroenden (SpotPricesDeps), så att
// scripts/check-api-v1.ts kan köra hela handlern offline med fixturer och en
// rate limiter i minnet. De riktiga beroendena finns i ./data.ts.

import { createHash, timingSafeEqual } from "node:crypto";
import type { Quarter } from "@/lib/prices/quarters";
import { quartersToHours } from "@/lib/prices/hourly";
import { addDays, daysBetween } from "@/lib/dates";
import { stockholmDayUTCRange } from "@/lib/time";

export const API_AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type ApiArea = (typeof API_AREAS)[number];
export type Resolution = "hour" | "quarter";

/** Första dygnet i spot_prices. */
export const COVERAGE_FROM = "2021-11-01";
/** Första dygnet med kvartspriser. */
export const QUARTER_FROM = "2025-10-01";
/** Längsta intervall per anrop, i kalenderdygn (båda ändarna inräknade). */
export const MAX_DAYS: Record<Resolution, number> = { hour: 366, quarter: 93 };
/** Anrop per nyckel och minut. */
export const RATE_LIMIT_PER_MINUTE = 60;

const QUARTER_MS = 15 * 60 * 1000;

// ─── Beroenden ────────────────────────────────────────────────────────────────

export interface ApiKey {
  name: string;
  key: string;
}

/** En rad ur spot_prices (de fält API:t läser). */
export interface PriceRow {
  delivery_period_start: string;
  delivery_period_end: string;
  resolution_minutes: number;
  ore_per_kwh: number | string;
}

/** En rad ur vyn spot_prices_daily (de fält API:t läser). */
export interface DayRow {
  delivery_date: string;
  complete: boolean;
}

export interface RowQuery {
  area: ApiArea;
  /** Första tillåtna periodstart (UTC, inklusive). */
  fromUTC: string;
  /** Sista tillåtna periodstart (UTC, inklusive). */
  toUTC: string;
  /** Bara rader med resolution_minutes = 15. */
  quartersOnly: boolean;
}

export interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch-ms när fönstret släpper. */
  reset: number;
}

export interface SpotPricesDeps {
  apiKeys: () => ApiKey[];
  limit: (keyName: string) => Promise<LimitResult>;
  loadRows: (q: RowQuery) => Promise<PriceRow[]>;
  loadDays: (area: ApiArea) => Promise<DayRow[]>;
  /** Dagens svenska datum, "YYYY-MM-DD". */
  today: () => string;
  log: (line: string) => void;
}

// ─── Autentisering ────────────────────────────────────────────────────────────

/** "namn:nyckel,namn:nyckel" → nycklar. Tomma och felformade poster hoppas över. */
export function parseApiKeys(raw: string | undefined): ApiKey[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => {
      const i = entry.indexOf(":");
      if (i <= 0) return null;
      const name = entry.slice(0, i).trim();
      const key = entry.slice(i + 1).trim();
      return name && key ? { name, key } : null;
    })
    .filter((k): k is ApiKey => k !== null);
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Nyckelns namn om Authorization-headern bär en giltig Bearer-nyckel, annars null.
 * Jämför SHA-256 av nycklarna med timingSafeEqual (samma längd oavsett indata)
 * och går igenom alla nycklar utan att avbryta tidigt.
 */
export function authenticate(header: string | null, keys: ApiKey[]): string | null {
  const match = header?.match(/^Bearer\s+(\S+)\s*$/i);
  if (!match) return null;
  const given = sha256(match[1]);
  let found: string | null = null;
  for (const k of keys) {
    if (timingSafeEqual(given, sha256(k.key)) && found === null) found = k.name;
  }
  return found;
}

// ─── Validering ───────────────────────────────────────────────────────────────

export interface SpotPricesParams {
  area: ApiArea;
  from: string;
  to: string;
  resolution: Resolution;
}

type Parsed = { ok: true; value: SpotPricesParams } | { ok: false; error: string };

/** Giltigt kalenderdatum "YYYY-MM-DD" (avvisar t.ex. 2026-02-30). */
function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseParams(search: URLSearchParams): Parsed {
  const area = search.get("area");
  if (!area) return { ok: false, error: "Parametern area saknas. Tillåtna värden: SE1, SE2, SE3, SE4." };
  if (!(API_AREAS as readonly string[]).includes(area)) {
    return { ok: false, error: `Ogiltigt area "${area}". Tillåtna värden: SE1, SE2, SE3, SE4.` };
  }

  const from = search.get("from");
  const to = search.get("to");
  if (!from) return { ok: false, error: "Parametern from saknas (YYYY-MM-DD)." };
  if (!to) return { ok: false, error: "Parametern to saknas (YYYY-MM-DD)." };
  if (!isIsoDate(from)) return { ok: false, error: `Ogiltigt from "${from}". Ange ett datum som YYYY-MM-DD.` };
  if (!isIsoDate(to)) return { ok: false, error: `Ogiltigt to "${to}". Ange ett datum som YYYY-MM-DD.` };
  if (to < from) return { ok: false, error: `to (${to}) får inte vara före from (${from}).` };

  const res = search.get("resolution") ?? "hour";
  if (res !== "hour" && res !== "quarter") {
    return { ok: false, error: `Ogiltig resolution "${res}". Tillåtna värden: hour, quarter.` };
  }

  const days = daysBetween(from, to) + 1;
  if (days > MAX_DAYS[res]) {
    return {
      ok: false,
      error: `Intervallet är ${days} dygn. Högst ${MAX_DAYS[res]} dygn per anrop med resolution=${res}.`,
    };
  }
  if (res === "quarter" && from < QUARTER_FROM) {
    return {
      ok: false,
      error: `Kvartspriser finns från ${QUARTER_FROM}. Använd resolution=hour för tidigare dygn.`,
    };
  }

  return { ok: true, value: { area: area as ApiArea, from, to, resolution: res } };
}

// ─── Tider ────────────────────────────────────────────────────────────────────

const STOCKHOLM = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const pad = (n: number) => String(n).padStart(2, "0");

/** Tidpunkt → svensk lokal tid med offset, "2024-01-01T00:00:00+01:00". */
export function toStockholmISO(ms: number): string {
  const p: Record<string, string> = {};
  for (const part of STOCKHOLM.formatToParts(new Date(ms))) p[part.type] = part.value;
  const hour = Number(p.hour) % 24; // en-GB kan ge "24" vid midnatt
  const local = `${p.year}-${p.month}-${p.day}T${pad(hour)}:${p.minute}:${p.second}`;
  const offsetMin = Math.round((Date.parse(`${local}Z`) - ms) / 60_000);
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return `${local}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// ─── Priser ───────────────────────────────────────────────────────────────────

export interface ApiPrice {
  start: string;
  end: string;
  ore_per_kwh: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Rader (i tidsordning) → svarets prices.
 * - quarter: kvartsraderna som de är.
 * - hour: timrader (före 2025-10-01) som de är, kvartsrader blir timsnitt via
 *   quartersToHours (gruppering på UTC-timme → 23/24/25 timmar per dygn).
 */
export function buildPrices(rows: PriceRow[], resolution: Resolution): ApiPrice[] {
  const sorted = [...rows].sort((a, b) => Date.parse(a.delivery_period_start) - Date.parse(b.delivery_period_start));

  if (resolution === "quarter") {
    return sorted
      .filter((r) => r.resolution_minutes === 15)
      .map((r) => {
        const start = Date.parse(r.delivery_period_start);
        return {
          start: toStockholmISO(start),
          end: toStockholmISO(start + QUARTER_MS),
          ore_per_kwh: round2(Number(r.ore_per_kwh)),
        };
      });
  }

  const hours: { startMs: number; price: ApiPrice }[] = [];
  const quarters: Quarter[] = [];
  for (const r of sorted) {
    const startMs = Date.parse(r.delivery_period_start);
    if (r.resolution_minutes === 60) {
      hours.push({
        startMs,
        price: {
          start: toStockholmISO(startMs),
          end: toStockholmISO(Date.parse(r.delivery_period_end)),
          ore_per_kwh: round2(Number(r.ore_per_kwh)),
        },
      });
    } else if (r.resolution_minutes === 15) {
      // quartersToHours använder startUTC och ore; hour/minute bara till etiketter.
      quarters.push({ startUTC: new Date(startMs).toISOString(), hour: 0, minute: 0, ore: Number(r.ore_per_kwh) });
    }
  }
  for (const h of quartersToHours(quarters, 2)) {
    const startMs = Date.parse(h.startUTC);
    hours.push({
      startMs,
      price: { start: toStockholmISO(startMs), end: toStockholmISO(Date.parse(h.endUTC)), ore_per_kwh: h.ore_per_kwh },
    });
  }
  return hours.sort((a, b) => a.startMs - b.startMs).map((h) => h.price);
}

// ─── Täckning ─────────────────────────────────────────────────────────────────

export interface Coverage {
  from: string;
  /** Senaste fullständiga dygnet för området, null om inget finns. */
  to: string | null;
  quarter_from: string;
  /** Dygn från COVERAGE_FROM till och med `to` utan fullständig data. */
  missing_days: string[];
}

export function buildCoverage(days: DayRow[]): Coverage {
  const complete = new Set(days.filter((d) => d.complete).map((d) => d.delivery_date));
  const to = Array.from(complete).sort().at(-1) ?? null;
  const missing: string[] = [];
  if (to) {
    for (let d = COVERAGE_FROM; d <= to; d = addDays(d, 1)) {
      if (!complete.has(d)) missing.push(d);
    }
  }
  return { from: COVERAGE_FROM, to, quarter_from: QUARTER_FROM, missing_days: missing };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

const NO_STORE = "private, no-store";
const ONE_DAY = "private, max-age=86400";

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": NO_STORE, ...headers },
  });
}

export function createSpotPricesHandler(deps: SpotPricesDeps) {
  return async function GET(request: Request): Promise<Response> {
    const t0 = Date.now();
    const url = new URL(request.url);
    let client = "-";
    const done = (res: Response, extra = "") => {
      // Aldrig nyckeln — bara dess namn.
      deps.log(
        `[api/v1/spot-prices] client=${client} status=${res.status} ` +
          `query=${JSON.stringify(url.search)} ms=${Date.now() - t0}${extra ? ` ${extra}` : ""}`,
      );
      return res;
    };

    // ── 401
    const keys = deps.apiKeys();
    if (keys.length === 0) deps.log("[api/v1/spot-prices] API_KEYS saknas eller är tom — alla anrop nekas");
    const name = authenticate(request.headers.get("authorization"), keys);
    if (!name) {
      return done(
        json({ error: "Saknad eller ogiltig API-nyckel. Skicka Authorization: Bearer <nyckel>." }, 401, {
          "WWW-Authenticate": 'Bearer realm="elpris.ai"',
        }),
      );
    }
    client = name;

    // ── 429 (släpper igenom om Upstash inte svarar: bara kända nycklar kommer hit)
    let rl: LimitResult | null = null;
    try {
      rl = await deps.limit(name);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      deps.log(`[api/v1/spot-prices] client=${client} rate limit otillgänglig — släpper igenom: ${msg}`);
    }
    const rlHeaders: Record<string, string> = rl
      ? {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(Math.max(0, rl.remaining)),
        }
      : {};
    if (rl && !rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      return done(
        json({ error: `För många anrop. Högst ${RATE_LIMIT_PER_MINUTE} per minut och nyckel.` }, 429, {
          ...rlHeaders,
          "Retry-After": String(retryAfter),
        }),
      );
    }

    // ── 400
    const parsed = parseParams(url.searchParams);
    if (!parsed.ok) return done(json({ error: parsed.error }, 400, rlHeaders));
    const { area, from, to, resolution } = parsed.value;

    // ── 200
    try {
      const [rows, days] = await Promise.all([
        deps.loadRows({
          area,
          fromUTC: stockholmDayUTCRange(from).from,
          toUTC: stockholmDayUTCRange(to).to,
          quartersOnly: resolution === "quarter",
        }),
        deps.loadDays(area),
      ]);
      const prices = buildPrices(rows, resolution);
      const body = {
        area,
        resolution,
        unit: "öre/kWh exkl. moms",
        source: "elpris.ai",
        coverage: buildCoverage(days),
        prices,
      };
      const cache = to >= deps.today() ? NO_STORE : ONE_DAY;
      return done(json(body, 200, { ...rlHeaders, "Cache-Control": cache }), `prices=${prices.length}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      deps.log(`[api/v1/spot-prices] client=${client} läsfel: ${msg}`);
      return done(json({ error: "Prisdata kunde inte läsas just nu. Försök igen om en stund." }, 503, rlHeaders));
    }
  };
}
