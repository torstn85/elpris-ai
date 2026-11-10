// Visar och kontrollerar timsnitten för omställningsdygnen med riktig data:
//   2025-10-26 — vintertid börjar, 100 kvartar, timmen 02 två gånger
//   2026-03-29 — sommartid börjar, 92 kvartar, timmen 02 saknas
//
// Standard: läser sparade svar från elprisetjustnu.se (scripts/fixtures) — inget
// nätverk behövs. Med --live körs dessutom hela kedjan via loadTodayPrices(datum)
// (Supabase först, elprisetjustnu.se som reserv) och jämförs med fixturerna.
//
// Användning:
//   npx tsx scripts/check-dst-days.ts
//   npx tsx scripts/check-dst-days.ts --live
//
// Avslutar med exit 1 om något inte stämmer.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toQuarters, toQuarterPoints } from '../src/lib/prices/quarters';
import { quartersToHours, type HourEntry } from '../src/lib/prices/hourly';
import { currentQuarter } from '../src/lib/prices/todaySummary';
import { msToNextQuarter, swedishDate } from '../src/lib/prices/liveClock';

const AREAS = ['SE1', 'SE2', 'SE3', 'SE4'] as const;
const DAYS = [
  { date: '2025-10-26', label: 'vintertid börjar', quarters: 100, hours: 25 },
  { date: '2026-03-29', label: 'sommartid börjar', quarters: 92, hours: 23 },
];

function fixture(date: string, area: string) {
  const raw: { SEK_per_kWh: number; time_start: string }[] = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `elprisetjustnu-${date}_${area}.json`), 'utf8'),
  );
  return toQuarters(date, raw.map((e) => ({ start: e.time_start, ore: Math.round(e.SEK_per_kWh * 10000) / 100 })));
}

const ore = (v: number) => v.toFixed(1).replace('.', ',').padStart(7);

function printTable(date: string, hours: HourEntry[]) {
  console.log(`\n  SE3 ${date}: ${hours.length} timmar`);
  console.log('  ' + 'Timme'.padEnd(28) + 'öre/kWh'.padStart(8) + '   startUTC');
  for (const h of hours) console.log('  ' + h.label.padEnd(28) + ore(h.ore_per_kwh) + '   ' + h.startUTC);
}

async function main() {
  const live = process.argv.includes('--live');
  let failed = 0;

  for (const d of DAYS) {
    console.log(`\n══ ${d.date} (${d.label}) ══`);
    try {
      const areas = Object.fromEntries(AREAS.map((a) => [a, fixture(d.date, a)])) as Record<(typeof AREAS)[number], ReturnType<typeof fixture>>;
      const hourly = Object.fromEntries(AREAS.map((a) => [a, quartersToHours(areas[a])])) as Record<(typeof AREAS)[number], HourEntry[]>;

      for (const a of AREAS) {
        assert.equal(areas[a].length, d.quarters, `${a}: kvartar`);
        assert.equal(hourly[a].length, d.hours, `${a}: timmar`);
        assert.equal(new Set(hourly[a].map((h) => h.startUTC)).size, d.hours, `${a}: unika startUTC`);
      }
      if (d.hours === 25) {
        assert.deepEqual(hourly.SE3.filter((h) => h.hour === 2).map((h) => h.label), ['02:00–03:00 (sommartid)', '02:00–03:00 (normaltid)']);
      } else {
        assert.ok(!hourly.SE3.some((h) => h.hour === 2), '02 ska saknas');
      }

      // Klientklockan (useNow): kvartsbytet räknat på epoch-tid ska träffa varje
      // kvartsstart i dygnets lista, även runt omställningen, och svenskt datum
      // ska vara dygnets för alla kvartar.
      const points = toQuarterPoints(areas.SE3);
      const midnight = Date.parse(points[points.length - 1].start) + 15 * 60_000;
      for (let i = 0; i < points.length; i++) {
        const start = Date.parse(points[i].start);
        const end = i + 1 < points.length ? Date.parse(points[i + 1].start) : midnight;
        assert.equal(end - start, 15 * 60_000, `kvart ${points[i].start}: 15 min lång`);
        for (const offset of [0, 1, 7 * 60_000, 15 * 60_000 - 1]) {
          assert.equal(start + offset + msToNextQuarter(start + offset), end, `nästa kvartsbyte från ${points[i].start} + ${offset} ms`);
          assert.equal(currentQuarter(points, start + offset)?.start, points[i].start, `pågående kvart vid ${points[i].start} + ${offset} ms`);
        }
        assert.equal(swedishDate(start), d.date, `svenskt datum för ${points[i].start}`);
      }
      assert.notEqual(swedishDate(midnight), d.date, 'midnatt hör till nästa dygn');
      console.log(`  Klientklockan: ${points.length} kvartsbyten på epoch-tid och svenskt datum stämmer ✓`);

      // Svarets form som /api/prices/today skulle ge för dygnet.
      const shape = {
        date: d.date,
        areas: Object.fromEntries(AREAS.map((a) => [a, hourly[a].length])),
        quarters: Object.fromEntries(AREAS.map((a) => [a, toQuarterPoints(areas[a]).length])),
      };
      console.log('  API-form (fixtures):', JSON.stringify(shape));
      printTable(d.date, hourly.SE3);

      if (live) {
        const { loadTodayPrices } = await import('../src/lib/prices/today');
        const t = await loadTodayPrices(d.date);
        assert.ok(t, 'loadTodayPrices gav null');
        assert.equal(t.date, d.date, 'date i ISO-format');
        assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/);
        for (const a of AREAS) {
          assert.equal(t.areas[a].length, d.hours, `live ${a}: timmar`);
          assert.equal(t.quarters[a].length, d.quarters, `live ${a}: kvartar`);
        }
        assert.deepEqual(
          t.areas.SE3.map((h) => [h.label, h.ore_per_kwh]),
          hourly.SE3.map((h) => [h.label, h.ore_per_kwh]),
          'live-kedjan ska ge samma timmar som fixturerna',
        );
        console.log(`  --live: loadTodayPrices("${d.date}") källa=${t.source}, samma ${d.hours} timmar och priser som fixturerna ✓`);
      }
      console.log(`  ✓ ${d.date}: ${d.quarters} kvartar → ${d.hours} timmar i alla fyra områden`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${d.date}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} av ${DAYS.length} dygn misslyckades.`);
    process.exit(1);
  }
  console.log(`\nAlla ${DAYS.length} dygn OK${live ? ' (fixtures + live)' : ' (fixtures)'}.`);
}
main();
