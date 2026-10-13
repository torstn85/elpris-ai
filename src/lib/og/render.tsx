// Gemensam OG-bild för elpris.ai, 1200×630 (next/og / Satori).
//
// Satori stödjer bara flexbox och en delmängd av CSS: ingen grid, inga
// CSS-variabler och ingen woff2. Typsnitten är därför subsettade TrueType-filer
// i assets/fonts (Inter och Inter Tight, OFL), och loggan går in som PNG via
// data-URI — SVG-källan använder stroke och transform, som Satori inte
// renderar pålitligt. Båda läses från disk en gång per process.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const NAVY = "#0A2540";
const SURFACE = "#0F3460";
const CYAN = "#00E5FF";
const TEXT_SOFT = "#cfe0f0";
const TEXT_MUTED = "#8fafc9";

/** Raden som alltid står på bilder med priser. */
export const PRICE_NOTE = "Spotpris exkl. moms och nätavgift";

let assetsPromise: Promise<{
  regular: Buffer;
  semibold: Buffer;
  bold: Buffer;
  black: Buffer;
  logo: string;
}> | null = null;

export function ogAssets() {
  if (assetsPromise) return assetsPromise;
  assetsPromise = (async () => {
    const dir = join(process.cwd(), "assets");
    const [regular, semibold, bold, black, logo] = await Promise.all([
      readFile(join(dir, "fonts", "Inter-Regular.ttf")),
      readFile(join(dir, "fonts", "Inter-SemiBold.ttf")),
      readFile(join(dir, "fonts", "InterTight-Bold.ttf")),
      readFile(join(dir, "fonts", "InterTight-Black.ttf")),
      readFile(join(dir, "logo-mark-128.png")),
    ]);
    return { regular, semibold, bold, black, logo: `data:image/png;base64,${logo.toString("base64")}` };
  })();
  return assetsPromise;
}

export async function ogFonts() {
  const { regular, semibold, bold, black } = await ogAssets();
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Inter Tight", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Inter Tight", data: black, weight: 900 as const, style: "normal" as const },
  ];
}

/** Loggan och ordmärket "elpris.ai" — avsändaren först, en delad bild läses ofta utan sammanhang. */
export function OgBrand({ logo, size = 72 }: { logo: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={size} height={size} alt="" style={{ borderRadius: size * 0.22 }} />
      <div
        style={{
          display: "flex",
          marginLeft: 22,
          fontFamily: "Inter Tight",
          fontWeight: 700,
          fontSize: size * 0.58,
          color: "white",
          letterSpacing: -1,
        }}
      >
        elpris<span style={{ color: CYAN }}>.ai</span>
      </div>
    </div>
  );
}

export interface OgTile {
  label: string;
  value: string;
  color: string;
}

export interface OgInput {
  /** Rubriken, t.ex. "Elpriset idag". */
  heading: string;
  /** Raden under rubriken, t.ex. datumet. */
  kicker?: string;
  /** Stort tal eller kort budskap, t.ex. "74,0 öre/kWh". */
  big?: string;
  bigColor?: string;
  /** Raden under det stora talet. */
  sub?: string;
  /** Rutor, t.ex. snittpris per elområde. */
  tiles?: OgTile[];
  /** Källraden längst ner, t.ex. PRICE_NOTE. */
  footer: string;
}

/**
 * Gemensam layout: logga och ordmärke uppe, rubrik och innehåll i mitten,
 * källrad nere. Samma ram på alla sidtyper så att delningar känns igen.
 */
export async function renderOgImage(input: OgInput, cacheControl: string) {
  const { logo } = await ogAssets();
  const { heading, kicker, big, bigColor, sub, tiles, footer } = input;
  const headingSize = heading.length > 70 ? 54 : heading.length > 45 ? 62 : 72;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px 52px",
          background: `radial-gradient(circle at 85% 15%, ${SURFACE} 0%, ${NAVY} 60%)`,
          color: "white",
          fontFamily: "Inter",
        }}
      >
        <OgBrand logo={logo} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Inter Tight",
              fontWeight: 700,
              fontSize: headingSize,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              maxWidth: 1040,
            }}
          >
            {heading}
          </div>
          {kicker && (
            <div style={{ display: "flex", marginTop: 14, fontSize: 34, fontWeight: 600, color: TEXT_SOFT }}>
              {kicker}
            </div>
          )}
          {big && (
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontFamily: "Inter Tight",
                fontWeight: 900,
                fontSize: 104,
                lineHeight: 1,
                letterSpacing: -1.5,
                color: bigColor ?? "white",
              }}
            >
              {big}
            </div>
          )}
          {sub && (
            <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: TEXT_SOFT, maxWidth: 1040 }}>
              {sub}
            </div>
          )}
          {tiles && (
            <div style={{ display: "flex", marginTop: 34, gap: 20 }}>
              {tiles.map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 240,
                    padding: "18px 24px",
                    borderRadius: 20,
                    background: SURFACE,
                    border: "2px solid #1E4976",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: TEXT_MUTED }}>{t.label}</div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 4,
                      fontFamily: "Inter Tight",
                      fontWeight: 900,
                      fontSize: 56,
                      letterSpacing: -1.5,
                      color: t.color,
                    }}
                  >
                    {t.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", borderTop: "2px solid #1E4976", paddingTop: 24 }}>
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: CYAN, marginRight: 16 }} />
          <div style={{ display: "flex", fontSize: 28, color: TEXT_MUTED }}>{footer}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
  // ImageResponse sätter alltid sin egen Cache-Control (ett år, immutable).
  // Ersätt den — bilder utan dygnets priser får bara cachas kort.
  const res = new Response(image.body, { status: image.status, headers: image.headers });
  res.headers.set("Cache-Control", cacheControl);
  return res;
}
