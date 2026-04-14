import type { Metadata } from "next";
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
      <body className="antialiased bg-bg text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
