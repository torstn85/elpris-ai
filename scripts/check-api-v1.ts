// Kontrollerar GET /api/v1/spot-prices mot kontraktet i docs/api-v1.md.
//
// Standard (offline): kör route-handlern direkt med fixturer från
// elprisetjustnu.se (scripts/fixtures) som databas och en rate limiter i minnet.
// Inget nätverk, ingen Supabase, ingen Upstash.
//
// --live <bas-url>: samma kontroller via HTTP mot en riktig server. Nyckeln läses
// ur miljövariabeln API_KEY (själva nyckeln, inte "namn:nyckel"). 429-testet
// förbrukar nyckelns kvot för en minut och körs därför bara med --with-429.
//
// Användning:
//   npm run test:api-v1
//   API_KEY=… npm run test:api-v1 -- --live http://localhost:3000
//   API_KEY=… npm run test:api-v1 -- --live https://elpris.ai --with-429
//
// Avslutar med exit 1 om något inte stämmer.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSpotPriceRows, type ElprisetjustnuEntry } from '../src/lib/prices/spotRows';
import {
  buildCoverage,
  createSpotPricesHandler,
  RATE_LIMIT_PER_MINUTE,
  type ApiArea,
  type ApiPrice,
  type DayRow,
  type LimitResult,
  type PriceRow,
  type SpotPricesDeps,
} from '../src/lib/api/v1/spotPrices';

const argv = process.argv.slice(2);
const liveIdx = argv.indexOf('--live');
const LIVE_URL = liveIdx >= 0 ? argv[liveIdx + 1] : null;
const WITH_429 = !LIVE_URL || argv.includes('--with-429');

// ─── Offline: fixturer som databas ────────────────────────────────────────────

const FIXTURES = join(__dirname, 'fixtures');
const TEST_KEY = 'test-nyckel-0123456789abcdef';
const OFFLINE_TODAY = '2026-11-25';

function fixtureRows(area: ApiArea): PriceRow[] {
  const rows: PriceRow[] = [];
  for (const file of readdirSync(FIXTURES).sort()) {
    const m = file.match(/^elprisetjustnu-(\d{4}-\d{2}-\d{2})_(SE\d)\.json$/);
    if (!m || m[2] !== area) continue;
    const entries: ElprisetjustnuEntry[] = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
    for (const r of toSpotPriceRows(area, entries)) {
      rows.push({
        delivery_period_start: new Date(r.delivery_period_start).toISOString(),
        delivery_period_end: new Date(r.delivery_period_end).toISOString(),
        resolution_minutes: (Date.parse(r.delivery_period_end) - Date.parse(r.delivery_period_start)) / 60_000,
        ore_per_kwh: r.ore_per_kwh,
      });
    }
  }
  return rows;
}

function memoryLimiter(max: number) {
  const hits = new Map<string, number[]>();
  return async (name: string): Promise<LimitResult> => {
    const now = Date.now();
    const list = (hits.get(name) ?? []).filter((t) => t > now - 60_000);
    const success = list.length < max;
    if (success) list.push(now);
    hits.set(name, list);
    return { success, limit: max, remaining: max - list.length, reset: (list[0] ?? now) + 60_000 };
  };
}

const logs: string[] = [];
const offlineDeps: SpotPricesDeps = {
  apiKeys: () => [
    { name: 'cajoto', key: TEST_KEY },
    { name: 'annan', key: 'en-annan-nyckel' },
  ],
  limit: memoryLimiter(RATE_LIMIT_PER_MINUTE),
  loadRows: async (q) =>
    fixtureRows(q.area).filter(
      (r) =>
        r.delivery_period_start >= q.fromUTC &&
        r.delivery_period_start <= q.toUTC &&
        (!q.quartersOnly || r.resolution_minutes === 15),
    ),
  loadDays: async (): Promise<DayRow[]> => [],
  today: () => OFFLINE_TODAY,
  log: (line) => logs.push(line),
};
const handler = createSpotPricesHandler(offlineDeps);

// ─── Anrop (offline eller live) ───────────────────────────────────────────────

const KEY = LIVE_URL ? process.env.API_KEY : TEST_KEY;
if (LIVE_URL && !KEY) {
  console.error('--live kräver API_KEY i miljön.');
  process.exit(1);
}

interface Result {
  status: number;
  headers: Headers;
  body: any;
}

async function call(query: string, auth: string | null = `Bearer ${KEY}`): Promise<Result> {
  const path = `/api/v1/spot-prices?${query}`;
  const headers: Record<string, string> = auth ? { Authorization: auth } : {};
  const res = LIVE_URL
    ? await fetch(new URL(path, LIVE_URL), { headers, cache: 'no-store' })
    : await handler(new Request(`http://offline${path}`, { headers }));
  return { status: res.status, headers: res.headers, body: await res.json() };
}

let failed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function expectError(query: string, status: number, auth?: string | null) {
  const r = await call(query, auth === undefined ? `Bearer ${KEY}` : auth);
  assert.equal(r.status, status, `status för ?${query}: ${JSON.stringify(r.body)}`);
  assert.equal(typeof r.body.error, 'string', 'body.error ska vara en sträng');
  assert.ok(r.body.error.length > 10, 'felmeddelandet ska vara tydligt');
  assert.match(r.headers.get('cache-control') ?? '', /^private, no-store$/);
}

