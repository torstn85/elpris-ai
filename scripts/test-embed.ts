// Verifiera Voyage-embeddings.
// Kör: npx tsx scripts/test-embed.ts

import fs from 'fs';
import path from 'path';

// ─── Ladda .env.local manuellt ─────────────────────────────────────────────────
// (tsx läser inte .env.local automatiskt som Next.js gör)

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('Hittade ingen .env.local — antar att miljövariabler är satta externt');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

import { embedTexts, embedQuery, EMBEDDING_DIMENSION } from '../src/lib/rag/embed';

const documents = [
  'Vad är spotpris på el och hur fungerar Nord Pool?',
  'Effekttariffer och kapacitetsavgifter på elnätet',
  'Bästa tiden att tvätta för att spara pengar',
];
const queryText = 'när är det billigast att tvätta?';

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Voyage embedding-test (voyage-3-lite, ${EMBEDDING_DIMENSION} dim)`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('Embeddar 3 dokument (input_type=document)...');
  const docEmbeddings = await embedTexts(documents);

  // Voyage free-tier = 3 RPM. Pausa så vi inte triggar 429 mellan calls.
  console.log('\nVäntar 22s för rate-limit-fönstret...');
  await new Promise((r) => setTimeout(r, 22_000));

  console.log('\nEmbeddar 1 query (input_type=query)...');
  const queryEmbedding = await embedQuery(queryText);

  // ─── Dimensions & sanity ─────────────────────────────────────────────────────
  console.log('\n─── Dimensions & sanity ──────────────────────────────────────────');
  for (let i = 0; i < docEmbeddings.length; i++) {
    const e = docEmbeddings[i];
    const dim = e.length;
    const allFinite = e.every((n) => typeof n === 'number' && Number.isFinite(n));
    const varying = e.some((n) => n !== 0) && e.some((n) => n !== e[0]);
    const dimOk = dim === EMBEDDING_DIMENSION;
    console.log(
      `  doc[${i}] dim=${dim} ${dimOk ? '✓' : '✗'}  finite=${allFinite ? '✓' : '✗'}  varying=${varying ? '✓' : '✗'}`,
    );
  }
  const qDim = queryEmbedding.length;
  const qFinite = queryEmbedding.every((n) => Number.isFinite(n));
  const qVarying =
    queryEmbedding.some((n) => n !== 0) &&
    queryEmbedding.some((n) => n !== queryEmbedding[0]);
  console.log(
    `  query   dim=${qDim} ${qDim === EMBEDDING_DIMENSION ? '✓' : '✗'}  finite=${qFinite ? '✓' : '✗'}  varying=${qVarying ? '✓' : '✗'}`,
  );

  // Sanity-magnitud: kontrollera att talen inte är onormalt stora.
  const allDocVals = docEmbeddings.flat();
  const absMax = Math.max(...allDocVals.map(Math.abs));
  console.log(`  magnitude max(|val|) across docs: ${absMax.toFixed(4)}  ${absMax < 1.5 ? '✓' : '✗'}`);

  // ─── Uniqueness ──────────────────────────────────────────────────────────────
  console.log('\n─── Uniqueness ───────────────────────────────────────────────────');
  const allEmbs = [...docEmbeddings, queryEmbedding];
  const labels = ['doc0', 'doc1', 'doc2', 'query'];
  let allUnique = true;
  for (let i = 0; i < allEmbs.length; i++) {
    for (let j = i + 1; j < allEmbs.length; j++) {
      if (arraysEqual(allEmbs[i], allEmbs[j])) {
        console.log(`  ✗ ${labels[i]} === ${labels[j]} (identiska!)`);
        allUnique = false;
      }
    }
  }
  console.log(
    allUnique ? '  ✓ Alla 4 embeddings är unika' : '  ✗ Vissa embeddings är identiska',
  );

  // ─── Doc-vs-doc cosinus ──────────────────────────────────────────────────────
  console.log('\n─── Doc vs doc cosinus-likhet ────────────────────────────────────');
  console.log(
    `  doc0 vs doc1: ${cosineSim(docEmbeddings[0], docEmbeddings[1]).toFixed(4)}`,
  );
  console.log(
    `  doc0 vs doc2: ${cosineSim(docEmbeddings[0], docEmbeddings[2]).toFixed(4)}`,
  );
  console.log(
    `  doc1 vs doc2: ${cosineSim(docEmbeddings[1], docEmbeddings[2]).toFixed(4)}`,
  );

  // ─── Query vs doc cosinus ────────────────────────────────────────────────────
  console.log('\n─── Query vs doc cosinus-likhet ──────────────────────────────────');
  console.log(`  Query: "${queryText}"`);
  const sims = docEmbeddings.map((e, i) => ({
    idx: i,
    text: documents[i],
    sim: cosineSim(queryEmbedding, e),
  }));
  for (const s of sims) {
    console.log(`    doc${s.idx}  ${s.sim.toFixed(4)}  "${s.text}"`);
  }

  const winner = sims.reduce((best, cur) => (cur.sim > best.sim ? cur : best));
  const expected = 2; // "Bästa tiden att tvätta"
  console.log(`\n  Vinnare:    doc${winner.idx}  "${winner.text}"`);
  console.log(`  Förväntat:  doc${expected} "${documents[expected]}"`);
  console.log(`  Match:      ${winner.idx === expected ? '✅ JA' : '❌ NEJ'}`);

  console.log('\n═══════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Test failed:');
  console.error(err);
  process.exit(1);
});
