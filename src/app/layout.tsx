import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="025f3725-ecd4-457b-80e9-d7f2ae4d5e96"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-CY788GRNLW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CY788GRNLW');
          `}
        </Script>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7126610035053617"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-bg text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
