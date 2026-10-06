import { ImageResponse } from "next/og";

export const alt = "Elduellen — vad kostar mest i el idag?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Inter Tight från Google Fonts (TTF — Satori läser inte woff2). Faller tillbaka på standardtypsnittet. */
async function loadFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Inter+Tight:wght@${weight}`,
      )
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/,
    )?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [black, semibold] = await Promise.all([loadFont(900), loadFont(600)]);
  const fonts = [
    ...(black
      ? [{ name: "Inter Tight", data: black, weight: 900 as const }]
      : []),
    ...(semibold
      ? [{ name: "Inter Tight", data: semibold, weight: 600 as const }]
      : []),
  ];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background:
          "radial-gradient(circle at 85% 20%, #0F3460 0%, #0A2540 60%)",
        color: "white",
        fontFamily: "Inter Tight",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="110" height="140" viewBox="0 0 22 28">
          <path d="M13 0 0 16h9l-2 12L22 11h-9l2-11z" fill="#00E5FF" />
        </svg>
        <div
          style={{
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Elduellen
        </div>
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 60,
          fontWeight: 600,
          color: "#cfe0f0",
        }}
      >
        Vad kostar mest i el idag?
      </div>
      <div
        style={{
          marginTop: 56,
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 34,
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          {["#22C55E", "#22C55E", "#EF4444", "#22C55E", "#22C55E"].map(
            (c, i) => (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: c,
                }}
              />
            ),
          )}
        </div>
        <div style={{ color: "#8fafc9" }}>Fem dueller om dagen · elpris.ai</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
