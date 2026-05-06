// Synka MDX-artiklar → Supabase article_chunks med smart diff via content_hash.
//
// Användning:
//   npx tsx scripts/sync-embeddings.ts                # smart sync (default)
//   npx tsx scripts/sync-embeddings.ts --dry-run      # planera utan att skriva
//   npx tsx scripts/sync-embeddings.ts --force        # ignorera hash, embedda om allt

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chunkArticle, type Chunk } from '../src/lib/rag/chunk';
import { embedTexts } from '../src/lib/rag/embed';

// ─── Env loader (tsx läser inte .env.local automatiskt) ────────────────────────

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

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/guider');
const RATE_LIMIT_DELAY_MS = 22_000; // Voyage free-tier 3 RPM = 20s, 22s med marginal

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CliFlags {
  dryRun: boolean;
  force: boolean;
}

interface ArticleFile {
  category: string;
  slug: string;
  filePath: string;
  rawContent: string;
  contentHash: string;
}

interface ExistingArticle {
  article_slug: string;
  content_hashes: string[];
  row_count: number;
}

interface ArticlePlan {
  article: ArticleFile;
  reason: 'new' | 'changed' | 'force';
  chunks: Chunk[];
  estimatedTokens: number;
}

interface SyncPlan {
  toSync: ArticlePlan[];
  toSkip: { slug: string; reason: string }[];
  toDelete: { slug: string }[];
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function parseFlags(): CliFlags {
  return {
    dryRun: process.argv.includes('--dry-run'),
    force: process.argv.includes('--force'),
  };
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Tysta chunkArticle's skip-loggar under planeringspasset. */
function chunkQuiet(
  raw: string,
  slug: string,
  category: string,
): Chunk[] {
  const orig = console.log;
  console.log = (msg: unknown, ...rest: unknown[]) => {
    const s = String(msg);
    if (s.startsWith('Skipped thin chunk:')) return;
    orig(msg, ...rest);
  };
  try {
    return chunkArticle(raw, slug, category);
  } finally {
    console.log = orig;
  }
}

// ─── Discovery & DB fetch ──────────────────────────────────────────────────────

function discoverArticles(): ArticleFile[] {
  const out: ArticleFile[] = [];
  for (const category of fs.readdirSync(CONTENT_DIR).sort()) {
    const catPath = path.join(CONTENT_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath).sort()) {
      if (!file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.mdx$/, '');
      const filePath = path.join(catPath, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      out.push({
        category,
        slug,
        filePath,
        rawContent,
        contentHash: sha256Hex(rawContent),
      });
    }
  }
  return out;
}

async function fetchExistingArticles(
  client: SupabaseClient,
): Promise<Map<string, ExistingArticle>> {
  const { data, error } = await client
    .from('article_chunks')
    .select('article_slug, content_hash');
  if (error) {
    throw new Error(`Failed to fetch existing chunks: ${error.message}`);
  }
  const map = new Map<string, ExistingArticle>();
  for (const row of (data ?? []) as { article_slug: string; content_hash: string }[]) {
    const cur = map.get(row.article_slug);
    if (cur) {
      cur.content_hashes.push(row.content_hash);
      cur.row_count++;
    } else {
      map.set(row.article_slug, {
        article_slug: row.article_slug,
        content_hashes: [row.content_hash],
        row_count: 1,
      });
    }
  }
  return map;
}

// ─── Planning ──────────────────────────────────────────────────────────────────

function buildPlan(
  articles: ArticleFile[],
  existing: Map<string, ExistingArticle>,
  flags: CliFlags,
): SyncPlan {
  const toSync: ArticlePlan[] = [];
  const toSkip: { slug: string; reason: string }[] = [];

  for (const article of articles) {
    const ex = existing.get(article.slug);
    let reason: ArticlePlan['reason'] | null = null;
    if (flags.force) reason = 'force';
    else if (!ex) reason = 'new';
    else {
      const allMatch = ex.content_hashes.every((h) => h === article.contentHash);
      if (!allMatch) reason = 'changed';
    }

    if (reason) {
      const chunks = chunkQuiet(article.rawContent, article.slug, article.category);
      const estimatedTokens = chunks.reduce(
        (s, c) => s + estimateTokens(c.chunk_text),
        0,
      );
      toSync.push({ article, reason, chunks, estimatedTokens });
    } else {
      toSkip.push({ slug: article.slug, reason: 'unchanged' });
    }
  }

  const onDisk = new Set(articles.map((a) => a.slug));
  const toDelete: { slug: string }[] = [];
  for (const slug of Array.from(existing.keys())) {
    if (!onDisk.has(slug)) toDelete.push({ slug });
  }

  return { toSync, toSkip, toDelete };
}

// ─── Sync execution ────────────────────────────────────────────────────────────

async function syncOne(
  client: SupabaseClient,
  plan: ArticlePlan,
  flags: CliFlags,
): Promise<{ chunks: number; tokens: number }> {
  const { article, chunks } = plan;

  if (flags.dryRun) {
    return { chunks: chunks.length, tokens: plan.estimatedTokens };
  }

  // 1. Delete existing rows for this article
  const { error: delErr } = await client
    .from('article_chunks')
    .delete()
    .eq('article_slug', article.slug);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

  if (chunks.length === 0) {
    throw new Error('No chunks generated');
  }

  // 2. Embed all chunks in one call
  const texts = chunks.map((c) => c.chunk_text);
  const embeddings = await embedTexts(texts);

  // 3. Insert new rows
  const rows = chunks.map((c, i) => ({
    article_slug: c.article_slug,
    category: c.category,
    heading_path: c.heading_path,
    chunk_text: c.chunk_text,
    chunk_index: c.chunk_index,
    content_hash: article.contentHash,
    embedding: embeddings[i],
    metadata: {},
  }));
  const { error: insErr } = await client.from('article_chunks').insert(rows);
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

  return { chunks: chunks.length, tokens: plan.estimatedTokens };
}

async function deleteOrphan(
  client: SupabaseClient,
  slug: string,
  flags: CliFlags,
) {
  if (flags.dryRun) return;
  const { error } = await client
    .from('article_chunks')
    .delete()
    .eq('article_slug', slug);
  if (error) throw new Error(`Delete orphan failed: ${error.message}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseFlags();
  const modeLabel = flags.dryRun ? 'DRY-RUN' : 'LIVE';
  const forceLabel = flags.force ? ' + FORCE' : '';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Sync embeddings to Supabase  [${modeLabel}${forceLabel}]`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }
  const client = createClient(url, key);

  console.log('Discovering MDX articles on disk...');
  const articles = discoverArticles();
  console.log(`  ${articles.length} articles found\n`);

  console.log('Fetching existing chunks from Supabase...');
  const existing = await fetchExistingArticles(client);
  const totalExistingRows = Array.from(existing.values()).reduce(
    (s, e) => s + e.row_count,
    0,
  );
  console.log(
    `  ${existing.size} articles in DB (${totalExistingRows} chunk rows)\n`,
  );

  const plan = buildPlan(articles, existing, flags);

  // Aggregate estimates
  const totalChunks = plan.toSync.reduce((s, p) => s + p.chunks.length, 0);
  const totalTokens = plan.toSync.reduce((s, p) => s + p.estimatedTokens, 0);
  const apiCalls = plan.toSync.length; // 1 per artikel (alla har <128 chunks)
  const estTimeSec =
    apiCalls === 0
      ? 0
      : apiCalls === 1
        ? 5
        : (apiCalls - 1) * (RATE_LIMIT_DELAY_MS / 1000) + apiCalls * 2;

  console.log('─── Plan ──────────────────────────────────────────────────────');
  console.log(`  To sync:    ${plan.toSync.length}`);
  for (const p of plan.toSync) {
    console.log(
      `    - ${p.article.category}/${p.article.slug.padEnd(36)} (${p.reason}, ${p.chunks.length} chunks)`,
    );
  }
  console.log(`  To skip:    ${plan.toSkip.length}`);
  for (const s of plan.toSkip) {
    console.log(`    - ${s.slug} (${s.reason})`);
  }
  console.log(`  To delete:  ${plan.toDelete.length}`);
  for (const d of plan.toDelete) {
    console.log(`    - ${d.slug}`);
  }
  console.log('');
  console.log(`  Total chunks to embed: ${totalChunks}`);
  console.log(`  Total tokens:          ${totalTokens.toLocaleString('sv-SE')}`);
  console.log(
    `  Estimated time:        ${estTimeSec}s  (~${Math.ceil(estTimeSec / 60)} min)`,
  );
  console.log('───────────────────────────────────────────────────────────────\n');

  if (plan.toSync.length === 0 && plan.toDelete.length === 0) {
    console.log('Nothing to do. ✓');
    return;
  }

  if (flags.dryRun) {
    console.log('DRY-RUN: Inga skrivningar gjorda. Lägg till INSERT/DELETE genom att köra utan --dry-run.');
    return;
  }

  // ─── Execute ─────────────────────────────────────────────────────────────────

  const errors: { slug: string; error: string }[] = [];
  let actualChunks = 0;
  let actualTokens = 0;

  for (let i = 0; i < plan.toSync.length; i++) {
    const p = plan.toSync[i];
    console.log(
      `[${i + 1}/${plan.toSync.length}] Syncing ${p.article.category}/${p.article.slug}...`,
    );
    try {
      const result = await syncOne(client, p, flags);
      actualChunks += result.chunks;
      actualTokens += result.tokens;
      console.log(
        `  synced: ${p.article.slug} (${result.chunks} chunks, ${result.tokens} tokens)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ slug: p.article.slug, error: msg });
      console.log(`  ❌ FAILED: ${msg}`);
    }

    // Rate-limit pause mellan artiklar (skippa efter sista)
    const isLast = i === plan.toSync.length - 1;
    if (!isLast) {
      console.log(`  Waiting ${RATE_LIMIT_DELAY_MS / 1000}s for rate limit...`);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
    }
  }

  for (const d of plan.toDelete) {
    console.log(`Deleting orphan: ${d.slug}`);
    try {
      await deleteOrphan(client, d.slug, flags);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ slug: d.slug, error: msg });
      console.log(`  ❌ FAILED: ${msg}`);
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  const failedSlugs = new Set(errors.map((e) => e.slug));
  const synced = plan.toSync.filter((p) => !failedSlugs.has(p.article.slug)).length;
  console.log(`  Synced:    ${synced}/${plan.toSync.length}`);
  console.log(`  Skipped:   ${plan.toSkip.length}`);
  console.log(`  Deleted:   ${plan.toDelete.length - plan.toDelete.filter((d) => failedSlugs.has(d.slug)).length}/${plan.toDelete.length}`);
  console.log(`  Chunks:    ${actualChunks}`);
  console.log(`  Tokens:    ${actualTokens.toLocaleString('sv-SE')}`);
  if (errors.length > 0) {
    console.log(`\n  Errors: ${errors.length}`);
    for (const e of errors) console.log(`    - ${e.slug}: ${e.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
