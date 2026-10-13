import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import NavBar from "@/components/NavBar";
import PageWide from "@/components/layout/PageWide";
import { AreaName, AreaPanel, AreaProvider, AreaSelector } from "@/components/elpris-idag/AreaSelect";
import NowAndChart from "@/components/elpris-idag/NowAndChart";
import AreaCompareTable from "@/components/prices/AreaCompareTable";
import CityLinksByArea from "@/components/prices/CityLinksByArea";
import HourTable from "@/components/prices/HourTable";
import ShiftUsageLinks from "@/components/prices/ShiftUsageLinks";
import { formatSwedishDay } from "@/lib/format/date";
import { ore1 } from "@/lib/format/ore";
import { formatClock } from "@/lib/prices/quarterTicks";
import { AREAS, loadTodayPrices, type Area } from "@/lib/prices/today";
import { loadTomorrowPrices } from "@/lib/prices/tomorrow";
import { cheapestHour, cheapestWindow, quarterAverage, quarterExtremes } from "@/lib/prices/todaySummary";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Texter ───────────────────────────────────────────────────────────────────

// Delas av den synliga FAQ:n och FAQPage-JSON-LD så att texterna inte glider isär.
const FAQS = [
  {
    question: "Hur ofta ändras elpriset?",
    answer:
      "Spotpriset sätts en gång per dygn, dagen innan, med ett pris för varje kvart. Varje pris gäller i 15 minuter, och alla dygnets priser är kända redan dagen innan.",
  },
  {
    question: "Varför visar tabellen timmar när priset sätts per kvart?",
    answer:
      "Timsnitten ger en snabbare överblick över dygnet. Diagrammet visar varje enskild kvart. Har du ett kvartsprisavtal är det kvartspriset du betalar.",
  },
  {
    question: "Var kommer prisdatan ifrån?",
    answer:
      "Spotpriset sätts i den gemensamma europeiska day-ahead-auktionen, där Nord Pool är elbörsen för Norden. Vi hämtar priserna via elprisetjustnu.se, som bygger på data från ENTSO-E Transparency Platform, och uppdaterar sidan automatiskt.",
  },
];

const FALLBACK_DESCRIPTION =
  "Se dagens elpris timme för timme och per kvart för SE1, SE2, SE3 och SE4 – och när det är billigast.";

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";
const H2 = "font-bold text-2xl md:text-3xl text-white mb-6";

// ─── Data ─────────────────────────────────────────────────────────────────────

// En laddning per förfrågan, delad av generateMetadata och sidan.
const getToday = cache(async () => {
  const data = await loadTodayPrices();
  return { data, fetchedAt: new Date() };
});

/** Dagens datum i data som "Tisdag 13 oktober". */
const dayLabel = (isoDate: string) => formatSwedishDay(new Date(`${isoDate}T12:00:00Z`));


// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getToday();
  let description = FALLBACK_DESCRIPTION;
  if (data) {
    const avg = (a: Area) => Math.round(quarterAverage(data.quarters[a]));
    const day = dayLabel(data.date);
    // Datumet står mitt i meningen — gemen veckodag.
    description = `Elpriset idag ${day.charAt(0).toLowerCase() + day.slice(1)}: snitt ${avg("SE3")} öre/kWh i SE3, ${avg("SE4")} i SE4, ${avg("SE2")} i SE2 och ${avg("SE1")} i SE1. Se priset timme för timme och per kvart – och när det är billigast.`;
  }
  return pageMeta({
    path: "/elpris-idag",
    title: "Elpriset idag timme för timme – SE1–SE4",
    description,
  });
}

// ─── Sida ─────────────────────────────────────────────────────────────────────

