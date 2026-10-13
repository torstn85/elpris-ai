#!/usr/bin/env node
/**
 * Kontrollerar canonical och og:url för varje URL i sitemapen.
 *
 * För varje <loc> hämtas server-HTML (utan JavaScript) och kontrolleras att:
 *   - <link rel="canonical"> finns exakt en gång
 *   - canonical pekar på sidans egen URL (exakt som i sitemapen)
 *   - <meta property="og:url"> finns exakt en gång och är samma URL
 *
 * Användning:
 *   node scripts/check-canonical.mjs                       # produktion
 *   node scripts/check-canonical.mjs http://localhost:3000 # lokalt bygge
 *
 * Mot en annan bas än produktion hämtas sidorna därifrån, men jämförelsen
 * görs mot produktions-URL:erna i sitemapen (som canonical ska peka på).
 * Avslutar med exit 1 vid avvikelser.
 */

const base = (process.argv[2] ?? 'https://www.elpris.ai').replace(/\/$/, '');
const PROD = 'https://www.elpris.ai';

/**
 * Roten skrivs av Next.js alltid utan avslutande snedstreck ("https://www.elpris.ai"),
 * medan sitemapen har "https://www.elpris.ai/". Enligt URL-standarden är de samma
 * adress (tom sökväg = "/"), så bara roten normaliseras.
 */
const same = (a, b) => a === b || (a.replace(/\/$/, "") === PROD && b.replace(/\/$/, "") === PROD);

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

async function main() {
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const problems = [];
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++];
      const fetchUrl = url.replace(PROD, base);
      try {
        const res = await fetch(fetchUrl, { redirect: 'manual' });
        if (res.status !== 200) { problems.push(`${url}: HTTP ${res.status}`); continue; }
        const html = await res.text();
        const head = html.slice(0, html.indexOf('</head>') + 7);
        const canon = [...head.matchAll(/<link[^>]*rel="canonical"[^>]*>/g)].map((m) => attr(m[0], 'href'));
        const og = [...head.matchAll(/<meta[^>]*property="og:url"[^>]*>/g)].map((m) => attr(m[0], 'content'));
        if (canon.length !== 1) problems.push(`${url}: ${canon.length} canonical-taggar ${JSON.stringify(canon)}`);
        else if (!same(canon[0], url)) problems.push(`${url}: canonical pekar på ${canon[0]}`);
        if (og.length !== 1) problems.push(`${url}: ${og.length} og:url-taggar ${JSON.stringify(og)}`);
        else if (!same(og[0], url)) problems.push(`${url}: og:url är ${og[0]}`);
      } catch (err) {
        problems.push(`${url}: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`Kontrollerade ${urls.length} URL:er från ${base}/sitemap.xml`);
  if (problems.length) {
    console.log(`\n${problems.length} avvikelser:`);
    for (const p of problems.sort()) console.log('  ✗ ' + p);
    process.exit(1);
  }
  console.log('Inga avvikelser: varje sida har exakt en canonical och en og:url som pekar på sin egen URL.');
}
main();
