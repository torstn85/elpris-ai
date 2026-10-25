// Kontrollerar klockslagsetiketterna i src/lib/prices/dstLabels.ts mot sparade
// svar från elprisetjustnu.se (scripts/fixtures):
//   2026-10-25 — vintertid börjar, 100 kvartar, klocktimmen 02 två gånger
//   2026-03-29 — sommartid börjar, 92 kvartar, klocktimmen 02 saknas
//
// Verifierar kvartsetiketterna (tooltip), "kl HH:MM"-formen (sammanfattningar)
// och att timtabellens etiketter (quartersToHours) använder samma märkning.
//
// Användning:
//   npx tsx scripts/check-dst-labels.ts
//
// Avslutar med exit 1 om något inte stämmer.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toQuarters } from '../src/lib/prices/quarters';
import { quartersToHours } from '../src/lib/prices/hourly';
import { dstKind, formatClockDst, isRepeatedClock, quarterRangeLabel } from '../src/lib/prices/dstLabels';

const AREAS = ['SE1', 'SE2', 'SE3', 'SE4'] as const;

function quarters(date: string, area: string) {
  const raw: { SEK_per_kWh: number; time_start: string }[] = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `elprisetjustnu-${date}_${area}.json`), 'utf8'),
  );
  return toQuarters(date, raw.map((e) => ({ start: e.time_start, ore: Math.round(e.SEK_per_kWh * 10000) / 100 })));
}

let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

// ── 2026-10-25: 100 kvartar, 02-timmen två gånger ────────────────────────────
for (const area of AREAS) {
  const q = quarters('2026-10-25', area);

  check(`2026-10-25 ${area}: 100 kvartar, etiketter kring 02`, () => {
    assert.equal(q.length, 100);
    const labels = q.map((x) => quarterRangeLabel(x.startUTC));
    // Index 7–16: 01:45 … 03:00. 8–11 sommartid, 12–15 normaltid.
    assert.deepEqual(labels.slice(7, 17), [
      '01:45–02:00',
      '02:00–02:15 (sommartid)',
      '02:15–02:30 (sommartid)',
      '02:30–02:45 (sommartid)',
      '02:45–03:00 (sommartid)',
      '02:00–02:15 (normaltid)',
      '02:15–02:30 (normaltid)',
      '02:30–02:45 (normaltid)',
      '02:45–03:00 (normaltid)',
      '03:00–03:15',
    ]);
    assert.equal(labels[0], '00:00–00:15');
    assert.equal(labels[99], '23:45–00:00');
    assert.equal(new Set(labels).size, 100, 'varje kvart ska ha en unik etikett');
    assert.equal(q.filter((x) => isRepeatedClock(x.startUTC)).length, 8, 'åtta kvartar i dubbla timmen');
  });

  check(`2026-10-25 ${area}: "kl HH:MM" för sammanfattningar`, () => {
    assert.equal(formatClockDst(q[10].startUTC), '02:30 (sommartid)');
    assert.equal(formatClockDst(q[14].startUTC), '02:30 (normaltid)');
    assert.equal(formatClockDst(q[7].startUTC), '01:45');
    assert.equal(formatClockDst(q[16].startUTC), '03:00');
  });

  check(`2026-10-25 ${area}: timtabellen märker samma timmar`, () => {
    const hours = quartersToHours(q);
    assert.equal(hours.length, 25);
    assert.deepEqual(
      hours.filter((h) => h.dst).map((h) => [h.label, h.dst]),
      [
        ['02:00–03:00 (sommartid)', 'summer'],
        ['02:00–03:00 (normaltid)', 'winter'],
      ],
    );
    for (const h of hours) assert.equal(h.dst, dstKind(h.startUTC), `${h.label}: dst ska följa dstKind`);
  });
}

// ── 2026-03-29: 92 kvartar, ingen dubbel timme ───────────────────────────────
for (const area of AREAS) {
  const q = quarters('2026-03-29', area);
  check(`2026-03-29 ${area}: 92 kvartar, inga sommartid/normaltid-etiketter`, () => {
    assert.equal(q.length, 92);
    const labels = q.map((x) => quarterRangeLabel(x.startUTC));
    assert.ok(labels.every((l) => !l.includes('(')), 'inga parenteser på våren');
    assert.deepEqual(labels.slice(7, 9), ['01:45–02:00', '03:00–03:15']);
    assert.ok(q.every((x) => formatClockDst(x.startUTC).length === 5));
  });
}

if (failed > 0) {
  console.error(`\n${failed} kontroll(er) misslyckades.`);
  process.exit(1);
}
console.log('\nAlla kontroller OK.');
