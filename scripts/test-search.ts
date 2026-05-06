// Verifiera retrieval-kvalitet mot 6 typiska frågor (eller 2 med --quick).
// Kör: npx tsx scripts/test-search.ts            (alla 6, ~2 min 12s)
//      npx tsx scripts/test-search.ts --quick    (a + b, ~22s)

import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

import { searchKnowledge } from '../src/lib/rag/search';

const RATE_LIMIT_DELAY_MS = 22_000;

interface QueryCase {
  q: string;
  expectedSlug: string | null; // null = bredare fråga, ingen specifik förväntan
  note?: string;
}

const QUERIES: QueryCase[] = [
  { q: 'vad är spotpris?', expectedSlug: 'vad-ar-spotpris' },
  { q: 'när är det billigast att tvätta?', expectedSlug: 'tvatta-billigt' },
  { q: 'hur fungerar effekttariffer?', expectedSlug: 'effekttariffer-undvika-toppar' },
  { q: 'vad kostar el i Sverige?', expectedSlug: null, note: 'bred fråga' },
  { q: 'är det billigt att ladda elbilen nu?', expectedSlug: 'ladda-elbil-billigt' },
  { q: 'vad är ett rimligt elavtal i lägenhet?', expectedSlug: 'elavtal-lagenhet' },
];

function pickHeading(headingPath: string): string {
  const parts = headingPath.split(' > ');
  return parts[1] ?? '(intro)';
}

async function main() {
  const quick = process.argv.includes('--quick');
  const queries = quick ? QUERIES.slice(0, 2) : QUERIES;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Retrieval-test  (${queries.length} ${quick ? '(quick mode)' : 'queries'})`);
  console.log(`Rate-limit-paus: ${RATE_LIMIT_DELAY_MS / 1000}s mellan queries`);
  console.log('═══════════════════════════════════════════════════════════════════');

  let matched = 0;
  let unmatched = 0;
  let broad = 0;

  for (let i = 0; i < queries.length; i++) {
    const { q, expectedSlug, note } = queries[i];
    console.log(`\n[${i + 1}/${queries.length}] Query: "${q}"${note ? `  (${note})` : ''}`);

    const t0 = Date.now();
    const results = await searchKnowledge(q, { limit: 3 });
    const ms = Date.now() - t0;

    if (results.length === 0) {
      console.log('  (inga träffar över similarity-tröskeln 0.4)');
      if (expectedSlug) unmatched++;
    } else {
      let foundExpected = false;
      results.forEach((r, idx) => {
        const preview = r.chunk_text
          .slice(0, 80)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ');
        const tick = r.article_slug === expectedSlug ? ' ← förväntad' : '';
        if (r.article_slug === expectedSlug) foundExpected = true;
        console.log(
          `  [${idx + 1}] sim=${r.similarity.toFixed(4)}  ${r.article_slug} › ${pickHeading(r.heading_path)}${tick}`,
        );
        console.log(`      "${preview}..."`);
      });

      if (expectedSlug) {
        if (foundExpected) matched++;
        else unmatched++;
      } else {
        broad++;
      }
    }
    console.log(`  (${ms}ms)`);

    if (i < queries.length - 1) {
      console.log(`  Waiting ${RATE_LIMIT_DELAY_MS / 1000}s for rate limit...`);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
    }
  }

  // Summary
  const expected = queries.filter((q) => q.expectedSlug !== null).length;
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('Summary');
  console.log(`  Queries:           ${queries.length}`);
  console.log(`  Förväntad slug:    ${matched}/${expected} hittade förväntad artikel i top-3`);
  console.log(`  Bredare frågor:    ${broad}`);
  if (unmatched > 0) console.log(`  ❌ Misslyckade:    ${unmatched}`);
  console.log('═══════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
