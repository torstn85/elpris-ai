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

if (failed > 0) {
  console.error(`\n${failed} av ${CASES.length} fall misslyckades.`);
  process.exit(1);
}
console.log(`\nAlla ${CASES.length} fall OK.`);
