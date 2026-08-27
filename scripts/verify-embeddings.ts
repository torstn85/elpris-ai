// Verifiera Supabase article_chunks mot verkligheten på disk.
// Kör: npx tsx scripts/verify-embeddings.ts
//
// Larmar bara när något FAKTISKT är fel — inte när antalet artiklar råkat växa.
// Förväntade tal härleds från disk + invarianter, inga hårdkodade summor.

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/guider');
const EXPECTED_DIMENSION = 512; // matchar vector(512)-kolumnen + voyage-3-lite

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

/** Slugs för alla MDX-artiklar på disk (filnamn utan .mdx). */
function discoverSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const category of fs.readdirSync(CONTENT_DIR).sort()) {
    const catPath = path.join(CONTENT_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath)) {
      if (file.endsWith('.mdx')) slugs.add(file.replace(/\.mdx$/, ''));
    }
  }
  return slugs;
}

function parseEmbeddingDim(emb: unknown): number {
  if (typeof emb === 'string') {
    const parsed = JSON.parse(emb);
    return Array.isArray(parsed) ? parsed.length : 0;
  }
  if (Array.isArray(emb)) return emb.length;
  return 0;
}

interface Row {
  article_slug: string;
  content_hash: string;
  embedding: unknown;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  const client = createClient(url, key);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Verifiering: Supabase article_chunks vs disk');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const diskSlugs = discoverSlugs();

  const { data, error } = await client
    .from('article_chunks')
    .select('article_slug, content_hash, embedding');
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  // Gruppera per artikel
  const byArticle = new Map<string, { count: number; hashes: Set<string>; nullEmb: number; badDim: number }>();
  let totalNull = 0;
  let totalBadDim = 0;
  for (const r of rows) {
    let g = byArticle.get(r.article_slug);
    if (!g) {
      g = { count: 0, hashes: new Set(), nullEmb: 0, badDim: 0 };
      byArticle.set(r.article_slug, g);
    }
    g.count++;
    g.hashes.add(r.content_hash);
    if (r.embedding == null) {
      g.nullEmb++;
      totalNull++;
    } else if (parseEmbeddingDim(r.embedding) !== EXPECTED_DIMENSION) {
      g.badDim++;
      totalBadDim++;
    }
  }

  const dbSlugs = new Set(byArticle.keys());
  const failures: string[] = [];

  // ── Översikt ──
  console.log(`Artiklar på disk:  ${diskSlugs.size}`);
  console.log(`Artiklar i DB:     ${dbSlugs.size}`);
  console.log(`Chunk-rader i DB:  ${rows.length}\n`);

  // ── Check 1: varje artikel på disk har minst en chunk i DB ──
  const missing = [...diskSlugs].filter((s) => !dbSlugs.has(s)).sort();
  if (missing.length === 0) {
    console.log(`1. Täckning: varje artikel på disk har ≥1 chunk        ✅ (${diskSlugs.size}/${diskSlugs.size})`);
  } else {
    console.log(`1. Täckning: ${missing.length} artiklar på disk SAKNAR chunks   ❌`);
    for (const s of missing) console.log(`     - ${s}`);
    failures.push(`${missing.length} artiklar saknar chunks`);
  }

  // ── Check 2: inga orphan-chunks (DB-slug utan fil på disk) ──
  const orphans = [...dbSlugs].filter((s) => !diskSlugs.has(s)).sort();
  if (orphans.length === 0) {
    console.log(`2. Inga orphans: alla DB-slugs finns på disk           ✅`);
  } else {
    console.log(`2. Orphans: ${orphans.length} DB-slugs saknar fil på disk        ❌`);
    for (const s of orphans) console.log(`     - ${s}`);
    failures.push(`${orphans.length} orphan-artiklar`);
  }

  // ── Check 3: inga embedding IS NULL ──
  if (totalNull === 0) {
    console.log(`3. Inga NULL-embeddings                                ✅ (0/${rows.length})`);
  } else {
    console.log(`3. NULL-embeddings                                     ❌ (${totalNull}/${rows.length})`);
    failures.push(`${totalNull} NULL-embeddings`);
  }

  // ── Check 4: alla embeddings har dimension 512 ──
  if (totalBadDim === 0) {
    console.log(`4. Alla embeddings dim = ${EXPECTED_DIMENSION}                          ✅`);
  } else {
    console.log(`4. Fel dimension på ${totalBadDim} embeddings (≠${EXPECTED_DIMENSION})           ❌`);
    failures.push(`${totalBadDim} embeddings med fel dimension`);
  }

  // ── Check 5: varje artikels chunks delar samma content_hash ──
  const splitHash = [...byArticle.entries()].filter(([, g]) => g.hashes.size > 1).map(([s]) => s).sort();
  if (splitHash.length === 0) {
    console.log(`5. En content_hash per artikel (sync komplett)         ✅`);
  } else {
    console.log(`5. ${splitHash.length} artiklar har blandade content_hash (halvfärdig sync) ❌`);
    for (const s of splitHash) console.log(`     - ${s} (${byArticle.get(s)!.hashes.size} hashar)`);
    failures.push(`${splitHash.length} artiklar med blandade hashar`);
  }

  // ── Per-artikel-översikt ──
  console.log(`\nChunks per artikel:`);
  const sorted = [...byArticle.entries()].sort(([a], [b]) => a.localeCompare(b, 'sv'));
  for (const [slug, g] of sorted) {
    const flag = g.hashes.size > 1 ? ' ⚠️ blandade hashar' : g.nullEmb ? ' ⚠️ null-emb' : '';
    console.log(`     ${slug.padEnd(36)} ${String(g.count).padStart(3)}${flag}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (failures.length === 0) {
    console.log('Allt grönt ✅');
  } else {
    console.log(`FEL (${failures.length}): ${failures.join('; ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
