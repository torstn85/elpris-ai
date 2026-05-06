// Verifiera Supabase-state efter sync.
// Kör: npx tsx scripts/verify-embeddings.ts

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  const client = createClient(url, key);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Supabase article_chunks verifications');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. count(*) → expected 160
  {
    const { count, error } = await client
      .from('article_chunks')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    const ok = count === 160;
    console.log(`1. count(*) FROM article_chunks         = ${count}  ${ok ? '✅ (expected 160)' : '❌ expected 160'}`);
  }

  // 2. count(distinct article_slug) → expected 18
  {
    const { data, error } = await client
      .from('article_chunks')
      .select('article_slug');
    if (error) throw error;
    const distinct = new Set((data ?? []).map((r) => r.article_slug)).size;
    const ok = distinct === 18;
    console.log(`2. count(distinct article_slug)         = ${distinct}   ${ok ? '✅ (expected 18)' : '❌ expected 18'}`);
  }

  // 3. group by article_slug → list per article
  {
    const { data, error } = await client
      .from('article_chunks')
      .select('article_slug');
    if (error) throw error;
    const groups = new Map<string, number>();
    for (const r of (data ?? []) as { article_slug: string }[]) {
      groups.set(r.article_slug, (groups.get(r.article_slug) ?? 0) + 1);
    }
    const sorted = Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, 'sv'),
    );
    console.log(`\n3. chunks per artikel (ORDER BY article_slug):`);
    let total = 0;
    for (const [slug, count] of sorted) {
      console.log(`     ${slug.padEnd(36)} ${String(count).padStart(3)}`);
      total += count;
    }
    console.log(`     ─────────────────────────────────────────`);
    console.log(`     ${'TOTAL'.padEnd(36)} ${String(total).padStart(3)}`);
  }

  // 4. count where embedding IS NULL → expected 0
  {
    const { count, error } = await client
      .from('article_chunks')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null);
    if (error) throw error;
    const ok = count === 0;
    console.log(`\n4. count(*) WHERE embedding IS NULL    = ${count}    ${ok ? '✅ (expected 0)' : '❌ expected 0'}`);
  }

  // 5. dimension of one embedding → expected 512
  {
    const { data, error } = await client
      .from('article_chunks')
      .select('article_slug, embedding')
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    if (!row) {
      console.log(`5. embedding dimension                  = N/A (no rows)`);
    } else {
      // Supabase returns vector as a string like "[0.1, 0.2, ...]" — parse it
      const emb = row.embedding;
      let dim: number;
      if (typeof emb === 'string') {
        const parsed = JSON.parse(emb);
        dim = Array.isArray(parsed) ? parsed.length : 0;
      } else if (Array.isArray(emb)) {
        dim = emb.length;
      } else {
        dim = 0;
      }
      const ok = dim === 512;
      console.log(`5. embedding dimension (sample row)     = ${dim}  ${ok ? '✅ (expected 512)' : '❌ expected 512'}`);
      console.log(`     sample row: article_slug = "${row.article_slug}"`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
