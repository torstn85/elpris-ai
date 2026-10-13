import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import ConsentManager from "@/components/ConsentManager";
import Footer from "@/components/Footer";
import "./globals.css";

// Självhostade typsnitt: next/font laddar ner filerna vid build och serverar
// dem från /_next/static/media — besökarens webbläsare kontaktar aldrig Google.
// Exakt samma vikter som tidigare (@import från Google Fonts i globals.css).
const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  // Ingen justerad Arial-reserv: tecken som saknas i Inter (t.ex. → U+2192)
  // ska som tidigare tas från system-ui, inte från Arial.
  adjustFontFallback: false,
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  // Ingen justerad Arial-reserv: tecken som saknas i Inter (t.ex. → U+2192)
  // ska som tidigare tas från system-ui, inte från Arial.
  adjustFontFallback: false,
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.elpris.ai"),
  title: {
    default: "elpris.ai — Realtidspriser och AI-rådgivning för svensk el",
    template: "%s | elpris.ai",
  },
  // Ingen canonical, og:url eller beskrivning här — varje sida sätter sina egna
  // via pageMeta() (src/lib/seo.ts). Ärvd canonical gjorde sidor till kopior av
  // startsidan i Googles ögon.
  // Favicon, icon.svg och apple-icon.png sköts av filkonventionen i src/app
  // (genereras av scripts/gen-icons.mjs).
  manifest: "/manifest.webmanifest",
};

/** Adressfältets färg på mobilen — samma som manifestets theme_color. */
export const viewport: Viewport = {
  themeColor: "#0A2540",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${interTight.variable}`}>
      <head>
        {/* Consent Mode v2: allt nekat som standard, innan någon Google-tagg.
            Ingen global gtag här — window.gtag sätts av ConsentManager först
            vid statistiksamtycke, så att egna events inte köas före samtycke. */}
        <script
          id="consent-default"
          data-cookieconsent="ignore"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];(function(){function g(){window.dataLayer.push(arguments);}g("consent","default",{ad_storage:"denied",analytics_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});})();`,
          }}
        />
        {/* Cookiebot först av alla tredjepartsskript, synkront. Blockeringen av
            GA4 och AdSense sköts av ConsentManager (strikt: skripten injiceras
            först efter samtycke), därför blockingmode="manual". */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="025f3725-ecd4-457b-80e9-d7f2ae4d5e96"
          data-blockingmode="manual"
          type="text/javascript"
        />
        {/* AdSense-verifiering utan att skriptet behöver köras. */}
        <meta name="google-adsense-account" content="ca-pub-7126610035053617" />
      </head>
      <body className="antialiased bg-bg text-white min-h-screen">
        {children}
        {/* Gemensam sidfot för alla sidor, utanför sidornas innehållsbehållare. */}
        <Footer id="om-oss" />
        <ConsentManager />
      </body>
    </html>
  );
}
