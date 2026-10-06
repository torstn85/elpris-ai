import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Elduellen from "@/components/elduellen/Elduellen";
import { loadDayPrices } from "@/lib/elduellen/prices";
import { addDays, generatePuzzle } from "@/lib/elduellen/generate";
import { stockholmISODate } from "@/lib/time";
import { ELDUELLEN_FAQS } from "./faq";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TITLE = "Elduellen – dagens elprisspel";
const DESCRIPTION =
  "Vad kostar mest i el idag? Fem snabba dueller med dagens riktiga elpriser – samma för alla, nya varje dag.";
const URL = "https://www.elpris.ai/elduellen";

// Titeln blir "Elduellen – dagens elprisspel | elpris.ai" via mallen i layout.tsx.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: `${TITLE} | elpris.ai`,
    description: DESCRIPTION,
    url: URL,
    siteName: "elpris.ai",
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | elpris.ai`,
    description: DESCRIPTION,
  },
};

const STEPS = [
  "Du får fem dueller med två alternativ. Välj det som kostar mest i el.",
  "Efter varje val ser du facit med kostnaden för båda alternativen och hur den är räknad.",
  "När du är klar ser du hur andra har spelat och kan dela ditt resultat.",
];

export default async function ElduellenPage() {
  if (process.env.NEXT_PUBLIC_GAMES_ENABLED !== "true") notFound();

  const date = stockholmISODate();
  const [today, tomorrow] = await Promise.all([
    loadDayPrices(date),
    loadDayPrices(addDays(date, 1)),
  ]);

  return (
    <main className="min-h-screen bg-bg text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: ELDUELLEN_FAQS.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
      <NavBar />
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
        {today ? (
          <Elduellen puzzle={generatePuzzle({ date, today, tomorrow })} />
        ) : (
          <div className="rounded-2xl border border-muted bg-surface p-6 text-center text-[#8fafc9]">
            Dagens priser är inte tillgängliga just nu. Försök igen om en stund.
          </div>
        )}

        {/* Indexerbart innehåll — under spelet, så att spelet syns direkt. */}
        <div className="mt-16 flex flex-col gap-10 border-t border-muted pt-10">
          <section>
            <h2 className="font-tight text-2xl font-bold">
              Så funkar Elduellen
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-[#cfe0f0]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 leading-relaxed text-[#8fafc9]">
              Alla spelar samma dueller och nya kommer vid midnatt. Efter kl
              13:15, när morgondagens priser är publicerade, öppnar en
              bonusduell.
            </p>
          </section>

          <section>
            <h2 className="font-tight text-2xl font-bold">
              Vanliga frågor om Elduellen
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {ELDUELLEN_FAQS.map((f) => (
                <details
                  key={f.question}
                  className="group rounded-2xl border border-muted bg-surface p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                    <h3>{f.question}</h3>
                    <span
                      className="text-accent transition-transform group-open:rotate-180"
                      aria-hidden
                    >
                      ▾
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-[#cfe0f0]">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
