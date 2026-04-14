import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "elpris.ai – Realtidspriser på el i Sverige",
  description:
    "Se elpriset just nu för SE1–SE4. AI-driven analys av när du bör ladda bilen, tvätta eller använda el.",
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
      </head>
      <body className="antialiased bg-bg text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
