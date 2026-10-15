import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import NavBar from "@/components/NavBar";
import SwedenMap from "@/components/SwedenMap";
import AreaLinks from "@/components/elomrade/AreaLinks";
import FaqAccordion from "@/components/dynamic/FaqAccordion";
import NowAndChart from "@/components/elpris-idag/NowAndChart";
import HourTable from "@/components/prices/HourTable";
import PageWide from "@/components/layout/PageWide";
import { ELOMRADEN, BORDER_NOTE, MAP_NOTE, areaLabel } from "@/content/elomrade";
import { CITIES } from "@/lib/cities";
import { formatSwedishDay } from "@/lib/format/date";
import { ore1 } from "@/lib/format/ore";
import { loadTodayPrices } from "@/lib/prices/today";
import { loadTomorrowPrices } from "@/lib/prices/tomorrow";
import { cheapestHour, cheapestWindow, quarterAverage } from "@/lib/prices/todaySummary";
import { pageMeta } from "@/lib/seo";

// Dagens priser i server-HTML, som /elpris-idag.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ area: string }> };

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";
const H2 = "font-bold text-2xl md:text-3xl text-white mb-6";
const BOX = "bg-[#0F3460] border border-[#1E4976] rounded-2xl";

// En laddning per förfrågan, delad av generateMetadata och sidan.
const getToday = cache(async () => ({ data: await loadTodayPrices(), fetchedAt: new Date() }));

/** Dagens datum i data som "Tisdag 13 oktober". */
const dayLabel = (isoDate: string) => formatSwedishDay(new Date(`${isoDate}T12:00:00Z`));

function getContent(area: string) {
  return ELOMRADEN[area as keyof typeof ELOMRADEN] ?? null;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { area } = await params;
  const c = getContent(area);
  if (!c) return {};
  const { data } = await getToday();
  const label = areaLabel(c, false);
  let description = `Elpriset i ${label} idag – spotpris per kvart och timme för timme, och vad som påverkar priset i ${c.regionInSentence}.`;
  if (data) {
    const day = dayLabel(data.date);
    const avg = Math.round(quarterAverage(data.quarters[c.area]));
    const cheap = cheapestHour(data.areas[c.area]);
    // Datumet står mitt i meningen — gemen veckodag.
    description = `Elpriset i ${label} idag ${day.charAt(0).toLowerCase() + day.slice(1)}: snitt ${avg} öre/kWh, billigast kl ${cheap.label}. Spotpris per kvart och timme för timme.`;
  }
  return pageMeta({
    path: `/elomrade/${area}`,
    title: `Elpris ${label} idag – timme för timme`,
    description,
  });
}

// ─── Sida ─────────────────────────────────────────────────────────────────────

