// Genererar favicon, app-ikoner och manifest ur de två källfilerna:
//
//   src/assets/logo-mark.svg   huvudloggan — används från 180 px och uppåt
//   src/assets/icon-small.svg  förenklad variant — favicon 16–48 px
//
// Rasteriseras med @resvg/resvg-js (klarar stroke, transform och rundade
// hörn, och ger samma pixlar varje körning). De genererade filerna committas,
// så bygget beror inte på skriptet.
//
// Kör: node scripts/gen-icons.mjs

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const NAVY = "#0A2540";

const logoMark = readFileSync("src/assets/logo-mark.svg", "utf8");
const iconSmall = readFileSync("src/assets/icon-small.svg", "utf8");

/** SVG → PNG i px×px. */
function png(svg, px) {
  return new Resvg(svg, { fitTo: { mode: "width", value: px }, background: "rgba(0,0,0,0)" })
    .render()
    .asPng();
}

/** Märket utan sin rundade bakgrundsruta (första <rect>). */
function innerMark(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<rect[^>]*\/>/, "");
}

/**
 * Fyrkant med full utfyllnad och märket skalat till `scale` runt mitten.
 * iOS rundar apple-icon själv (transparenta hörn blir svarta), och Androids
 * maskable-ikoner beskärs till en cirkel — där måste märket ligga inom
 * säkerhetszonen (en cirkel med 80 % av bredden).
 */
function fullBleed(svg, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${NAVY}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${innerMark(svg)}</g>
</svg>
`;
}

/** ICO med inbäddade PNG-bilder (stöds av alla nuvarande webbläsare). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserverat
  header.writeUInt16LE(1, 2); // typ: ikon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ px, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(px >= 256 ? 0 : px, 0);
    e.writeUInt8(px >= 256 ? 0 : px, 1);
    e.writeUInt8(0, 2); // färgpalett: ingen
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // färgplan
    e.writeUInt16LE(32, 6); // bitar per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const out = [];
function write(path, data) {
  writeFileSync(path, data);
  out.push(`${path} (${data.length} byte)`);
}

// Favicon: varje storlek renderas för sig ur icon-small.
write("src/app/favicon.ico", ico([16, 32, 48].map((px) => ({ px, data: png(iconSmall, px) }))));
write("src/app/icon.svg", iconSmall);

// Apple: fyrkantig, full utfyllnad, märket i full storlek (iOS lägger på egna hörn).
write("src/app/apple-icon.png", png(fullBleed(logoMark, 1), 180));

// Android maskable: full utfyllnad, märket på 80 % inom säkerhetszonen.
const maskable = fullBleed(logoMark, 0.8);
write("public/icon-192.png", png(maskable, 192));
write("public/icon-512.png", png(maskable, 512));

// "any": loggan som den är, med rundade hörn. Även logga i JSON-LD.
write("public/logo-512.png", png(logoMark, 512));
copyFileSync("src/assets/logo-mark.svg", "public/logo-mark.svg");
out.push("public/logo-mark.svg (kopia)");

// Till OG-bilderna (Satori renderar inte SVG med stroke/transform pålitligt).
mkdirSync("assets", { recursive: true });
write("assets/logo-mark-128.png", png(logoMark, 128));

write(
  "public/manifest.webmanifest",
  JSON.stringify(
    {
      name: "elpris.ai",
      short_name: "elpris.ai",
      description: "Elpriset per kvart för SE1–SE4 – idag, imorgon och i din stad.",
      start_url: "/",
      display: "minimal-ui",
      background_color: NAVY,
      theme_color: NAVY,
      lang: "sv-SE",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
    },
    null,
    2,
  ) + "\n",
);

console.log(out.map((l) => "  " + l).join("\n"));

// ── LogoMark: icon-small som inline-SVG i header och sidfot ─────────────────
// Genererad, inte handskriven, så att headern och faviconen inte glider isär.
// Inline i stället för <img>: inget extra anrop och ingen layoutförskjutning.
{
  const body = iconSmall
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/([a-z]+)-([a-z])([a-z]*)=/g, (_, a, b, c) => `${a}${b.toUpperCase()}${c}=`)
    .replace(/\/>/g, " />")
    .trim()
    .split("\n")
    .map((l) => "      " + l.trim())
    .join("\n");
  write(
    "src/components/LogoMark.tsx",
    `// GENERERAD FIL — ändra inte för hand. Källa: src/assets/icon-small.svg
// Kör: node scripts/gen-icons.mjs

/**
 * Logotypmärket (icon-small, samma som faviconen) bredvid ordmärket.
 * Dekorativt: ordmärket bär namnet, så märket är aria-hidden — annars läser
 * skärmläsaren upp namnet två gånger.
 */
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" className={className}>
${body}
    </svg>
  );
}
`,
  );
  console.log("  src/components/LogoMark.tsx");
}
