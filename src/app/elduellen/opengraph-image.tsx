import { ImageResponse } from "next/og";
import { OgBrand, ogAssets, ogFonts } from "@/lib/og/render";

// Elduellen har en egen bild (spelets identitet), men samma logga, ordmärke och
// typsnitt som sajtens övriga OG-bilder — lästa lokalt från assets/, inte från
// Google Fonts vid rendering. Statisk: renderas vid bygget.

export const alt = "Elduellen — vad kostar mest i el idag?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const { logo } = await ogAssets();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 96px 64px",
        background: "radial-gradient(circle at 85% 20%, #0F3460 0%, #0A2540 60%)",
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
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Elduellen
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontFamily: "Inter Tight",
            fontSize: 60,
            fontWeight: 700,
            color: "#cfe0f0",
          }}
        >
          Vad kostar mest i el idag?
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, fontWeight: 600 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {["#22C55E", "#22C55E", "#EF4444", "#22C55E", "#22C55E"].map((c, i) => (
            <div key={i} style={{ display: "flex", width: 40, height: 40, borderRadius: 8, background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", color: "#8fafc9" }}>Fem dueller om dagen · elpris.ai</div>
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