async function prices(query: string): Promise<ApiPrice[]> {
  const r = await call(query);
  assert.equal(r.status, 200, `status för ?${query}: ${JSON.stringify(r.body)}`);
  assert.ok(Array.isArray(r.body.prices), 'prices ska vara en lista');
  return r.body.prices;
}

const OFFSET_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0[12]:00$/;

function assertContinuous(list: ApiPrice[], stepMin: number) {
  for (const p of list) {
    assert.match(p.start, OFFSET_ISO, `start ${p.start}`);
    assert.match(p.end, OFFSET_ISO, `end ${p.end}`);
    assert.equal((Date.parse(p.end) - Date.parse(p.start)) / 60_000, stepMin, `längd ${p.start}`);
    assert.equal(typeof p.ore_per_kwh, 'number');
    assert.equal(Math.round(p.ore_per_kwh * 100) / 100, p.ore_per_kwh, `högst två decimaler: ${p.ore_per_kwh}`);
  }
  for (let i = 1; i < list.length; i++) assert.equal(list[i].start, list[i - 1].end, `lucka vid ${list[i].start}`);
}

// ─── Kontroller ───────────────────────────────────────────────────────────────

async function main() {
  console.log(LIVE_URL ? `\nLive mot ${LIVE_URL}` : '\nOffline (fixturer, rate limiter i minnet)');

  console.log('\n401');
  await check('ingen Authorization', () => expectError('area=SE3&from=2024-01-01&to=2024-01-01', 401, null));
  await check('fel nyckel', () => expectError('area=SE3&from=2024-01-01&to=2024-01-01', 401, 'Bearer fel-nyckel'));
  await check('nyckel utan Bearer', () => expectError('area=SE3&from=2024-01-01&to=2024-01-01', 401, `${KEY}`));
  await check('nyckeln med ett tecken för mycket', () =>
    expectError('area=SE3&from=2024-01-01&to=2024-01-01', 401, `Bearer ${KEY}x`),
  );

  console.log('\n400');
  await check('fel area', () => expectError('area=SE5&from=2024-01-01&to=2024-01-01', 400));
  await check('area saknas', () => expectError('from=2024-01-01&to=2024-01-01', 400));
  await check('fel datumformat', () => expectError('area=SE3&from=2024-1-1&to=2024-01-02', 400));
  await check('ogiltigt datum (2025-02-30)', () => expectError('area=SE3&from=2025-02-28&to=2025-02-30', 400));
  await check('to saknas', () => expectError('area=SE3&from=2024-01-01', 400));
  await check('to < from', () => expectError('area=SE3&from=2024-01-02&to=2024-01-01', 400));
  await check('fel resolution', () => expectError('area=SE3&from=2026-01-01&to=2026-01-01&resolution=day', 400));
  await check('hour: 367 dygn', () => expectError('area=SE3&from=2024-01-01&to=2025-01-01', 400));
  await check('quarter: 94 dygn', () =>
    expectError('area=SE3&from=2026-01-01&to=2026-04-04&resolution=quarter', 400),
  );
  await check('quarter före 2025-10-01', () =>
    expectError('area=SE3&from=2025-09-30&to=2025-10-01&resolution=quarter', 400),
  );

  console.log('\nGränser som ska godtas');
  await check('hour: 366 dygn (skottår 2024)', async () => {
    const r = await call('area=SE3&from=2024-01-01&to=2024-12-31');
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });
  await check('quarter: 93 dygn', async () => {
    const r = await call('area=SE3&from=2026-01-01&to=2026-04-03&resolution=quarter');
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });

  console.log('\nSvarets form');
  await check('fält, enhet, täckning och Cache-Control för passerade dygn', async () => {
    const r = await call('area=SE3&from=2025-10-26&to=2025-10-26');
    assert.equal(r.status, 200);
    assert.equal(r.body.area, 'SE3');
    assert.equal(r.body.resolution, 'hour');
    assert.equal(r.body.unit, 'öre/kWh exkl. moms');
    assert.equal(r.body.source, 'elpris.ai');
    assert.equal(r.body.coverage.from, '2021-11-01');
    assert.equal(r.body.coverage.quarter_from, '2025-10-01');
    assert.ok(Array.isArray(r.body.coverage.missing_days));
    assert.equal(r.headers.get('cache-control'), 'private, max-age=86400');
  });
  if (!LIVE_URL) {
    await check('Cache-Control no-store när intervallet når i dag', async () => {
      const r = await call(`area=SE3&from=2026-11-20&to=${OFFLINE_TODAY}`);
      assert.equal(r.status, 200);
      assert.equal(r.headers.get('cache-control'), 'private, no-store');
    });
    await check('coverage.to och missing_days', async () => {
      const days: DayRow[] = [
        { delivery_date: '2021-11-01', complete: true },
        { delivery_date: '2021-11-02', complete: true },
        { delivery_date: '2021-11-04', complete: false },
        { delivery_date: '2021-11-05', complete: true },
        { delivery_date: '2021-11-06', complete: false },
      ];
      assert.deepEqual(buildCoverage(days), {
        from: '2021-11-01',
        to: '2021-11-05',
        quarter_from: '2025-10-01',
        missing_days: ['2021-11-03', '2021-11-04'],
      });
    });
  }

  console.log('\nOmställningsdygn');
  await check('2022-10-30 hour = 25 timmar (timrader)', async () => {
    const p = await prices('area=SE3&from=2022-10-30&to=2022-10-30');
    assert.equal(p.length, 25);
    assertContinuous(p, 60);
    assert.equal(p[0].start, '2022-10-30T00:00:00+02:00');
    assert.equal(p[2].start, '2022-10-30T02:00:00+02:00');
    assert.equal(p[3].start, '2022-10-30T02:00:00+01:00');
  });
  await check('2024-03-31 hour = 23 timmar (timrader)', async () => {
    const p = await prices('area=SE3&from=2024-03-31&to=2024-03-31');
    assert.equal(p.length, 23);
    assertContinuous(p, 60);
  });
  await check('2025-10-26 hour = 25 timmar', async () => {
    const p = await prices('area=SE3&from=2025-10-26&to=2025-10-26');
    assert.equal(p.length, 25);
    assertContinuous(p, 60);
    assert.equal(p[0].start, '2025-10-26T00:00:00+02:00');
    assert.equal(p[2].start, '2025-10-26T02:00:00+02:00');
    assert.equal(p[3].start, '2025-10-26T02:00:00+01:00');
    assert.equal(p[24].end, '2025-10-27T00:00:00+01:00');
  });
  await check('2026-03-29 hour = 23 timmar', async () => {
    const p = await prices('area=SE3&from=2026-03-29&to=2026-03-29');
    assert.equal(p.length, 23);
    assertContinuous(p, 60);
    assert.equal(p[1].end, '2026-03-29T03:00:00+02:00');
  });
  await check('2026-10-25 quarter = 100 kvartar', async () => {
    const p = await prices('area=SE3&from=2026-10-25&to=2026-10-25&resolution=quarter');
    assert.equal(p.length, 100);
    assertContinuous(p, 15);
    assert.equal(p[0].start, '2026-10-25T00:00:00+02:00');
    assert.equal(p[99].end, '2026-10-26T00:00:00+01:00');
  });

  console.log('\nTimsnitt = snitt av kvartarna');
  for (const day of ['2025-10-26', '2026-03-29', '2026-10-25']) {
    await check(`SE3 ${day}`, async () => {
      const hours = await prices(`area=SE3&from=${day}&to=${day}`);
      const quarters = await prices(`area=SE3&from=${day}&to=${day}&resolution=quarter`);
      assert.ok(quarters.length >= 92);
      for (const h of hours) {
        const inHour = quarters.filter(
          (q) => Date.parse(q.start) >= Date.parse(h.start) && Date.parse(q.start) < Date.parse(h.end),
        );
        assert.equal(inHour.length, 4, `${h.start}: kvartar i timmen`);
        const mean = inHour.reduce((s, q) => s + q.ore_per_kwh, 0) / 4;
        assert.ok(Math.abs(h.ore_per_kwh - mean) <= 0.005 + 1e-9, `${h.start}: ${h.ore_per_kwh} ≠ ${mean}`);
      }
    });
  }

  if (WITH_429) {
    console.log('\n429');
    await check(`fler än ${RATE_LIMIT_PER_MINUTE} anrop inom en minut ger 429 med Retry-After`, async () => {
      let last: Result | null = null;
      for (let i = 0; i < RATE_LIMIT_PER_MINUTE + 5; i++) {
        last = await call('area=SE3&from=2026-10-25&to=2026-10-25');
        if (last.status === 429) break;
      }
      assert.equal(last!.status, 429, 'ingen 429 trots fler anrop än gränsen');
      const retry = Number(last!.headers.get('retry-after'));
      assert.ok(Number.isInteger(retry) && retry >= 1 && retry <= 60, `Retry-After = ${retry}`);
      assert.equal(typeof last!.body.error, 'string');
    });
    if (!LIVE_URL) {
      await check('gränsen gäller per nyckel', async () => {
        const r = await call('area=SE3&from=2026-10-25&to=2026-10-25', 'Bearer en-annan-nyckel');
        assert.equal(r.status, 200);
      });
    }
  } else {
    console.log('\n429 hoppas över (lägg till --with-429; förbrukar nyckelns kvot en minut)');
  }

  if (!LIVE_URL) {
    console.log('\nLoggning');
    await check('loggar nyckelns namn, aldrig nyckeln', async () => {
      assert.ok(logs.some((l) => l.includes('client=cajoto')));
      assert.ok(logs.every((l) => !l.includes(TEST_KEY) && !l.includes('en-annan-nyckel')));
    });
  }

  console.log(failed ? `\n${failed} kontroll(er) misslyckades.` : '\nAlla kontroller OK.');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
