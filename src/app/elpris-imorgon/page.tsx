import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import NavBar from "@/components/NavBar";
import PageWide from "@/components/layout/PageWide";
import { AreaPanel, AreaProvider, AreaSelector } from "@/components/elpris-idag/AreaSelect";
import NowAndChart from "@/components/elpris-idag/NowAndChart";
import AreaSevenDayTrend from "@/components/elpris-imorgon/AreaSevenDayTrend";
import TomorrowStatus from "@/components/elpris-imorgon/TomorrowStatus";
import AreaCompareTable from "@/components/prices/AreaCompareTable";
import CityLinksByArea from "@/components/prices/CityLinksByArea";
import HourTable from "@/components/prices/HourTable";
import ShiftUsageLinks from "@/components/prices/ShiftUsageLinks";
import { formatSwedishDay } from "@/lib/format/date";
import { ore1 } from "@/lib/format/ore";
import { formatClock } from "@/lib/prices/quarterTicks";
import { AREAS, loadTodayPrices, type Area } from "@/lib/prices/today";
import { loadTomorrowPrices, tomorrowISODate } from "@/lib/prices/tomorrow";
import { cheapestWindow, quarterAverage, quarterExtremes } from "@/lib/prices/todaySummary";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Texter ───────────────────────────────────────────────────────────────────

// Delas av den synliga FAQ:n och FAQPage-JSON-LD så att texterna inte glider isär.
const FAQS = [
  {
    question: "När kommer morgondagens elpris?",
    answer:
      "Morgondagens spotpris publiceras varje dag runt kl 13:15, efter att buden i day-ahead-auktionen har stängt kl 12:00. Då visas priserna här för alla fyra elområden.",
  },
  {
    question: "Kan morgondagens elpris ändras efter att det publicerats?",
    answer:
      "Nej. När auktionen är avslutad ligger priset fast för varje kvart nästa dygn. Därför kan du planera tvätt, disk och laddning redan i dag.",
  },
  {
    question: "Hur planerar jag med morgondagens elpris?",
    answer:
      "Leta upp de billigaste timmarna i tabellen för ditt elområde och lägg tvätt, disk och elbilsladdning där, till exempel med fördröjd start. Det lönar sig bara med ett kvarts- eller timprisavtal – med rörligt månadspris betalar du samma snittpris oavsett när.",
  },
];

const BEFORE_DESCRIPTION =
  "Morgondagens elpris för SE1–SE4 publiceras runt kl 13:15. Se priset timme för timme och per kvart så snart det är klart – och dagens priser fram till dess.";

const PLACE: Record<Area, string> = { SE1: "Luleå", SE2: "Sundsvall", SE3: "Stockholm", SE4: "Malmö" };

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";
const H2 = "font-bold text-2xl md:text-3xl text-white mb-6";
const TEXT = "text-base text-[#8fafc9] leading-relaxed";

