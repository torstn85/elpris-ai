#!/usr/bin/env node
/**
 * IndexNow-ping.
 *
 * Skickar URL:er till IndexNow så att Bing (och övriga deltagande motorer —
 * Yandex, Seznam, Naver) kan hämta nytt och ändrat innehåll samma dag i
 * stället för att vänta på nästa crawl.
 *
 * Användning:
 *
 *   node scripts/indexnow-ping.mjs https://www.elpris.ai/guider/spara-el/tvatta-billigt
 *   node scripts/indexnow-ping.mjs url1 url2 url3
 *   printf '%s\n' url1 url2 | node scripts/indexnow-ping.mjs
 *   node scripts/indexnow-ping.mjs --dry-run <url>     # visar payload, skickar inget
 *
 * Relativa sökvägar accepteras och expanderas mot https://www.elpris.ai:
 *
 *   node scripts/indexnow-ping.mjs /guider/spara-el/tvatta-billigt
 *
 * Beroendefritt (inbyggd fetch, Node 18+).
 *
 * Failar ALDRIG hårt: nätverksfel, HTTP-fel och trasig indata loggas som
 * varningar och processen avslutas med exit 0. En missad ping ska aldrig
 * stoppa en push eller en deploy — sidan hämtas ändå vid nästa ordinarie
 * crawl, och nyckelfilen ligger kvar.
 */

const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const HOST = 'www.elpris.ai';
const KEY = 'fe12a85bfd8d46a69c5555889611d926';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

/** IndexNow tar max 10 000 URL:er per anrop. */
const MAX_URLS_PER_REQUEST = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;

const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

const log = (msg) => console.log(`${cyan('[indexnow]')} ${msg}`);
const warn = (msg) => console.warn(`${yellow('[indexnow: varning]')} ${msg}`);

/**
 * Vad statuskoderna betyder enligt IndexNow-specen. 202 är inte ett fel —
 * det betyder "mottaget, nyckeln valideras" och är det normala svaret innan
 * nyckelfilen har hämtats första gången.
 */
const STATUS_MEANING = {
  200: 'OK — URL:erna är mottagna',
  202: 'Accepted — mottaget, nyckeln valideras (normalt vid första pingen)',
  400: 'Bad request — felaktig payload',
  403: 'Forbidden — nyckeln kunde inte verifieras på keyLocation',
  422: 'Unprocessable — URL:erna matchar inte host/nyckel',
  429: 'Too many requests — backa och försök senare',
};

async function readStdin() {
  if (process.stdin.isTTY) return '';
  try {
    process.stdin.setEncoding('utf8');
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data;
  } catch (err) {
    warn(`kunde inte läsa stdin: ${err.message}`);
    return '';
  }
}

/**
 * Normaliserar en rå sträng till en absolut URL på rätt host, eller null om
 * den inte går att använda. Relativa sökvägar expanderas mot https://HOST.
 */
function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url;
  try {
    url = trimmed.startsWith('/')
      ? new URL(trimmed, `https://${HOST}`)
      : new URL(trimmed);
  } catch {
    warn(`ogiltig URL, hoppas över: ${trimmed}`);
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    warn(`otillåtet protokoll, hoppas över: ${trimmed}`);
    return null;
  }

  // IndexNow avvisar hela anropet (422) om någon URL ligger på fel host.
  if (url.hostname !== HOST) {
    warn(`fel host (${url.hostname}, förväntade ${HOST}), hoppas över: ${trimmed}`);
    return null;
  }

  return url.toString();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function submit(urlList, index, total) {
  const label = total > 1 ? ` (batch ${index + 1}/${total})` : '';
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? `timeout efter ${REQUEST_TIMEOUT_MS} ms` : err.message;
    warn(`anropet misslyckades${label}: ${reason}`);
    return false;
  }

  let text = '';
  try {
    text = (await res.text()).trim();
  } catch {
    // Tomt svar är normalt för IndexNow — inte värt en varning.
  }

  const meaning = STATUS_MEANING[res.status] ?? 'okänd statuskod';
  const payload = text ? ` — svar: ${text}` : ' — tomt svar (normalt)';
  const line = `HTTP ${res.status} ${res.statusText || ''}`.trim();

  if (res.ok) {
    log(`${green(line)}${label} — ${meaning}${payload}`);
    return true;
  }

  warn(`${line}${label} — ${meaning}${payload}`);
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────────────

let ok = true;

try {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const args = argv.filter((a) => !a.startsWith('--'));

  const fromStdin = args.length > 0 ? '' : await readStdin();
  const raw = [...args, ...fromStdin.split(/\r?\n/)];

  const urls = [...new Set(raw.map(normalizeUrl).filter(Boolean))];

  if (urls.length === 0) {
    log('inga URL:er att skicka — avslutar utan att anropa IndexNow');
    process.exit(0);
  }

  const batches = chunk(urls, MAX_URLS_PER_REQUEST);
  log(
    `${urls.length} URL:er` +
      (batches.length > 1 ? ` i ${batches.length} batchar (max ${MAX_URLS_PER_REQUEST}/anrop)` : ''),
  );
  for (const url of urls) log(`  → ${url}`);

  if (dryRun) {
    log('--dry-run: skickar inget. Payload för första batchen:');
    console.log(
      JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batches[0] }, null, 2),
    );
    process.exit(0);
  }

  for (const [i, batch] of batches.entries()) {
    const sent = await submit(batch, i, batches.length);
    if (!sent) ok = false;
  }
} catch (err) {
  warn(`oväntat fel: ${err.message}`);
  ok = false;
}

if (!ok) {
  warn('en eller flera pingar gick inte igenom — innehållet hämtas ändå vid nästa ordinarie crawl');
}

process.exit(0); // blockerar aldrig
