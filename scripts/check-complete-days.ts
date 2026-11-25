// Kontrollerar completeAreas (src/lib/prices/completeDays.ts), som avgör om
// /api/cron/fetch-prices kan hoppa över ett dygn och område. Använder sparade
// svar från elprisetjustnu.se (scripts/fixtures), via samma omvandling som
// cron-jobbet (toSpotPriceRows). Inget nätverk.
//
// Användning: npm run test:complete-days — avslutar med exit 1 vid fel.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSpotPriceRows, type ElprisetjustnuEntry, type SpotArea } from '../src/lib/prices/spotRows';
import { completeAreas, type PeriodRow } from '../src/lib/prices/completeDays';

const AREAS: SpotArea[] = ['SE1', 'SE2', 'SE3', 'SE4'];

function rows(date: string, areas: SpotArea[] = AREAS): PeriodRow[] {
  return areas.flatMap((area) => {
    const entries: ElprisetjustnuEntry[] = JSON.parse(
      readFileSync(join(__dirname, 'fixtures', `elprisetjustnu-${date}_${area}.json`), 'utf8'),
    );
    return toSpotPriceRows(area, entries);
  });
}

const sorted = (s: Set<string>) => Array.from(s).sort();
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log('\ncompleteAreas');
for (const [date, label] of [
  ['2022-10-30', 'timrader, 25 timmar'],
  ['2024-03-31', 'timrader, 23 timmar'],
  ['2025-10-26', 'kvartar, 100'],
  ['2026-03-29', 'kvartar, 92'],
  ['2026-10-25', 'kvartar, 100'],
] as const) {
  check(`${date} (${label}): alla fyra fullständiga`, () => {
    assert.deepEqual(sorted(completeAreas(rows(date), date)), AREAS);
  });
}

check('en saknad kvart gör bara det området ofullständigt', () => {
  const r = rows('2026-10-25');
  const i = r.findIndex((x) => x.area === 'SE2');
  r.splice(i + 40, 1);
  assert.deepEqual(sorted(completeAreas(r, '2026-10-25')), ['SE1', 'SE3', 'SE4']);
});

check('område utan rader saknas i svaret', () => {
  assert.deepEqual(sorted(completeAreas(rows('2026-10-25', ['SE3']), '2026-10-25')), ['SE3']);
});

check('rader från ett annat dygn räknas inte', () => {
  assert.equal(completeAreas(rows('2026-10-25'), '2026-10-26').size, 0);
  assert.equal(completeAreas(rows('2026-10-25'), '2026-10-24').size, 0);
});

check('två dygn i samma lista räknas var för sig', () => {
  const both = [...rows('2025-10-26'), ...rows('2026-03-29', ['SE1'])];
  assert.deepEqual(sorted(completeAreas(both, '2025-10-26')), AREAS);
  assert.deepEqual(sorted(completeAreas(both, '2026-03-29')), ['SE1']);
});

console.log(failed ? `\n${failed} kontroll(er) misslyckades.` : '\nAlla kontroller OK.');
process.exit(failed ? 1 : 0);
