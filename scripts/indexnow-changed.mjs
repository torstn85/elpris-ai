#!/usr/bin/env node
/**
 * Räknar ut vilka publika URL:er som faktiskt ändrats i ett git-intervall och
 * skriver dem till stdout, en per rad — avsedd att pipas till indexnow-ping.mjs:
 *
 *   node scripts/indexnow-changed.mjs | node scripts/indexnow-ping.mjs
 *   npm run indexnow
 *
 * Med explicit intervall (t.ex. när du pushat flera commits på en gång —
 * pre-push-hooken skriver ut exakt rätt intervall åt dig):
 *
 *   node scripts/indexnow-changed.mjs abc1234..def5678 | node scripts/indexnow-ping.mjs
 *
 * Bara lista, skicka inget:
 *
 *   node scripts/indexnow-changed.mjs --verbose
 *
 * DEFAULT-INTERVALLET ÄR origin/main~1..origin/main — alltså den senast
 * PUSHADE committen, läst från remote-tracking-refen. Det är medvetet: en
 * lokal commit som aldrig pushats kan därmed strukturellt inte pingas, och
 * vi kan inte råka be Bing hämta en sida som inte finns på servern.
 *
 * Mappningsregler (samma detektering som scripts/stamp-dates.mjs):
 *
 *   src/content/guider/<kat>/<slug>.mdx  → /guider/<kat>/<slug>
 *   src/lib/cities.ts                    → /elpris-idag/<slug> för de städer
 *                                          vars egen text ändrats
 *   src/app/elpris-idag/[stad]/page.tsx  → alla stadssidor (delad mall), men
 *                                          bara om malltexten ändrats
 *
 * Failar aldrig hårt: vid fel skrivs en varning på stderr och scriptet
 * avslutas med exit 0 och tom stdout, så pipen skickar ingenting.
 */

import { execSync } from 'node:child_process';

const BASE_URL = 'https://www.elpris.ai';
const MDX_DIR = 'src/content/guider/';
const PAGE_TSX = 'src/app/elpris-idag/[stad]/page.tsx';
const CITIES = 'src/lib/cities.ts';
const DEFAULT_RANGE = 'origin/main~1..origin/main';
const TEMPLATE_CONSTS = [
  'para1',
  'para2',
  'para3',
  'dailyAdviceLead',
  'dailyAdviceTail',
  'gridExplainer',
];

const warnings = [];
const reasons = [];
const urls = new Set();

const verbose = process.argv.includes('--verbose');
const rangeArg = process.argv.slice(2).find((a) => !a.startsWith('--'));

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/** Innehåll i en fil vid en given revision, eller null om den inte fanns. */
function contentAt(rev, file) {
  try {
    return sh(`git show ${rev}:"${file}"`);
  } catch {
    return null;
  }
}

function revExists(rev) {
  try {
    sh(`git rev-parse --verify --quiet "${rev}^{commit}"`);
    return true;
  } catch {
    return false;
  }
}

function parseRange(range) {
  const m = range.match(/^(.+?)\.\.+(.+)$/);
  if (!m) return { base: `${range}~1`, head: range };
  return { base: m[1], head: m[2] };
}

function add(url, why) {
  if (!urls.has(url)) reasons.push(`${url}  ← ${why}`);
  urls.add(url);
}

// ─── cities.ts: samma blockparsning som stamp-dates.mjs ─────────────────────

const CITY_BLOCK_RE = /^ {2}(\w+): \{\n([\s\S]*?)\n {2}\},$/gm;

function extractCityText(block) {
  const parts = [];
  for (const label of ['uniqueIntro', 'commonGridCompanies', 'question', 'answer']) {
    const re = new RegExp(`${label}:\\s*\\n?\\s*'([^']*)'`, 'g');
    let m;
    while ((m = re.exec(block))) parts.push(m[1]);
  }
  return parts.join('');
}

function cityTextMap(text) {
  const map = new Map();
  let m;
  CITY_BLOCK_RE.lastIndex = 0;
  while ((m = CITY_BLOCK_RE.exec(text))) map.set(m[1], extractCityText(m[2]));
  return map;
}

