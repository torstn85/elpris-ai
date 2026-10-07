import type { Metadata } from "next";
import ConsentManager from "@/components/ConsentManager";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.elpris.ai"),
  title: {
    default: "elpris.ai — Realtidspriser och AI-rådgivning för svensk el",
    template: "%s | elpris.ai",
  },
  description:
    "Se elpriset just nu för SE1, SE2, SE3 och SE4. AI-driven rådgivning för när du bör ladda elbilen, tvätta eller använda el.",
  alternates: {
    canonical: "https://www.elpris.ai",
  },
  openGraph: {
    title: "elpris.ai — Realtidspriser och AI-rådgivning för svensk el",
    description:
      "Se elpriset just nu för SE1, SE2, SE3 och SE4. AI-driven rådgivning för när du bör använda el.",
    url: "https://www.elpris.ai",
    siteName: "elpris.ai",
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "elpris.ai — Realtidspriser och AI-rådgivning för svensk el",
    description: "Se elpriset just nu för SE1, SE2, SE3 och SE4.",
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
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
        <ConsentManager />
      </body>
    </html>
  );
}
