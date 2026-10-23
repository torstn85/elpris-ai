// Kontrollerar toSpotPriceRows (src/lib/prices/spotRows.ts) mot sparade svar
// från elprisetjustnu.se (scripts/fixtures) för omställningsdygnen:
//   2025-10-26 — vintertid börjar, kvartar, 100 rader (källan: 02:45+02:00 → 03:00+01:00)
//   2026-03-29 — sommartid börjar, kvartar, 92 rader
//   2022-10-30 — vintertid börjar, timmar, 25 rader (källan: 02:00+02:00 → 03:00+01:00)
//   2024-03-31 — sommartid börjar, timmar, 23 rader
//
// Verifierar att alla perioder blir 15 resp. 60 min, utan luckor eller
// överlapp över hela det svenska kalenderdygnet, att starttider och öre-värden
// är oförändrade, och att bara källans felaktiga sluttid rättas.
//
// Användning:
//   npx tsx scripts/check-spotrows.ts
//
// Avslutar med exit 1 om något inte stämmer.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSpotPriceRows, type ElprisetjustnuEntry } from '../src/lib/prices/spotRows';
import { stockholmDayUTCRange } from '../src/lib/time';
import { addDays } from '../src/lib/dates';

const AREAS = ['SE1', 'SE2', 'SE3', 'SE4'] as const;
const MIN = 60_000;
const DAYS = [
  { date: '2025-10-26', label: 'vintertid börjar, kvartar', rows: 100, minutes: 15, corrected: 1 },
  { date: '2026-03-29', label: 'sommartid börjar, kvartar', rows: 92, minutes: 15, corrected: 0 },
  { date: '2022-10-30', label: 'vintertid börjar, timmar', rows: 25, minutes: 60, corrected: 1 },
  { date: '2024-03-31', label: 'sommartid börjar, timmar', rows: 23, minutes: 60, corrected: 0 },
];

function fixture(date: string, area: string): ElprisetjustnuEntry[] {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', `elprisetjustnu-${date}_${area}.json`), 'utf8'));
}

let failed = 0;

for (const d of DAYS) {
  try {
    const dayStart = Date.parse(stockholmDayUTCRange(d.date).from);
    const dayEnd = Date.parse(stockholmDayUTCRange(addDays(d.date, 1)).from);

    for (const area of AREAS) {
      const raw = fixture(d.date, area);
      const rows = toSpotPriceRows(area, raw);

      assert.equal(rows.length, d.rows, `${area}: antal rader`);

      let prevEnd = dayStart;
      rows.forEach((r, i) => {
        const start = Date.parse(r.delivery_period_start);
        const end = Date.parse(r.delivery_period_end);
        assert.equal(start, prevEnd, `${area} rad ${i + 1}: lucka eller överlapp vid ${r.delivery_period_start}`);
        assert.equal((end - start) / MIN, d.minutes, `${area} rad ${i + 1}: periodlängd`);
        assert.equal(r.area, area, `${area} rad ${i + 1}: område`);
        assert.equal(r.delivery_period_start, raw[i].time_start, `${area} rad ${i + 1}: starttid ändrad`);
        assert.equal(r.sek_per_kwh, raw[i].SEK_per_kWh, `${area} rad ${i + 1}: SEK ändrat`);
        assert.equal(r.ore_per_kwh, Math.round(raw[i].SEK_per_kWh * 10000) / 100, `${area} rad ${i + 1}: öre ändrat`);
        prevEnd = end;
      });
      assert.equal(prevEnd, dayEnd, `${area}: dygnet slutar inte vid nästa dygns 00:00`);

      // Bara källans felaktiga sluttid (sista perioden före normaltid) rättas.
      const corrected = rows.filter((r, i) => r.delivery_period_end !== raw[i].time_end);
      assert.equal(corrected.length, d.corrected, `${area}: antal rättade sluttider`);
    }

    console.log(`✓ ${d.date} (${d.label}): ${d.rows} rader × ${AREAS.length} områden, alla ${d.minutes} min, ${d.corrected} rättad sluttid per område`);
  } catch (err) {
    failed++;
    console.error(`✗ ${d.date} (${d.label}): ${err instanceof Error ? err.message : err}`);
  }
}

// En verklig lucka i källan (här: en borttagen period) ska inte döljas.
try {
  const raw = fixture('2022-10-30', 'SE3');
  const withGap = [...raw.slice(0, 10), ...raw.slice(11)];
  const rows = toSpotPriceRows('SE3', withGap);
  assert.equal(rows[9].delivery_period_end, withGap[9].time_end, 'sluttid före luckan ska vara orörd');
  assert.notEqual(rows[9].delivery_period_end, rows[10].delivery_period_start, 'luckan ska synas');
  console.log('✓ lucka i källan lämnas orörd');
} catch (err) {
  failed++;
  console.error(`✗ lucka i källan: ${err instanceof Error ? err.message : err}`);
}

if (failed > 0) {
  console.error(`\n${failed} kontroll(er) misslyckades.`);
  process.exit(1);
}
console.log(`\nAlla ${DAYS.length + 1} kontroller OK.`);