export default async function ElprisIdag() {
  const [{ data, fetchedAt }, tomorrow] = await Promise.all([getToday(), loadTomorrowPrices()]);
  const nowMs = fetchedAt.getTime();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elpris.ai" },
        { "@type": "ListItem", position: 2, name: "Elpris idag", item: "https://www.elpris.ai/elpris-idag" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Elpriser idag för SE1, SE2, SE3 och SE4",
      description:
        "Dagens spotpriser per kvart och snittpris per timme för Sveriges fyra elområden. Hämtas automatiskt via elprisetjustnu.se.",
      url: "https://www.elpris.ai/elpris-idag",
      keywords: ["elpris", "spotpris", "Nord Pool", "SE1", "SE2", "SE3", "SE4", "Sverige"],
      isAccessibleForFree: true,
      license: "https://www.elprisetjustnu.se/elpris-api",
      creator: { "@type": "Organization", name: "elpris.ai", url: "https://www.elpris.ai" },
      temporalCoverage: data?.date ?? fetchedAt.toISOString().split("T")[0],
      dateModified: fetchedAt.toISOString(),
      spatialCoverage: { "@type": "Place", name: "Sverige" },
      variableMeasured: "Elpris (öre/kWh)",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <main className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <AreaProvider>
          <PageWide className="py-12 flex flex-col gap-12">
            {/* 1. Rubrik */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-[#8fafc9]">
                <a href="/" className="hover:text-[#00E5FF] transition-colors">Hem</a>
                <span>/</span>
                <span className="text-white">Elpris idag</span>
              </div>
              <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
                Elpriset idag timme för timme
              </h1>
              <p className="text-sm text-[#8fafc9]">
                {data
                  ? `${dayLabel(data.date)} · Priserna sattes i går i day-ahead-auktionen`
                  : formatSwedishDay(fetchedAt)}
              </p>
              <p className="text-base text-[#8fafc9] leading-relaxed max-w-3xl">
                Här ser du dagens spotpris för Sveriges fyra elområden – per kvart i diagrammet
                och timme för timme i tabellen. Välj ditt elområde nedan.
              </p>
              {/* 2. Områdesväljare */}
              <div className="mt-2">
                <AreaSelector />
              </div>
            </section>

            {data === null ? (
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-10 text-center text-[#8fafc9]">
                Prisdata är inte tillgänglig just nu. Försök igen om en stund.
              </div>
            ) : (
              <>
                {/* 3. Just nu + kvartsdiagram */}
                <NowAndChart quarters={data.quarters} serverNow={nowMs} />

                {/* 4. Jämförelse */}
                <section>
                  <h2 className={H2}>Jämför elområdena idag</h2>
                  <AreaCompareTable
                    columns={["Snitt", "Billigaste kvart", "Dyraste kvart", "Billigaste timme"]}
                    rows={AREAS.map((area) => {
                      const q = data.quarters[area];
                      const { min, max } = quarterExtremes(q);
                      const ch = cheapestHour(data.areas[area]);
                      return {
                        area,
                        cells: [
                          `${ore1(quarterAverage(q))} öre`,
                          `${ore1(min.ore)} öre kl ${formatClock(min.start)}`,
                          `${ore1(max.ore)} öre kl ${formatClock(max.start)}`,
                          `${ore1(ch.ore_per_kwh)} öre kl ${ch.label}`,
                        ],
                      };
                    })}
                  />
                </section>

                {/* 5. Timme för timme — alla fyra i server-HTML, valt område synligt */}
                <section>
                  <h2 className={H2}>
                    Elpriset timme för timme i <AreaName />
                  </h2>
                  {AREAS.map((area) => (
                    <AreaPanel key={area} area={area}>
                      <p className="text-sm text-[#8fafc9] leading-relaxed mb-4 max-w-3xl">
                        Varje rad är ett snitt av timmens fyra kvartspriser. Priset sätts per kvart
                        – diagrammet ovan visar varje kvart.
                      </p>
                      <HourTable hours={data.areas[area]} caption={`Snittpris per timme idag i ${area}`} nowMs={nowMs} />
                    </AreaPanel>
                  ))}
                </section>

                {/* 6. Billigast idag */}
                <section className="max-w-3xl">
                  <h2 className={H2}>När är det billigast idag?</h2>
                  {AREAS.map((area) => {
                    const w = cheapestWindow(data.areas[area], nowMs);
                    return (
                      <AreaPanel key={area} area={area}>
                        {w && (
                          <p className="text-lg text-white leading-relaxed mb-4">
                            {w.restOfDay ? `Resten av dagen i ${area}` : `Billigast resten av dagen i ${area}`}:{" "}
                            <strong>
                              {w.start}–{w.end}
                            </strong>
                            , snitt {ore1(w.avg)} öre/kWh.
                          </p>
                        )}
                      </AreaPanel>
                    );
                  })}
                  <ShiftUsageLinks />
                </section>
              </>
            )}

            {/* 7. Morgondagen */}
            <section className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-5 sm:p-6 max-w-3xl">
              {tomorrow === null ? (
                <p className="text-base text-[#e2eaf4]">
                  Morgondagens elpriser publiceras runt kl 13:15.{" "}
                  <Link href="/elpris-imorgon" className={LINK}>→ Elpriset imorgon</Link>
                </p>
              ) : (
                AREAS.map((area) => {
                  const hs = tomorrow.areas[area];
                  const avg = hs.reduce((s, h) => s + h.ore_per_kwh, 0) / hs.length;
                  return (
                    <AreaPanel key={area} area={area}>
                      <p className="text-base text-[#e2eaf4]">
                        Morgondagens elpriser är publicerade – snitt {ore1(avg)} öre/kWh i {area}.{" "}
                        <Link href="/elpris-imorgon" className={LINK}>→ Se elpriset imorgon</Link>
                      </p>
                    </AreaPanel>
                  );
                })
              )}
            </section>

            {/* 8. Städer */}
            <section>
              <h2 className={H2}>Elpris i din stad</h2>
              <CityLinksByArea />
            </section>

            {/* 9. Om dagens priser */}
            <section className="max-w-3xl">
              <h2 className={H2}>Om dagens priser</h2>
              <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
                Priserna är spotpriser exklusive moms och nätavgift. Spotpriset sätts dagen innan i
                den gemensamma europeiska day-ahead-auktionen, med ett pris för varje kvart. Din
                faktiska kostnad blir högre: moms (25 %), energiskatt, elnätsavgift och eventuellt
                påslag från ditt elavtal tillkommer.
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                <li><Link href="/guider/forsta-elpriset/elprisets-bestandsdelar" className={LINK}>Elprisets beståndsdelar</Link></li>
                <li><Link href="/guider/forsta-elpriset/vad-ar-spotpris" className={LINK}>Vad är spotpris?</Link></li>
              </ul>
            </section>

            {/* 10. FAQ (samma innehåll som FAQPage-JSON-LD) */}
            <section className="max-w-3xl">
              <h2 className={H2}>Vanliga frågor om dagens elpris</h2>
              <div className="space-y-6">
                {FAQS.map((f) => (
                  <div key={f.question}>
                    <h3 className="font-semibold text-lg text-white mb-2">{f.question}</h3>
                    <p className="text-base text-[#8fafc9] leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </PageWide>
        </AreaProvider>
      </main>
    </>
  );
}
