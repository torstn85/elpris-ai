#!/usr/bin/env node
/**
 * Kontrollerar OG-bilden för varje URL i sitemapen.
 *
 * För varje <loc> hämtas server-HTML och kontrolleras att:
 *   - <meta property="og:image"> och <meta name="twitter:image"> finns exakt en gång
 *   - båda är absoluta adresser på www.elpris.ai
 *   - båda bilderna svarar 200, image/png och är 1200×630 (läst ur PNG-huvudet)
 *     (Elduellen har en egen twitter-image-rutt med samma bild — därför
 *     kontrolleras twitter:image som egen bild i stället för att kräva samma adress)
 *
 * Användning:
 *   node scripts/check-og.mjs                       # produktion
 *   node scripts/check-og.mjs http://localhost:3000 # lokalt bygge
 *
 * Mot en annan bas än produktion hämtas sidor och bilder därifrån, men
 * adresserna i taggarna ska fortfarande vara produktionsadresser.
 * Avslutar med exit 1 vid avvikelser.
 */

const base = (process.argv[2] ?? "https://www.elpris.ai").replace(/\/$/, "");
const PROD = "https://www.elpris.ai";

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]?.replace(/&amp;/g, "&");

/** Bredd och höjd ur PNG:ens IHDR-block. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const checkedImages = new Map();

async function checkImage(src) {
  if (checkedImages.has(src)) return checkedImages.get(src);
  const promise = (async () => {
    const res = await fetch(src.replace(PROD, base));
    if (res.status !== 200) return `bilden svarar HTTP ${res.status}`;
    const type = res.headers.get("content-type");
    if (type !== "image/png") return `bilden har content-type ${type}`;
    const size = pngSize(Buffer.from(await res.arrayBuffer()));
    if (!size || size.width !== 1200 || size.height !== 630) return `bilden är ${size ? `${size.width}×${size.height}` : "ingen PNG"}`;
    return null;
  })();
  checkedImages.set(src, promise);
  return promise;
}

async function main() {
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const problems = [];
  const byImage = new Map();
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++];
      try {
        const res = await fetch(url.replace(PROD, base), { redirect: "manual" });
        if (res.status !== 200) { problems.push(`${url}: HTTP ${res.status}`); continue; }
        const html = await res.text();
        const head = html.slice(0, html.indexOf("</head>") + 7);
        const og = [...head.matchAll(/<meta[^>]*property="og:image"[^>]*>/g)].map((m) => attr(m[0], "content"));
        const tw = [...head.matchAll(/<meta[^>]*name="twitter:image"[^>]*>/g)].map((m) => attr(m[0], "content"));
        if (og.length !== 1) { problems.push(`${url}: ${og.length} og:image-taggar`); continue; }
        if (tw.length !== 1) problems.push(`${url}: ${tw.length} twitter:image-taggar`);
        for (const [name, src] of [["og:image", og[0]], ["twitter:image", tw[0]]]) {
          if (!src) continue;
          if (!src.startsWith(`${PROD}/`)) { problems.push(`${url}: ${name} är inte en absolut produktionsadress: ${src}`); continue; }
          const err = await checkImage(src);
          if (err) problems.push(`${url}: ${name}: ${err} (${src})`);
        }
        const kind = new URL(og[0]).pathname.split("/").slice(0, 3).join("/");
        byImage.set(kind, (byImage.get(kind) ?? 0) + 1);
      } catch (err) {
        problems.push(`${url}: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`Kontrollerade ${urls.length} URL:er från ${base}/sitemap.xml (${checkedImages.size} unika bilder)`);
  for (const [kind, n] of Array.from(byImage.entries()).sort()) console.log(`  ${String(n).padStart(3)} × ${kind}`);
  if (problems.length) {
    console.log(`\n${problems.length} avvikelser:`);
    for (const p of problems.sort()) console.log("  ✗ " + p);
    process.exit(1);
  }
  console.log("Inga avvikelser: varje sida har en og:image och twitter:image, och bilden är en PNG på 1200×630.");
}

main();