export default async function ElomradePage({ params }: PageProps) {
  const { area } = await params;
  const c = getContent(area);
  if (!c) notFound();

  const [{ data, fetchedAt }, tomorrow] = await Promise.all([getToday(), loadTomorrowPrices()]);
  const nowMs = fetchedAt.getTime();
  const label = areaLabel(c);
  const labelLower = areaLabel(c, false);
  const pageUrl = `https://www.elpris.ai/elomrade/${area}`;

  const hours = data?.areas[c.area] ?? null;
  const rest = hours ? cheapestWindow(hours, nowMs) : null;
  const tomorrowHours = tomorrow?.areas[c.area] ?? null;
  const tomorrowAvg = tomorrowHours?.length
    ? tomorrowHours.reduce((s, h) => s + h.ore_per_kwh, 0) / tomorrowHours.length
    : null;
  const cities = Object.values(CITIES)
    .filter((city) => city.area === c.area)
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hem", item: "https://www.elpris.ai" },
        { "@type": "ListItem", position: 2, name: "Elområden", item: "https://www.elpris.ai/elomrade" },
        { "@type": "ListItem", position: 3, name: label, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: `Elpriser idag i ${labelLower}`,
      description: `Dagens spotpriser per kvart och snittpris per timme för ${labelLower}. Hämtas automatiskt via elprisetjustnu.se.`,
      url: pageUrl,
      keywords: ["elpris", "spotpris", "Nord Pool", c.area, `elområde ${c.number}`, "Sverige"],
      isAccessibleForFree: true,
      license: "https://www.elprisetjustnu.se/elpris-api",
      creator: { "@type": "Organization", name: "elpris.ai", url: "https://www.elpris.ai" },
      temporalCoverage: data?.date ?? fetchedAt.toISOString().split("T")[0],
      dateModified: fetchedAt.toISOString(),
      spatialCoverage: { "@type": "Place", name: `${label}, Sverige` },
      variableMeasured: "Elpris (öre/kWh)",
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

        <PageWide className="py-12 flex flex-col gap-12">
          {/* 1–3. Brödsmulor, H1 + underrad, områdesväljare */}
          <section className="flex flex-col gap-3">
            <nav aria-label="Brödsmulor" className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <Link href="/" className="hover:text-[#00E5FF] transition-colors">Hem</Link>
              <span>/</span>
              <Link href="/elomrade" className="hover:text-[#00E5FF] transition-colors">Elområden</Link>
              <span>/</span>
              <span className="text-white">{label}</span>
            </nav>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">{c.h1}</h1>
            <p className="text-[#8fafc9] text-base md:text-lg">
              {c.region} · {data ? dayLabel(data.date) : formatSwedishDay(fetchedAt)} · Priserna sattes i går i
              day-ahead-auktionen
            </p>
            <AreaLinks current={area} className="mt-2" />
          </section>

          {/* 4. Prisblock, låst till området */}
          {data === null || hours === null ? (
            <div className={`${BOX} p-10 text-center text-[#8fafc9]`}>
              Prisdata är inte tillgänglig just nu. Försök igen om en stund.
            </div>
          ) : (
            <>
              <NowAndChart
                quarters={data.quarters}
                serverNow={nowMs}
                area={c.area}
                title={`Dagens elpris per kvart i elområde ${c.number}`}
              />

              <section className="max-w-3xl">
                <h2 className={H2}>Elpriset timme för timme i elområde {c.number}</h2>
                <p className="text-sm text-[#8fafc9] leading-relaxed mb-4">
                  Varje rad är ett snitt av timmens fyra kvartspriser. Priset sätts per kvart – diagrammet ovan visar
                  varje kvart.
                </p>
                <HourTable hours={hours} caption={`Snittpris per timme idag i ${labelLower}`} nowMs={nowMs} />
                {rest && (
                  <p className="text-lg text-white leading-relaxed mt-6">
                    {rest.restOfDay ? `Resten av dagen i elområde ${c.number}` : `Billigast resten av dagen i elområde ${c.number}`}:{" "}
                    <strong>
                      {rest.start}–{rest.end}
                    </strong>
                    , snitt {ore1(rest.avg)} öre/kWh.
                  </p>
                )}
              </section>
            </>
          )}

          {/* 5. Morgondagen */}
          <section className={`${BOX} p-5 sm:p-6 max-w-3xl`}>
            {tomorrowAvg === null ? (
              <p className="text-base text-[#e2eaf4]">
                Morgondagens elpris för {labelLower} publiceras runt kl 13:15.{" "}
                <Link href="/elpris-imorgon" className={LINK}>→ Elpriset imorgon</Link>
              </p>
            ) : (
              <p className="text-base text-[#e2eaf4]">
                Elpriset imorgon i {labelLower}: snitt {ore1(tomorrowAvg)} öre/kWh.{" "}
                <Link href={`/elpris-imorgon#${area}`} className={LINK}>
                  → Se morgondagens pris timme för timme
                </Link>
              </p>
            )}
          </section>

          {/* 6. Om området */}
          <section className="max-w-3xl">
            <h2 className={H2}>Om {labelLower}</h2>
            <div className="flex flex-col gap-4 text-[#e2eaf4] leading-relaxed">
              {c.about.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          {/* 7. Städer */}
          {cities.length > 0 && (
            <section>
              <h2 className={H2}>Städer i elområde {c.number}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/elpris-idag/${city.slug}`}
                    className={`${BOX} px-4 py-3 font-semibold text-white text-sm hover:border-[#00E5FF]/40 transition-colors`}
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
              <p className="text-sm text-[#8fafc9] mt-4 leading-relaxed max-w-3xl">{BORDER_NOTE}</p>
            </section>
          )}

          {/* 8. Kartan */}
          <section className="flex flex-col items-center gap-2">
            <div className="w-full max-w-[260px]">
              <SwedenMap />
            </div>
            <p className="text-xs text-[#8fafc9] text-center">{MAP_NOTE}</p>
          </section>

          {/* 9. FAQ */}
          <section className="max-w-3xl">
            <h2 className={H2}>Vanliga frågor om elområde {c.number}</h2>
            <FaqAccordion items={c.faq} />
          </section>

          {/* 10. Knapp */}
          <div className="flex justify-center">
            <Link
              href="/elpris-idag"
              className="px-6 py-3 bg-[#00E5FF] text-[#0A2540] font-semibold rounded-xl hover:bg-[#00c4db] transition-colors shadow-lg shadow-[#00E5FF]/20"
            >
              Se alla elområden idag →
            </Link>
          </div>
        </PageWide>
      </main>
    </>
  );
}
