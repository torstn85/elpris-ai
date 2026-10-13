// Kontrollerar att stockholmDayUTCRange() ger exakt ett svenskt kalenderdygn —
// inklusive dygnen med sommar-/vintertidsomställning (92 resp. 100 kvartar).
//
// Användning:
//   npx tsx scripts/check-time.ts
//   TZ=UTC npx tsx scripts/check-time.ts        # oberoende av maskinens tidszon
//
// Avslutar med exit 1 om något fall är fel.

import assert from 'node:assert/strict';
import { stockholmDayUTCRange, stockholmISODate } from '../src/lib/time';
import { addDays } from '../src/lib/dates';
import { tomorrowISODate } from '../src/lib/prices/tomorrow';

const QUARTER_MS = 15 * 60 * 1000;

function stockholmLocal(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

const CASES: { date: string; label: string; quarters: number; fromUTC: string }[] = [
  { date: '2026-07-15', label: 'vanlig sommardag (CEST)', quarters: 96, fromUTC: '2026-07-14T22:00:00.000Z' },
  { date: '2026-12-15', label: 'vanlig vinterdag (CET)', quarters: 96, fromUTC: '2026-12-14T23:00:00.000Z' },
  { date: '2026-03-29', label: 'sommartid börjar (23 h)', quarters: 92, fromUTC: '2026-03-28T23:00:00.000Z' },
  { date: '2026-10-25', label: 'vintertid börjar (25 h)', quarters: 100, fromUTC: '2026-10-24T22:00:00.000Z' },
];

let failed = 0;
for (const c of CASES) {
  try {
    const { from, to } = stockholmDayUTCRange(c.date);
    const quarters = (new Date(to).getTime() + 1 - new Date(from).getTime()) / QUARTER_MS;

    assert.equal(from, c.fromUTC, 'from (UTC)');
    assert.equal(quarters, c.quarters, 'antal kvartar');
    assert.equal(stockholmLocal(from), `${c.date} 00:00:00`, 'from i svensk tid');
    assert.equal(stockholmLocal(to), `${c.date} 23:59:59`, 'to i svensk tid');
    // Första ögonblicket efter `to` ska vara nästa dygns midnatt.
    const after = new Date(new Date(to).getTime() + 1).toISOString();
    assert.match(stockholmLocal(after), / 00:00:00$/, 'nästa dygn börjar direkt efter to');

    console.log(`✅ ${c.date} ${c.label}: ${quarters} kvartar, ${from} → ${to}`);
  } catch (err) {
    failed++;
    console.error(`❌ ${c.date} ${c.label}: ${err instanceof Error ? err.message : err}`);
  }
}

// ─── addDays och morgondagens datum (kalenderdygn, inte nu + 24 h) ───────────

/** Kör fn med en fejkad klocka (Date.now och new Date() utan argument). */
function atInstant<T>(iso: string, fn: () => T): T {
  const RealDate = Date;
  const fixed = RealDate.parse(iso);
  class FakeDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      super(...((args.length ? args : [fixed]) as [any]));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FakeDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

const DATE_CASES: { name: string; run: () => void }[] = [
  {
    name: 'addDays över omställningsdygnen',
    run: () => {
      assert.equal(addDays('2026-10-24', 1), '2026-10-25');
      assert.equal(addDays('2026-10-25', 1), '2026-10-26');
      assert.equal(addDays('2026-03-29', -1), '2026-03-28');
      assert.equal(addDays('2026-03-28', 2), '2026-03-30');
      assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    },
  },
  {
    name: 'imorgon kl 00:30 den 25 okt (dygnet med 25 h) = 26 okt',
    run: () => atInstant('2026-10-24T22:30:00Z', () => {
      assert.equal(stockholmISODate(), '2026-10-25');
      assert.equal(tomorrowISODate(), '2026-10-26', 'nu + 24 h hade gett 2026-10-25');
    }),
  },
  {
    name: 'imorgon kl 23:30 den 25 okt = 26 okt',
    run: () => atInstant('2026-10-25T22:30:00Z', () => assert.equal(tomorrowISODate(), '2026-10-26')),
  },
  {
    name: 'imorgon kl 00:30 den 29 mars (dygnet med 23 h) = 30 mars',
    run: () => atInstant('2026-03-28T23:30:00Z', () => assert.equal(tomorrowISODate(), '2026-03-30')),
  },
  {
    name: 'imorgon kl 23:30 den 29 mars = 30 mars',
    run: () => atInstant('2026-03-29T21:30:00Z', () => assert.equal(tomorrowISODate(), '2026-03-30')),
  },
];

for (const c of DATE_CASES) {
  try {
    c.run();
    console.log(`✅ ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`❌ ${c.name}: ${err instanceof Error ? err.message : err}`);
  }
}

const total = CASES.length + DATE_CASES.length;
if (failed > 0) {
  console.error(`\n${failed} av ${total} fall misslyckades.`);
  process.exit(1);
}
console.log(`\nAlla ${total} fall OK (maskinens TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}).`);
