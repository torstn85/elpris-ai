import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import LivePriceWidget from '@/components/dynamic/LivePriceWidget';
import PriceGraph from '@/components/dynamic/PriceGraph';
import CheapestHoursToday from '@/components/dynamic/CheapestHoursToday';
import MostExpensiveHoursToday from '@/components/dynamic/MostExpensiveHoursToday';
import { CITIES, type City } from '@/lib/cities';
import { loadTodayPrices } from '@/lib/prices/today';
import { stockholmHour, stockholmSlotLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface PageProps {
  params: { stad: string };
}

const PUBLISHED_AT = '2026-05-05';
const PUBLISHED_LABEL = 'maj 2026';
// Datum för senaste TEXTändring på sidan (denna commit) — används för
// article:modified_time / dateModified. INTE request-tidsstämpeln.
const MODIFIED_AT = '2026-08-27';

const EXAMPLE_CITIES_BY_AREA: Record<Area, string[]> = {
  SE1: ['Luleå', 'Kiruna'],
  SE2: ['Sundsvall', 'Östersund'],
  SE3: ['Stockholm', 'Göteborg', 'Uppsala', 'Kungsbacka', 'Varberg'],
  SE4: ['Malmö', 'Helsingborg', 'Halmstad', 'Falkenberg', 'Laholm', 'Båstad'],
};

const LINK_CLASS =
  'font-semibold text-[#00E5FF] hover:text-white underline transition-colors duration-150';

function buildTitle(name: string): string {
  const full = `Elpris idag i ${name} — timme för timme`;
  if (full.length <= 60) return full;
  return `Elpris idag i ${name}`;
}

function buildDescription(name: string, area: Area): string {
  return `Aktuellt spotpris i ${name} (${area}). Se dagens timpriser, billigaste timmarna och planera din elanvändning. Live-data uppdateras var 15:e minut.`;
}

function otherCitiesInArea(name: string, area: Area): string[] {
  return EXAMPLE_CITIES_BY_AREA[area].filter(
    (c) => c.toLowerCase() !== name.toLowerCase(),
  );
}

function joinSwedish(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} och ${items[items.length - 1]}`;
}

function getCity(stad: string): City | null {
  return CITIES[stad] ?? null;
}

export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ stad: slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const city = getCity(params.stad);
  if (!city) return {};
  const url = `https://www.elpris.ai/elpris-idag/${city.slug}`;
  return {
    title: buildTitle(city.name),
    description: buildDescription(city.name, city.area),
    alternates: { canonical: url },
    openGraph: {
      title: buildTitle(city.name),
      description: buildDescription(city.name, city.area),
      url,
      type: 'article',
      publishedTime: PUBLISHED_AT,
      modifiedTime: MODIFIED_AT,
    },
  };
}

