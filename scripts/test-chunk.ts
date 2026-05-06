// Komplett chunk-inventering över alla 18 publicerade artiklar.
// Kör: npx tsx scripts/test-chunk.ts

import fs from 'fs';
import path from 'path';
import { chunkArticle, type Chunk } from '../src/lib/rag/chunk';

const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/guider');

interface ArticleResult {
  category: string;
  slug: string;
  chunks: Chunk[];
  skipped: string[];   // skip-meddelanden från chunkArticle
  splits: { headingPath: string; count: number }[];
  introTokens: number;
  warnings: string[];
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

function discoverArticles(): { category: string; slug: string; filePath: string }[] {
  const results: { category: string; slug: string; filePath: string }[] = [];
  for (const category of fs.readdirSync(CONTENT_DIR).sort()) {
    const catPath = path.join(CONTENT_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath).sort()) {
      if (!file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.mdx$/, '');
      results.push({
        category,
        slug,
        filePath: path.join(catPath, file),
      });
    }
  }
  return results;
}

function processArticle(category: string, slug: string, filePath: string): ArticleResult {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Capture skip-logs
  const origLog = console.log;
  const skipLogs: string[] = [];
  console.log = (msg: unknown, ...rest: unknown[]) => {
    const s = String(msg);
    if (s.startsWith('Skipped thin chunk:')) {
      skipLogs.push(s.replace('Skipped thin chunk: ', ''));
    } else {
      origLog(msg, ...rest);
    }
  };

  let chunks: Chunk[] = [];
  const warnings: string[] = [];
  try {
    chunks = chunkArticle(content, slug, category);
  } catch (err) {
    warnings.push(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    console.log = origLog;
  }

  // Splits — heading_path som förekommer mer än en gång
  const headingCounts = new Map<string, number>();
  for (const c of chunks) {
    headingCounts.set(c.heading_path, (headingCounts.get(c.heading_path) ?? 0) + 1);
  }
  const splits = Array.from(headingCounts.entries())
    .filter(([, n]) => n > 1)
    .map(([headingPath, count]) => ({ headingPath, count }));

  // Token-warnings
  for (const c of chunks) {
    const t = estimateTokens(c.chunk_text);
    if (t > 800) warnings.push(`Chunk ${c.chunk_index} exceeds 800 tokens (${t})`);
  }

  const introTokens = chunks.length > 0 ? estimateTokens(chunks[0].chunk_text) : 0;

  return { category, slug, chunks, skipped: skipLogs, splits, introTokens, warnings };
}

function fmt(n: number, width: number): string {
  return String(n).padStart(width);
}

function pad(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + ' '.repeat(width - s.length);
}

// ─── Run ───────────────────────────────────────────────────────────────────────

const articles = discoverArticles();
const results: ArticleResult[] = [];

for (const a of articles) {
  results.push(processArticle(a.category, a.slug, a.filePath));
}

// ─── Per-article table ─────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log('PER ARTIKEL');
console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log(
  pad('kategori/slug', 50) +
    fmt(0, 6).replace(/0/g, ' ') + ' ' +
    pad('chunks', 7) +
    pad('skip', 6) +
    pad('split', 6) +
    pad('min', 6) +
    pad('max', 6) +
    pad('avg', 6),
);
console.log(''.padEnd(85, '─'));

for (const r of results) {
  const label = `${r.category}/${r.slug}`;
  const tokens = r.chunks.map((c) => estimateTokens(c.chunk_text));
  const min = tokens.length > 0 ? Math.min(...tokens) : 0;
  const max = tokens.length > 0 ? Math.max(...tokens) : 0;
  const sum = tokens.reduce((s, t) => s + t, 0);
  const avg = tokens.length > 0 ? Math.round(sum / tokens.length) : 0;

  let row =
    pad(label, 50) +
    pad(String(r.chunks.length), 8) +
    pad(r.skipped.length > 0 ? String(r.skipped.length) : '·', 6) +
    pad(r.splits.length > 0 ? String(r.splits.length) : '·', 6) +
    pad(String(min), 6) +
    pad(String(max), 6) +
    pad(String(avg), 6);

  if (r.warnings.length > 0) row += `   ⚠️ ${r.warnings[0]}`;
  console.log(row);
}

// ─── Global summary ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
console.log('GLOBAL SAMMANFATTNING');
console.log('═══════════════════════════════════════════════════════════════════════════════════');

const totalArticles = results.length;
const totalChunks = results.reduce((s, r) => s + r.chunks.length, 0);
const totalSkipped = results.reduce((s, r) => s + r.skipped.length, 0);
const totalSplits = results.reduce((s, r) => s + r.splits.length, 0);
const totalTokens = results.reduce(
  (s, r) => s + r.chunks.reduce((ss, c) => ss + estimateTokens(c.chunk_text), 0),
  0,
);

console.log(`Artiklar processerade:      ${totalArticles}`);
console.log(`Chunks genererade (≈ embeddings att skapa): ${totalChunks}`);
console.log(`Chunks skippade (tunna):    ${totalSkipped}`);
console.log(`Splits triggade:            ${totalSplits}`);
console.log(`Token-volym totalt:         ${totalTokens.toLocaleString('sv-SE')} tokens`);

// ─── Splits triggered ──────────────────────────────────────────────────────────

const splitArticles = results.filter((r) => r.splits.length > 0);
console.log(`\nArtiklar där split triggades: ${splitArticles.length}`);
if (splitArticles.length > 0) {
  for (const r of splitArticles) {
    for (const s of r.splits) {
      console.log(`  - ${r.category}/${r.slug}: "${s.headingPath}" → ${s.count} chunks`);
    }
  }
} else {
  console.log('  (ingen artikel hade en H2-sektion > 800 tokens)');
}

// ─── Few chunks (<3) ───────────────────────────────────────────────────────────

const fewChunks = results.filter((r) => r.chunks.length < 3);
console.log(`\nArtiklar med < 3 chunks (kort eller potentiell bug): ${fewChunks.length}`);
for (const r of fewChunks) {
  console.log(`  - ${r.category}/${r.slug}: ${r.chunks.length} chunks`);
}

// ─── Many skips (>3) ───────────────────────────────────────────────────────────

const manySkips = results.filter((r) => r.skipped.length > 3);
console.log(`\nArtiklar med > 3 skippade chunks (MDX-tung?): ${manySkips.length}`);
for (const r of manySkips) {
  console.log(`  - ${r.category}/${r.slug}: ${r.skipped.length} skippade`);
  for (const s of r.skipped) console.log(`      · ${s}`);
}

// ─── Short intro chunks ────────────────────────────────────────────────────────

const shortIntros = results.filter((r) => r.introTokens > 0 && r.introTokens < 100);
console.log(`\nArtiklar med kort intro-chunk (< 100 tokens): ${shortIntros.length}`);
for (const r of shortIntros) {
  console.log(`  - ${r.category}/${r.slug}: ${r.introTokens} tokens`);
}

// ─── Warnings / parse errors ───────────────────────────────────────────────────

const withWarnings = results.filter((r) => r.warnings.length > 0);
console.log(`\nArtiklar med varningar/fel: ${withWarnings.length}`);
for (const r of withWarnings) {
  for (const w of r.warnings) {
    console.log(`  - ${r.category}/${r.slug}: ${w}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
