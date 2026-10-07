// Kontrollerar att Elduellens rensning av dagsnycklar (pruneOldDays) tar bort
// elduellen:day:{datum} äldre än 120 dagar och lämnar resten orört.
//
// Användning: npx tsx scripts/check-elduellen-storage.ts
// Avslutar med exit 1 om något fall är fel.

import assert from 'node:assert/strict';
import { addDays } from '../src/lib/elduellen/dates';

/** Minimal localStorage i minnet. */
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  keys() { return Array.from(this.m.keys()).sort(); }
}

const storage = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = { localStorage: storage };

async function main() {
  const { pruneOldDays } = await import('../src/lib/elduellen/storage');
  const today = '2026-10-08';
  const day = (n: number) => `elduellen:day:${addDays(today, -n)}`;

  storage.setItem(day(121), '{}');
  storage.setItem(day(200), '{}');
  storage.setItem(day(120), '{}');
  storage.setItem(day(119), '{}');
  storage.setItem(day(0), '{}');
  storage.setItem('elduellen:player', '"abc"');
  storage.setItem('elduellen:history', '[]');
  storage.setItem('elduellen:day:inte-ett-datum', '{}');
  storage.setItem('annan:nyckel', 'x');

  pruneOldDays(today);
  const left = storage.keys();

  let failed = 0;
  const check = (name: string, fn: () => void) => {
    try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.error(`✗ ${name}: ${e instanceof Error ? e.message : e}`); }
  };
  check(`121 dagar bakåt (${day(121)}) tas bort`, () => assert.ok(!left.includes(day(121))));
  check(`200 dagar bakåt tas bort`, () => assert.ok(!left.includes(day(200))));
  check(`120 dagar bakåt ligger kvar (samma gräns som historiken)`, () => assert.ok(left.includes(day(120))));
  check(`119 dagar bakåt (${day(119)}) ligger kvar`, () => assert.ok(left.includes(day(119))));
  check(`dagens nyckel ligger kvar`, () => assert.ok(left.includes(day(0))));
  check(`elduellen:player och elduellen:history rörs inte`, () => assert.ok(left.includes('elduellen:player') && left.includes('elduellen:history')));
  check(`nycklar utan giltigt datum och andra nycklar rörs inte`, () => assert.ok(left.includes('elduellen:day:inte-ett-datum') && left.includes('annan:nyckel')));
  check(`kastar inte när localStorage saknas`, () => {
    (globalThis as unknown as { window: unknown }).window = {};
    assert.doesNotThrow(() => pruneOldDays(today));
  });

  if (failed > 0) { console.error(`\n${failed} fall misslyckades.`); process.exit(1); }
  console.log('\nAlla fall OK.');
}
main();