export default async function StadPage({ params }: PageProps) {
  const city = getCity(params.stad);
  if (!city) notFound();

  // SSR: hämta dagens priser för stadens elområde så pristalen finns i HTML
  // redan vid första render. Klientkomponenterna tar sen över med live-uppdatering.
  const today = await loadTodayPrices();
  const areaHours = today?.areas[city.area] ?? null;
  const currentPrice =
    areaHours?.find((h) => h.hour === stockholmHour())?.ore_per_kwh ?? null;

  // Server-side tidsstämpel för prisdatan (aktuellt 15-min-slot, Stockholm).
  // Renderas i HTML både under H1 och i spotpris-boxen.
  const slotLabel = stockholmSlotLabel();
  const priceDateLabel = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const priceUpdatedLabel = `${priceDateLabel} ${slotLabel}`;

  const others = otherCitiesInArea(city.name, city.area);
  const otherCitiesText =
    others.length > 0 ? joinSwedish(others) : 'andra städer i samma elområde';

  const para1 = `${city.name} tillhör elområde ${city.area}, vilket betyder att timpriserna sätts gemensamt för hela det området. Du som bor i ${city.name} betalar samma spotpris per kilowattimme som alla andra hushåll i ${city.area}, oavsett hur långt mellan er det är geografiskt.`;

  const para2 = `Spotpriset sätts en gång per dygn i en day-ahead-auktion på Nord Pool, den nordiska elbörsen. Producenter och elhandelsbolag lämnar sina bud för nästa dygn innan buden stänger klockan 12:00, och priserna publiceras samma eftermiddag runt klockan 13:15. Priset räknas alltså inte om löpande under dagen. Det som ändras var 15:e minut är upplösningen: sedan oktober 2025 anges spotpriset per 15-minutersintervall i stället för per hel timme, vilket ger 96 prisnivåer över dygnet i stället för 24. Det är denna dygnsvisa auktion som ligger bakom prisrytmen du ser i grafen ovan.`;

  const para3 = `Alla städer i ${city.area} delar samma timpris. Förutom ${city.name} betalar exempelvis ${otherCitiesText} exakt samma per kilowattimme. Det som gör att din slutfaktura ändå skiljer sig från grannens i en annan stad är nätavgift, eventuellt påslag och elavtal — inte själva spotpriset.`;

  const dailyAdviceLead = `Dagens prisspridning visar var du tjänar mest på att flytta din förbrukning. Här är de tre billigaste och de tre dyraste timmarna just nu i ${city.area}:`;

  const dailyAdviceTail = `Om du har möjlighet att flytta tvätt, diskmaskin eller elbilsladdning till de billigaste timmarna sänker du din elkostnad — hur mycket beror på hur stor del av din förbrukning som är flyttbar och hur stor prisskillnaden mellan dygnets billigaste och dyraste timmar är.`;

  const gridExplainer = `Spotpriset är samma för hela ${city.area}, men nätavgiften — både den fasta delen och den rörliga delen per kilowattimme — sätts av ditt lokala nätbolag och kan skilja sig markant mellan kommuner.`;

  const canonicalUrl = `https://www.elpris.ai/elpris-idag/${city.slug}`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Elpris idag i ${city.name}`,
    description: buildDescription(city.name, city.area),
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: {
      '@type': 'Organization',
      name: 'elpris.ai-redaktionen',
    },
    publisher: {
      '@type': 'Organization',
      name: 'elpris.ai',
      url: 'https://www.elpris.ai',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Hem',
        item: 'https://www.elpris.ai',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Elpris idag',
        item: 'https://www.elpris.ai/elpris-idag',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: canonicalUrl,
      },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: city.uniqueFaqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <nav className="text-xs text-[#8fafc9] mb-6 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-[#00E5FF] transition-colors">
              Hem
            </Link>
            <span>/</span>
            <Link href="/elpris-idag" className="hover:text-[#00E5FF] transition-colors">
              Elpris idag
            </Link>
            <span>/</span>
            <span className="text-white">{city.name}</span>
          </nav>

          <h1 className="font-extrabold text-3xl sm:text-4xl tracking-tight mb-3">
            Elpris idag i {city.name} — timme för timme
          </h1>
          <p className="text-xs text-[#8fafc9] mb-8">
            {areaHours
              ? `Prisdata uppdaterad ${priceUpdatedLabel} · Publicerad ${PUBLISHED_LABEL}`
              : `Publicerad ${PUBLISHED_LABEL}`}
          </p>

          <div className="mb-10">
            <LivePriceWidget
              area={city.area}
              showAreaSelector={false}
              initialPrice={currentPrice}
              initialUpdatedLabel={slotLabel}
            />
          </div>

          <p className="text-base text-[#e2eaf4] leading-relaxed mb-12">
            {city.uniqueIntro}
          </p>

          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Hur fungerar elpriset i {city.name}?
            </h2>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              {para1}
            </p>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              {para2}
            </p>
            <p className="text-base text-[#8fafc9] leading-relaxed">
              {para3}
            </p>
          </section>

          <section className="mb-12">
            <PriceGraph area={city.area} initialData={areaHours} />
          </section>

          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Vad betyder dagens priser för dig i {city.name}?
            </h2>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-6">
              {dailyAdviceLead}
            </p>
            <div className="mb-6">
              <CheapestHoursToday
                area={city.area}
                count={3}
                format="detailed"
                initialData={areaHours}
              />
            </div>
            <div className="mb-6">
              <MostExpensiveHoursToday
                area={city.area}
                count={3}
                initialData={areaHours}
              />
            </div>
            <p className="text-base text-[#8fafc9] leading-relaxed">
              {dailyAdviceTail}
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Vilket nätbolag har du i {city.name}?
            </h2>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              {city.commonGridCompanies}
            </p>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              {gridExplainer}
            </p>
            <p className="text-base text-[#8fafc9] leading-relaxed">
              Läs mer om elprisets olika delar i{' '}
              <Link
                href="/guider/forsta-elpriset/elprisets-bestandsdelar"
                className={LINK_CLASS}
              >
                vår guide om elprisets beståndsdelar
              </Link>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Vanliga frågor om elpriset i {city.name}
            </h2>
            <div className="space-y-3">
              {city.uniqueFaqs.map((faq) => (
                <details
                  key={faq.question}
                  className="bg-[#0F3460] border border-[#1E4976] rounded-2xl px-5 py-4 group"
                >
                  <summary className="font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-3">
                    <span>{faq.question}</span>
                    <span className="text-[#00E5FF] text-xl leading-none transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-base text-[#8fafc9] leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Lär dig mer
            </h2>
            <ul className="space-y-2 text-base text-[#8fafc9] leading-relaxed list-disc list-inside">
              <li>
                <Link href="/elpris-idag" className={LINK_CLASS}>
                  Elpris idag i hela Sverige
                </Link>
              </li>
              <li>
                <Link
                  href={`/elomrade/${city.area.toLowerCase()}`}
                  className={LINK_CLASS}
                >
                  Mer om {city.area}
                </Link>
              </li>
              <li>
                <Link
                  href="/guider/spara-el/ladda-elbil-billigt"
                  className={LINK_CLASS}
                >
                  Ladda elbilen billigt
                </Link>
              </li>
              <li>
                <Link
                  href="/guider/elavtal/byta-elavtal-guide"
                  className={LINK_CLASS}
                >
                  Så byter du elavtal
                </Link>
              </li>
            </ul>
          </section>

          <Footer />
        </main>
      </div>
    </>
  );
}