/** "Vad påverkar morgondagens elpris?" — visas i båda lägena. */
function PriceFactors() {
  return (
    <section className="max-w-3xl">
      <h2 className={H2}>Vad påverkar morgondagens elpris?</h2>
      <p className={`${TEXT} mb-4`}>
        Morgondagens pris beror på hur mycket el som väntas produceras och förbrukas under dygnet –
        och hur mycket som kan föras över mellan elområden och länder.
      </p>
      <ul className={`${TEXT} list-disc pl-5 space-y-2 mb-4`}>
        <li>
          Vind – blåsiga dygn ger mycket vindkraft och ofta lägre priser. Vindstilla dygn drar upp
          priset, särskilt i södra Sverige.
        </li>
        <li>Temperatur – kyla ökar förbrukningen, eftersom många värmer sina hem med el.</li>
        <li>
          Vattenkraft och kärnkraft – hur mycket vatten som finns i magasinen och om reaktorer är
          avställda påverkar hur mycket el som finns att tillgå.
        </li>
        <li>
          Överföring – när ledningarna söderut eller till grannländerna är fullt belastade kan priset
          skilja mycket mellan elområdena.
        </li>
        <li>Veckodag – på helger är förbrukningen ofta lägre än på vardagar.</li>
      </ul>
      <p className={TEXT}>
        Ofta är elen billigast på natten och dyrast på morgonen och tidig kväll, när förbrukningen
        är som störst. Men på blåsiga eller soliga dygn kan mönstret se helt annorlunda ut – därför
        lönar det sig att titta på morgondagens priser i stället för att gissa.
      </p>
    </section>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// En laddning per förfrågan, delad av generateMetadata och sidan.
const getTomorrow = cache(async () => {
  const data = await loadTomorrowPrices();
  return { data, fetchedAt: new Date() };
});

/** "Onsdag 14 oktober" för ett ISO-datum. */
const dayLabel = (isoDate: string) => formatSwedishDay(new Date(`${isoDate}T12:00:00Z`));

/** "{X} % billigare" / "{X} % dyrare" / "ungefär samma" (under 3 %). */
function change(tomorrow: number, today: number): string {
  if (today <= 0) return "–";
  const pct = ((tomorrow - today) / today) * 100;
  if (Math.abs(pct) < 3) return "ungefär samma";
  return `${Math.round(Math.abs(pct))}\u00A0% ${pct < 0 ? "billigare" : "dyrare"}`;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getTomorrow();
  let description = BEFORE_DESCRIPTION;
  if (data) {
    const avg = (a: Area) => Math.round(quarterAverage(data.quarters[a]));
    const day = dayLabel(data.date);
    description = `Elpriset imorgon ${day.charAt(0).toLowerCase() + day.slice(1)}: snitt ${avg("SE3")} öre/kWh i SE3, ${avg("SE4")} i SE4, ${avg("SE2")} i SE2 och ${avg("SE1")} i SE1. Se morgondagens pris timme för timme och per kvart.`;
  }
  return pageMeta({
    path: "/elpris-imorgon",
    title: "Elpriset imorgon timme för timme – SE1–SE4",
    description,
  });
}

// ─── Sida ─────────────────────────────────────────────────────────────────────

export default async function ElprisImorgon() {
  const [{ data: tomorrow, fetchedAt }, today] = await Promise.all([getTomorrow(), loadTodayPrices()]);
  const nowMs = fetchedAt.getTime();
  const tomorrowDate = tomorrow?.date ?? tomorrowISODate();

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elpris.ai" },
        { "@type": "ListItem", position: 2, name: "Elpris imorgon", item: "https://www.elpris.ai/elpris-imorgon" },
      ],
    },
  ];
  if (tomorrow) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Elpriser imorgon för SE1, SE2, SE3 och SE4",
      description:
        "Morgondagens spotpriser per kvart och snittpris per timme för Sveriges fyra elområden. Hämtas automatiskt via elprisetjustnu.se.",
      url: "https://www.elpris.ai/elpris-imorgon",
      keywords: ["elpris imorgon", "spotpris", "Nord Pool", "SE1", "SE2", "SE3", "SE4", "Sverige"],
      isAccessibleForFree: true,
      license: "https://www.elprisetjustnu.se/elpris-api",
      creator: { "@type": "Organization", name: "elpris.ai", url: "https://www.elpris.ai" },
      temporalCoverage: tomorrow.date,
      dateModified: fetchedAt.toISOString(),
      spatialCoverage: { "@type": "Place", name: "Sverige" },
      variableMeasured: "Elpris (öre/kWh)",
    });
  }
  jsonLd.push({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  });

  return (
    <>
      {jsonLd.map((ld) => (
        <script
          key={String(ld["@type"])}
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
                <span className="text-white">Elpris imorgon</span>
              </div>
              <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
                Elpriset imorgon timme för timme
              </h1>
              <p className="text-sm text-[#8fafc9]">
                {`${dayLabel(tomorrowDate)} · ${tomorrow ? "Priserna sattes i dag i day-ahead-auktionen" : "Publiceras runt kl 13:15"}`}
              </p>
              <p className={`${TEXT} max-w-3xl`}>
                {tomorrow
                  ? "Här ser du morgondagens spotpris för Sveriges fyra elområden – per kvart i diagrammet och timme för timme i tabellen. Välj ditt elområde nedan."
                  : "Morgondagens spotpris sätts i dag i den gemensamma europeiska day-ahead-auktionen. Buden stänger kl 12:00 och priserna publiceras runt kl 13:15 – då visas de här, per kvart och timme för timme."}
              </p>
              {tomorrow && (
                <div className="mt-2">
                  <AreaSelector />
                </div>
              )}
            </section>

            {tomorrow === null ? (
              <>
                {/* 2. Status */}
                <TomorrowStatus serverNow={nowMs} />

                {/* 3. Dagens priser */}
                <section>
                  <h2 className={H2}>Dagens priser i väntan på morgondagen</h2>
                  {today ? (
                    <AreaCompareTable
                      columns={["Snitt", "Billigaste kvart", "Dyraste kvart"]}
                      rows={AREAS.map((area) => {
                        const q = today.quarters[area];
                        const { min, max } = quarterExtremes(q);
                        return {
                          area,
                          cells: [
                            `${ore1(quarterAverage(q))} öre`,
                            `${ore1(min.ore)} öre kl ${formatClock(min.start)}`,
                            `${ore1(max.ore)} öre kl ${formatClock(max.start)}`,
                          ],
                        };
                      })}
                    />
                  ) : (
                    <p className={TEXT}>Dagens priser är inte tillgängliga just nu.</p>
                  )}
                  <p className="mt-4">
                    <Link href="/elpris-idag" className={LINK}>Se dagens elpris timme för timme →</Link>
                  </p>
                </section>

                {/* 4. Sju dagar */}
                <section className="max-w-3xl">
                  <h2 className={H2}>Elpriset de senaste sju dagarna</h2>
                  <AreaSevenDayTrend />
                </section>

                {/* 5. Så sätts priset */}
                <section className="max-w-3xl">
                  <h2 className={H2}>Så sätts morgondagens elpris</h2>
                  <p className={TEXT}>
                    Varje dag före kl 12:00 lämnar elproducenter och elhandlare bud för varje kvart
                    nästa dygn i den gemensamma europeiska day-ahead-auktionen, där Nord Pool är
                    elbörsen för Norden. När buden har stängt räknas ett pris fram för varje kvart och
                    varje elområde. Resultatet publiceras runt kl 13:15. Priset kan skilja mellan
                    elområdena när överföringen mellan dem är fullt belastad.
                  </p>
                </section>

                <PriceFactors />
              </>
            ) : (
              <>
                {/* 6. Kvartsdiagram */}
                <NowAndChart
                  quarters={tomorrow.quarters}
                  serverNow={nowMs}
                  titlePrefix="Morgondagens elpris per kvart i"
                  showNow={false}
                />

                {/* 7. Imorgon jämfört med idag */}
                <section>
                  <h2 className={H2}>Imorgon jämfört med idag</h2>
                  <AreaCompareTable
                    columns={["Snitt imorgon", "Snitt idag", "Förändring", "Billigaste kvart imorgon"]}
                    rows={AREAS.map((area) => {
                      const tm = quarterAverage(tomorrow.quarters[area]);
                      const td = today ? quarterAverage(today.quarters[area]) : null;
                      const { min } = quarterExtremes(tomorrow.quarters[area]);
                      return {
                        area,
                        cells: [
                          `${ore1(tm)} öre`,
                          td === null ? "–" : `${ore1(td)} öre`,
                          td === null ? "–" : change(tm, td),
                          `${ore1(min.ore)} öre kl ${formatClock(min.start)}`,
                        ],
                      };
                    })}
                  />
                </section>

                <PriceFactors />

                {/* 8. En panel per område */}
                {AREAS.map((area) => {
                  const w = cheapestWindow(tomorrow.areas[area], 0);
                  return (
                    <AreaPanel key={area} area={area} id={area.toLowerCase()}>
                      <section className="scroll-mt-6">
                        <h2 className={H2}>
                          Elpriset imorgon i {area} ({PLACE[area]})
                        </h2>
                        <p className="text-sm text-[#8fafc9] leading-relaxed mb-4 max-w-3xl">
                          Varje rad är ett snitt av timmens fyra kvartspriser. Priset sätts per kvart
                          – diagrammet ovan visar varje kvart.
                        </p>
                        <HourTable hours={tomorrow.areas[area]} caption={`Snittpris per timme imorgon i ${area}`} />
                        <div className="max-w-3xl mt-8">
                          {w && (
                            <p className="text-lg text-white leading-relaxed mb-4">
                              Billigast imorgon i {area}:{" "}
                              <strong>
                                {w.start}–{w.end}
                              </strong>
                              , snitt {ore1(w.avg)} öre/kWh.
                            </p>
                          )}
                          <ShiftUsageLinks />
                        </div>
                      </section>
                    </AreaPanel>
                  );
                })}
              </>
            )}

            {/* 9. Städer */}
            <section>
              <h2 className={H2}>Elpris i din stad</h2>
              <CityLinksByArea />
            </section>

            {/* 10. Om morgondagens priser */}
            <section className="max-w-3xl">
              <h2 className={H2}>Om morgondagens priser</h2>
              <p className={`${TEXT} mb-4`}>
                Priserna är spotpriser exklusive moms och nätavgift. När morgondagens priser har
                publicerats ändras de inte – varje kvartspris ligger fast för hela nästa dygn. Din
                faktiska kostnad blir högre: moms (25 %), energiskatt, elnätsavgift och eventuellt
                påslag från ditt elavtal tillkommer.
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                <li><Link href="/guider/forsta-elpriset/elprisets-bestandsdelar" className={LINK}>Elprisets beståndsdelar</Link></li>
                <li><Link href="/guider/forsta-elpriset/vad-ar-spotpris" className={LINK}>Vad är spotpris?</Link></li>
              </ul>
            </section>

            {/* 11. FAQ (samma innehåll som FAQPage-JSON-LD) */}
            <section className="max-w-3xl">
              <h2 className={H2}>Vanliga frågor om morgondagens elpris</h2>
              <div className="space-y-6">
                {FAQS.map((f) => (
                  <div key={f.question}>
                    <h3 className="font-semibold text-lg text-white mb-2">{f.question}</h3>
                    <p className={TEXT}>{f.answer}</p>
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