function allCitySlugs(text) {
  return [...cityTextMap(text).keys()];
}

// ─── page.tsx: malltexterna ─────────────────────────────────────────────────

function extractBacktickConst(text, name) {
  const m = text.match(new RegExp(`const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\``, 'm'));
  return m ? m[1] : null;
}

function templateTextChanged(before, after) {
  for (const name of TEMPLATE_CONSTS) {
    const b = extractBacktickConst(before, name);
    const a = extractBacktickConst(after, name);
    if (b == null && a == null) continue;
    // Går konstanten inte att extrahera längre: anta ändring hellre än att missa.
    if (b == null || a == null) return true;
    if (b !== a) return true;
  }
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────────────

try {
  const range = rangeArg ?? DEFAULT_RANGE;
  const { base, head } = parseRange(range);

  if (!revExists(head)) {
    warnings.push(`revisionen ${head} finns inte — har du pushat? (kör med explicit intervall om du vill annat)`);
    throw new Error('saknad revision');
  }
  if (!revExists(base)) {
    warnings.push(`basrevisionen ${base} finns inte — hoppar över`);
    throw new Error('saknad basrevision');
  }

  const changed = sh(`git diff --name-status ${base} ${head}`)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status: status[0], file: rest[rest.length - 1] };
    });

  for (const { status, file } of changed) {
    // Raderade sidor pingas inte — de ska bort ur indexet, inte hämtas.
    if (status === 'D') continue;

    if (file.startsWith(MDX_DIR) && file.endsWith('.mdx')) {
      const rel = file.slice(MDX_DIR.length).replace(/\.mdx$/, '');
      const parts = rel.split('/');
      if (parts.length !== 2) {
        warnings.push(`oväntad sökväg för guide, hoppas över: ${file}`);
        continue;
      }
      add(`${BASE_URL}/guider/${parts[0]}/${parts[1]}`, `ändrad guide (${file})`);
      continue;
    }

    if (file === CITIES) {
      const before = contentAt(base, file);
      const after = contentAt(head, file);
      if (after == null) continue;
      const afterMap = cityTextMap(after);
      const beforeMap = before == null ? new Map() : cityTextMap(before);
      for (const [slug, text] of afterMap) {
        const isNew = !beforeMap.has(slug);
        if (isNew || beforeMap.get(slug) !== text) {
          add(
            `${BASE_URL}/elpris-idag/${slug}`,
            isNew ? 'ny stad i cities.ts' : 'ändrad stadstext i cities.ts',
          );
        }
      }
      continue;
    }

    if (file === PAGE_TSX) {
      const before = contentAt(base, file);
      const after = contentAt(head, file);
      if (before == null || after == null) continue;
      if (!templateTextChanged(before, after)) continue;
      const citiesSrc = contentAt(head, CITIES);
      if (citiesSrc == null) {
        warnings.push('malltexten ändrad men cities.ts kunde inte läsas — hoppar över stadssidorna');
        continue;
      }
      for (const slug of allCitySlugs(citiesSrc)) {
        add(`${BASE_URL}/elpris-idag/${slug}`, 'ändrad malltext i stadssidmallen');
      }
    }
  }
} catch (err) {
  if (err.message !== 'saknad revision' && err.message !== 'saknad basrevision') {
    warnings.push(`kunde inte räkna ut ändrade URL:er: ${err.message}`);
  }
}

// Diagnostik på stderr så att stdout förblir en ren URL-lista för pipen.
for (const w of warnings) console.error(`\x1b[33m[indexnow: varning]\x1b[0m ${w}`);
if (verbose || urls.size === 0) {
  console.error(
    `\x1b[36m[indexnow]\x1b[0m ${urls.size} ändrad(e) sida(or) i ${rangeArg ?? DEFAULT_RANGE}`,
  );
  for (const r of reasons) console.error(`\x1b[36m[indexnow]\x1b[0m   ${r}`);
}

for (const url of urls) console.log(url);

process.exit(0); // blockerar aldrig
