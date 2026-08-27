#!/usr/bin/env node
/**
 * Pre-commit datumstämplare.
 *
 * Stämplar automatiskt in ändringsdatum (Europe/Stockholm, YYYY-MM-DD) när
 * INNEHÅLLET faktiskt ändrats, och stage:ar sin egen ändring så datumet hamnar
 * i committen:
 *
 *   - src/content/guider/**.mdx  (ändrad)  → updatedAt   (om BRÖDTEXTEN ändrats)
 *   - src/content/guider/**.mdx  (ny fil)  → publishedAt (om den saknas)
 *   - src/app/elpris-idag/[stad]/page.tsx  → MODIFIED_AT (om någon av
 *                                            malltexterna para1–3,
 *                                            dailyAdviceLead/Tail, gridExplainer
 *                                            ändrats)
 *   - src/lib/cities.ts                    → berörd stads updatedAt (om DEN
 *                                            stadens uniqueIntro/commonGrid-
 *                                            Companies/uniqueFaqs ändrats)
 *
 * Bumpar ALDRIG när bara datumfältet själv, kod/JSX/import/typer eller enbart
 * whitespace ändrats (datumfälten ingår aldrig i jämförelsen → inget loop-drev).
 *
 * Blockerar ALDRIG en commit: allt körs i try/catch och vid minsta osäkerhet
 * skrivs en varning och committen släpps igenom (exit 0). Ett falskt negativt
 * med varning är bättre än ett falskt positivt som tyst ljuger för Google.
 *
 * Kringgå hela hooken med:  git commit --no-verify
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MDX_DIR = 'src/content/guider/';
const PAGE_TSX = 'src/app/elpris-idag/[stad]/page.tsx';
const CITIES = 'src/lib/cities.ts';
const TEMPLATE_CONSTS = [
  'para1',
  'para2',
  'para3',
  'dailyAdviceLead',
  'dailyAdviceTail',
  'gridExplainer',
];

const warnings = [];
const notes = [];
const restaged = new Set();

function today() {
  // sv-SE + dessa options ger exakt "YYYY-MM-DD".
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' });
}

/** Stagade filer + deras status (A/M) från indexet. */
function stagedFiles() {
  const out = sh('git diff --cached --name-status --diff-filter=ACM');
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status: status[0], file: rest.join('\t') };
    });
}

/** Innehåll i HEAD-versionen, eller null om filen är ny/saknas. */
function headContent(file) {
  try {
    return sh(`git show HEAD:"${file}"`);
  } catch {
    return null;
  }
}

function readFile(file) {
  return readFileSync(file, 'utf8');
}

function restage(file) {
  sh(`git add -- "${file}"`);
  restaged.add(file);
}

const normWs = (s) => s.replace(/\s+/g, ' ').trim();

// ─── MDX ──────────────────────────────────────────────────────────────────

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : null;
}

/** Byt datumet i en befintlig frontmatter-rad (behåller citattecknets stil). */
function setFrontmatterDate(text, field, date) {
  const re = new RegExp(
    `^(${field}:\\s*)(["']?)\\d{4}-\\d{2}-\\d{2}\\2(\\s*)$`,
    'm',
  );
  if (!re.test(text)) return null;
  return text.replace(re, (_, pre, q, tail) => `${pre}${q}${date}${q}${tail}`);
}

/** Sätt in ett nytt frontmatter-fält direkt efter öppnande `---`. */
function insertFrontmatterField(text, field, date) {
  return text.replace(/^---\n/, `---\n${field}: "${date}"\n`);
}

function handleMdx(file, status) {
  const work = readFile(file);
  const parsed = splitFrontmatter(work);
  if (!parsed) {
    warnings.push(`kunde inte tolka frontmatter i ${file} — hoppar över datumstämpling`);
    return;
  }

  // Ny fil: sätt publishedAt om den saknas. Rör INTE updatedAt (nyskapad).
  if (status === 'A') {
    if (!/^publishedAt:/m.test(parsed.fm)) {
      writeFileSync(file, insertFrontmatterField(work, 'publishedAt', today()));
      restage(file);
      notes.push(`publishedAt=${today()} satt på ny artikel ${file}`);
    }
    return;
  }

  // Ändrad fil: bumpa updatedAt bara om brödtexten (efter frontmatter) ändrats.
  const head = headContent(file);
  if (head == null) return;
  const headParsed = splitFrontmatter(head);
  const headBody = headParsed ? headParsed.body : head;
  if (normWs(headBody) === normWs(parsed.body)) return; // frontmatter- eller whitespace-only

  let next = setFrontmatterDate(work, 'updatedAt', today());
  if (next == null) {
    // updatedAt saknas — sätt in efter publishedAt-raden.
    if (/^publishedAt:.*$/m.test(work)) {
      next = work.replace(/^(publishedAt:.*)$/m, `$1\nupdatedAt: "${today()}"`);
    } else {
      warnings.push(`${file}: brödtext ändrad men varken updatedAt eller publishedAt hittades — bumpa manuellt?`);
      return;
    }
  }
  if (next !== work) {
    writeFileSync(file, next);
    restage(file);
    notes.push(`updatedAt→${today()} (brödtext ändrad) ${file}`);
  }
}

