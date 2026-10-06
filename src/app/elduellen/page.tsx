import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Elduellen from "@/components/elduellen/Elduellen";
import { loadDayPrices } from "@/lib/elduellen/prices";
import { addDays, generatePuzzle } from "@/lib/elduellen/generate";
import { stockholmISODate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Elduellen — dagens elprisspel",
  description:
    "Fem dueller om vad som kostar mest i el idag. Samma dueller för alla — hur många klarar du?",
  // Inte indexerad före lansering (metadata, sitemap och teaser kommer i etapp 5).
  robots: { index: false, follow: false },
};

export default async function ElduellenPage() {
  if (process.env.NEXT_PUBLIC_GAMES_ENABLED !== "true") notFound();

  const date = stockholmISODate();
  const [today, tomorrow] = await Promise.all([
    loadDayPrices(date),
    loadDayPrices(addDays(date, 1)),
  ]);

  return (
    <main className="min-h-screen bg-bg text-white">
      <NavBar />
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
        {today ? (
          <Elduellen puzzle={generatePuzzle({ date, today, tomorrow })} />
        ) : (
          <div className="rounded-2xl border border-muted bg-surface p-6 text-center text-[#8fafc9]">
            Dagens priser är inte tillgängliga just nu. Försök igen om en stund.
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
