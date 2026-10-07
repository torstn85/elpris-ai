// Kontrollerar den delade kvartslogiken (src/lib/prices/quarters.ts) på
// syntetisk data: exakt svenskt dygn, tidsordning på startUTC och rätt antal
// kvartar — inklusive dygnen med sommar-/vintertidsomställning.
//
// Användning:
//   npx tsx scripts/check-quarters.ts
//   TZ=UTC npx tsx scripts/check-quarters.ts    # oberoende av maskinens tidszon
//
// Avslutar med exit 1 om något fall är fel.

import assert from 'node:assert/strict';
import { toQuarterPoints, toQuarters } from '../src/lib/prices/quarters';
import { buildHourTicks, buildPriceTicks, formatClock } from '../src/lib/prices/quarterTicks';
import { formatSwedishDay } from '../src/lib/format/date';

const QUARTER_MS = 15 * 60 * 1000;

/** ISO med svensk offset (+01:00/+02:00), som elprisetjustnu levererar. */
function withStockholmOffset(ms: number): string {
  const d = new Date(ms);
  const local = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d).replace(' ', 'T');
  const offsetMin = Math.round((Date.parse(`${local}Z`) - ms) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}

/** Rader var 15:e minut från 21:00 UTC dagen före till 02:00 UTC dagen efter — täcker grannygnen. */
function syntheticRows(date: string): { start: string; ore: number }[] {
  const prev = new Date(`${date}T00:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const from = Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate(), 21);
  const to = Date.parse(`${date}T00:00:00Z`) + 26 * 3600 * 1000;
  const rows: { start: string; ore: number }[] = [];
  for (let t = from, i = 0; t < to; t += QUARTER_MS, i++) {
    // Varannan rad i UTC-format, varannan med svensk offset.
    rows.push({ start: i % 2 ? new Date(t).toISOString() : withStockholmOffset(t), ore: i });
  }
  // Blanda ordningen deterministiskt — laddaren ska sortera själv.
  return rows.map((r, i) => ({ r, k: (i * 7919) % rows.length })).sort((a, b) => a.k - b.k).map((x) => x.r);
}

const CASES = [
  { date: '2026-07-15', label: 'vanlig dag', quarters: 96, hours: 24 },
  { date: '2026-03-29', label: 'sommartid börjar', quarters: 92, hours: 23 },
  { date: '2026-10-25', label: 'vintertid börjar', quarters: 100, hours: 24 },
];

let failed = 0;
for (const c of CASES) {
  try {
    const q = toQuarters(c.date, syntheticRows(c.date));
    assert.equal(q.length, c.quarters, 'antal kvartar');

    for (let i = 1; i < q.length; i++) {
      assert.ok(q[i - 1].startUTC < q[i].startUTC, `tidsordning vid index ${i}`);
      assert.equal(Date.parse(q[i].startUTC) - Date.parse(q[i - 1].startUTC), QUARTER_MS, `glapp vid index ${i}`);
    }
    assert.match(q[0].startUTC, /Z$/, 'startUTC normaliserad till UTC');
    assert.deepEqual([q[0].hour, q[0].minute], [0, 0], 'första kvarten 00:00 lokal tid');
    assert.deepEqual([q.at(-1)!.hour, q.at(-1)!.minute], [23, 45], 'sista kvarten 23:45 lokal tid');
    assert.equal(new Set(q.map((x) => x.hour)).size, c.hours, 'antal lokala timmar');

    const twos = q.filter((x) => x.hour === 2);
    if (c.quarters === 92) assert.equal(twos.length, 0, '02:xx ska saknas');
    if (c.quarters === 100) {
      assert.equal(twos.length, 8, '02:xx ska finnas två gånger');
      assert.deepEqual(twos.map((x) => x.minute), [0, 15, 30, 45, 0, 15, 30, 45], 'dubbla 02:xx i startUTC-ordning');
      assert.deepEqual(
        twos.map((x) => x.startUTC.slice(11, 16)),
        ['00:00', '00:15', '00:30', '00:45', '01:00', '01:15', '01:30', '01:45'],
        'första 02:xx är CEST (00 UTC), andra CET (01 UTC)',
      );
    }

    const points = toQuarterPoints(q);
    assert.deepEqual(points.map((p) => p.start), q.map((x) => x.startUTC), 'QuarterPoint behåller ordningen');
    assert.deepEqual(points.map((p) => p.ore), q.map((x) => x.ore), 'QuarterPoint behåller priserna');

    console.log(`✓ ${c.date} (${c.label}): ${q.length} kvartar, ${c.hours} lokala timmar`);
  } catch (err) {
    failed++;
    console.error(`✗ ${c.date} (${c.label}): ${err instanceof Error ? err.message : err}`);
  }
}

// ─── buildHourTicks (kvartsdiagrammets x-axel) ───────────────────────────────

const pointsFor = (date: string) => toQuarterPoints(toQuarters(date, syntheticRows(date)));
const labels = (date: string, every: number) => {
  const p = pointsFor(date);
  return buildHourTicks(p, every).map((i) => formatClock(p[i].start));
};

const TICK_CASES: { name: string; run: () => void }[] = [
  {
    name: '96 kvartar: var 3:e timme → 8 tickar, var 6:e → 4',
    run: () => {
      const p = pointsFor('2026-07-15');
      assert.deepEqual(buildHourTicks(p, 3), [0, 12, 24, 36, 48, 60, 72, 84]);
      assert.deepEqual(labels('2026-07-15', 3), ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']);
      assert.deepEqual(buildHourTicks(p, 6), [0, 24, 48, 72]);
      assert.deepEqual(labels('2026-07-15', 6), ['00:00', '06:00', '12:00', '18:00']);
    },
  },
  {
    name: '92 kvartar: 02:00 saknas, inga dubbletter',
    run: () => {
      const every1 = labels('2026-03-29', 1);
      assert.equal(every1.length, 23);
      assert.ok(!every1.includes('02:00'), '02:00 ska saknas');
      assert.equal(new Set(every1).size, every1.length, 'dubbletter');
      const p = pointsFor('2026-03-29');
      // 00:00, 01:00, (02 saknas) 03:00 på index 8 …
      assert.deepEqual(buildHourTicks(p, 1).slice(0, 3), [0, 4, 8]);
      assert.deepEqual(buildHourTicks(p, 3), [0, 8, 20, 32, 44, 56, 68, 80]);
      assert.deepEqual(labels('2026-03-29', 6), ['00:00', '06:00', '12:00', '18:00']);
    },
  },
  {
    name: '100 kvartar: 02:00 och 03:00 en gång var, rätt index',
    run: () => {
      const p = pointsFor('2026-10-25');
      const every1 = labels('2026-10-25', 1);
      assert.equal(every1.length, 24);
      assert.equal(new Set(every1).size, 24, 'dubbletter');
      const t1 = buildHourTicks(p, 1);
      // 00:00=0, 01:00=4, 02:00 (första, CEST)=8, andra 02:00 (CET) på 12 hoppas över, 03:00=16
      assert.deepEqual(t1.slice(0, 4), [0, 4, 8, 16]);
      assert.equal(p[8].start, '2026-10-25T00:00:00.000Z', 'första 02:00 är CEST');
      assert.deepEqual(buildHourTicks(p, 3), [0, 16, 28, 40, 52, 64, 76, 88]);
      assert.deepEqual(labels('2026-10-25', 3), ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']);
    },
  },
  {
    name: 'buildPriceTicks: max 208 → 0–250 i steg om 50',
    run: () => {
      assert.deepEqual(buildPriceTicks(83.9, 208.1), { ticks: [0, 50, 100, 150, 200, 250], domain: [0, 250] });
      assert.deepEqual(buildPriceTicks(40, 200), { ticks: [0, 50, 100, 150, 200, 250], domain: [0, 250] }, 'max 200 → topp 250 (strikt över)');
      assert.deepEqual(buildPriceTicks(40, 199), { ticks: [0, 50, 100, 150, 200], domain: [0, 200] }, 'max 199 → topp 200');
    },
  },
  {
    name: 'buildPriceTicks: max 420 → steg 100',
    run: () => {
      assert.deepEqual(buildPriceTicks(40, 420), { ticks: [0, 100, 200, 300, 400, 500], domain: [0, 500] });
      assert.deepEqual(buildPriceTicks(40, 300).ticks, [0, 50, 100, 150, 200, 250, 300, 350], '300 är inte > 300: steg 50, topp strikt över');
    },
  },
  {
    name: 'buildPriceTicks: min −12 → negativ tick −50',
    run: () => {
      assert.deepEqual(buildPriceTicks(-12, 95), { ticks: [-50, 0, 50, 100], domain: [-50, 100] });
      assert.deepEqual(buildPriceTicks(-12, -3), { ticks: [-50, 0], domain: [-50, 0] }, 'bara negativa');
      assert.deepEqual(buildPriceTicks(-50, 95).domain, [-100, 100], 'min −50 → botten −100 (strikt under)');
      assert.deepEqual(buildPriceTicks(0, 0), { ticks: [0, 50], domain: [0, 50] }, 'platt dygn');
    },
  },
  {
    name: 'formatSwedishDay: 2026-10-07 → "Onsdag 7 oktober"',
    run: () => {
      assert.equal(formatSwedishDay(new Date('2026-10-07T12:00:00Z')), 'Onsdag 7 oktober');
      // Svensk tid, inte UTC: 22:30 UTC 6 okt är 00:30 den 7 okt i Sverige.
      assert.equal(formatSwedishDay(new Date('2026-10-06T22:30:00Z')), 'Onsdag 7 oktober');
    },
  },
];

for (const t of TICK_CASES) {
  try {
    t.run();
    console.log(`✓ ${t.name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${t.name}: ${err instanceof Error ? err.message : err}`);
  }
}

const total = CASES.length + TICK_CASES.length;
if (failed > 0) {
  console.error(`\n${failed} av ${total} fall misslyckades.`);
  process.exit(1);
}
console.log(`\nAlla ${total} fall OK.`);