// ─── page.tsx (mallens text) ────────────────────────────────────────────────

function extractBacktickConst(text, name) {
  const m = text.match(new RegExp(`const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\``, 'm'));
  return m ? m[1] : null;
}

function setTsDateConst(text, name, date) {
  const re = new RegExp(`(const\\s+${name}\\s*=\\s*)(["'])\\d{4}-\\d{2}-\\d{2}\\2`, 'm');
  if (!re.test(text)) return null;
  return text.replace(re, `$1$2${date}$2`);
}

function handlePageTsx(file) {
  const work = readFile(file);
  const head = headContent(file);
  if (head == null) return;

  let changed = false;
  let unparsable = false;
  for (const name of TEMPLATE_CONSTS) {
    const h = extractBacktickConst(head, name);
    const w = extractBacktickConst(work, name);
    if (h == null && w == null) continue;
    if (h != null && w == null) {
      unparsable = true; // konstanten fanns i HEAD men går inte att extrahera nu
      continue;
    }
    if (h !== w) changed = true;
  }

  if (unparsable) {
    warnings.push(`möjlig textändring i stadssidmallen (${file}) — kunde inte extrahera alla malltexter, bumpa MODIFIED_AT manuellt?`);
    return;
  }
  if (!changed) return;

  const next = setTsDateConst(work, 'MODIFIED_AT', today());
  if (next == null) {
    warnings.push(`${file}: malltext ändrad men MODIFIED_AT hittades inte — bumpa manuellt?`);
    return;
  }
  if (next !== work) {
    writeFileSync(file, next);
    restage(file);
    notes.push(`MODIFIED_AT→${today()} (malltext ändrad) ${file}`);
  }
}

// ─── cities.ts (per-stad text) ──────────────────────────────────────────────

// Matchar ett stadsblock:  "  <slug>: {\n ...  \n  },"
const CITY_BLOCK_RE = /^ {2}(\w+): \{\n([\s\S]*?)\n {2}\},$/gm;

/** Text-fälten (uniqueIntro/commonGridCompanies/uniqueFaqs) i ett stadsblock. */
function extractCityText(block) {
  const parts = [];
  for (const label of ['uniqueIntro', 'commonGridCompanies', 'question', 'answer']) {
    const re = new RegExp(`${label}:\\s*\\n?\\s*'([^']*)'`, 'g');
    let m;
    while ((m = re.exec(block))) parts.push(m[1]);
  }
  return parts.join('');
}

function cityTextMap(text) {
  const map = new Map();
  let m;
  CITY_BLOCK_RE.lastIndex = 0;
  while ((m = CITY_BLOCK_RE.exec(text))) map.set(m[1], extractCityText(m[2]));
  return map;
}

function bumpCityUpdatedAt(text, slugs, date) {
  return text.replace(CITY_BLOCK_RE, (full, key, body) => {
    if (!slugs.has(key)) return full;
    let nextBody;
    if (/^\s*updatedAt:\s*['"]\d{4}-\d{2}-\d{2}['"],?/m.test(body)) {
      nextBody = body.replace(
        /^(\s*updatedAt:\s*)(['"])\d{4}-\d{2}-\d{2}\2/m,
        `$1$2${date}$2`,
      );
    } else {
      // Sätt in efter slug-raden.
      nextBody = body.replace(/^(\s*slug:\s*'[^']*',)$/m, `$1\n    updatedAt: '${date}',`);
    }
    return `  ${key}: {\n${nextBody}\n  },`;
  });
}

function handleCities(file) {
  const work = readFile(file);
  const head = headContent(file);
  if (head == null) return;

  const headMap = cityTextMap(head);
  const workMap = cityTextMap(work);
  const changed = new Set();
  for (const [slug, text] of workMap) {
    if (headMap.has(slug) && headMap.get(slug) !== text) changed.add(slug);
  }
  if (changed.size === 0) return;

  const next = bumpCityUpdatedAt(work, changed, today());
  if (next !== work) {
    writeFileSync(file, next);
    restage(file);
    notes.push(`updatedAt→${today()} för ${[...changed].join(', ')} (stadsspecifik text ändrad) ${file}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

try {
  for (const { status, file } of stagedFiles()) {
    try {
      if (file.startsWith(MDX_DIR) && file.endsWith('.mdx')) handleMdx(file, status);
      else if (file === PAGE_TSX) handlePageTsx(file);
      else if (file === CITIES) handleCities(file);
    } catch (err) {
      warnings.push(`fel vid ${file}: ${err.message}`);
    }
  }
} catch (err) {
  warnings.push(`datumstämplaren kunde inte köra: ${err.message}`);
}

for (const n of notes) console.log(`\x1b[36m[datum]\x1b[0m ${n}`);
for (const w of warnings) console.warn(`\x1b[33m[datum: varning]\x1b[0m ${w}`);
if (restaged.size > 0) {
  console.log(`\x1b[36m[datum]\x1b[0m stage:ade ${restaged.size} fil(er) med uppdaterat datum`);
}

process.exit(0); // blockerar aldrig
