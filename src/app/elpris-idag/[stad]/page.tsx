import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import NavBar from '@/components/NavBar';
import LivePriceWidget from '@/components/dynamic/LivePriceWidget';
import PriceGraph from '@/components/dynamic/PriceGraph';
import { CITIES, type City } from '@/lib/cities';
import { loadTodayPrices } from '@/lib/prices/today';
import { loadTomorrowPrices } from '@/lib/prices/tomorrow';
import { isCurrentHour } from '@/lib/prices/hourly';
import { formatClock } from '@/lib/prices/quarterTicks';
import { cheapestHour, cheapestWindow, quarterAverage, quarterExtremes } from '@/lib/prices/todaySummary';
import { formatSwedishDay } from '@/lib/format/date';
import { ore1 } from '@/lib/format/ore';
import { ORG_LOGO, pageMeta } from '@/lib/seo';
import { ogCityUrl } from '@/lib/og/images';
import { stockholmISODate } from '@/lib/time';
import HourTable from '@/components/prices/HourTable';
import { stockholmSlotLabel, formatMonthYear } from '@/lib/time';
import PageReading from "@/components/layout/PageReading";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface PageProps {
  params: { stad: string };
}

// Gemensamt publiceringsdatum för städer utan eget city.publishedAt.
const PUBLISHED_AT = '2026-05-05';
// Datum för senaste TEXTändring på sidan (denna commit) — används för
// article:modified_time / dateModified. INTE request-tidsstämpeln.
const MODIFIED_AT = '2026-10-13';

const EXAMPLE_CITIES_BY_AREA: Record<Area, string[]> = {
  SE1: ['Luleå', 'Kiruna', 'Skellefteå'],
  SE2: ['Sundsvall', 'Östersund', 'Umeå'],
  SE3: ['Stockholm', 'Göteborg', 'Uppsala', 'Gävle', 'Västerås', 'Kungsbacka', 'Varberg'],
  SE4: ['Malmö', 'Helsingborg', 'Halmstad', 'Falkenberg', 'Laholm', 'Båstad'],
};

const LINK_CLASS =
  'font-semibold text-[#00E5FF] hover:text-white underline transition-colors duration-150';

function buildTitle(name: string, area: Area): string {
  return `Elpris ${name} idag – timme för timme (${area})`;
}

/** Dynamisk beskrivning från dagens data; reservtext när data saknas. */
function buildDescription(
  name: string,
  area: Area,
  today: Awaited<ReturnType<typeof loadTodayPrices>>,
): string {
  if (!today) {
    return `Se dagens elpris i ${name} timme för timme och per kvart – spotpris för ${area}, billigaste timmarna och tips för att spara.`;
  }
  const day = formatSwedishDay(new Date(`${today.date}T12:00:00Z`));
  const avg = Math.round(quarterAverage(today.quarters[area]));
  const cheap = cheapestHour(today.areas[area]);
  return `Elpriset i ${name} idag ${day.charAt(0).toLowerCase() + day.slice(1)}: snitt ${avg} öre/kWh i ${area}, billigast kl ${cheap.label}. Se spotpriset timme för timme och per kvart.`;
}

// En laddning per förfrågan, delad av generateMetadata och sidan.
const getToday = cache(async () => ({ data: await loadTodayPrices(), fetchedAt: new Date() }));

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

/** Publiceringsdatum för en stad: city.publishedAt, annars mallens PUBLISHED_AT. */
function cityDatePublished(city: City): string {
  return city.publishedAt ?? PUBLISHED_AT;
}

/**
 * Senaste ändringsdatum för en stad = det senaste av stadens publiceringsdatum,
 * MODIFIED_AT (mallens gemensamma text, gäller alla städer) och city.updatedAt
 * (stadsspecifik text). Publiceringsdatumet ingår så att dateModified aldrig
 * hamnar före datePublished för städer som tillkommit efter MODIFIED_AT.
 * ISO-datum (YYYY-MM-DD) sorteras korrekt lexikografiskt.
 */
function cityDateModified(city: City): string {
  const candidates = [cityDatePublished(city), MODIFIED_AT, city.updatedAt].filter(
    (d): d is string => Boolean(d),
  );
  return candidates.sort().at(-1) ?? MODIFIED_AT;
}

export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ stad: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = getCity(params.stad);
  if (!city) return {};
  const { data } = await getToday();
  const meta = pageMeta({
    path: `/elpris-idag/${city.slug}`,
    title: buildTitle(city.name, city.area),
    description: buildDescription(city.name, city.area, data),
    type: 'article',
    image: { url: ogCityUrl(city.slug, data?.date ?? stockholmISODate()), alt: `Elpris ${city.name} idag – snittpris i ${city.area}` },
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: 'article',
      publishedTime: cityDatePublished(city),
      modifiedTime: cityDateModified(city),
    },
  };
}

export default async function StadPage({ params }: PageProps) {
  const city = getCity(params.stad);
  if (!city) notFound();

  // SSR: hämta dagens priser för stadens elområde så pristalen finns i HTML
  // redan vid första render. Klientkomponenterna tar sen över med live-uppdatering.
  // Timmar och kvartar ur samma laddning (en databasfråga).
  const [{ data: today, fetchedAt }, tomorrow] = await Promise.all([getToday(), loadTomorrowPrices()]);
  const areaHours = today?.areas[city.area] ?? null;
  const quarters = today?.quarters[city.area] ?? null;
  // Aktuell timme på tid, inte klocktimme — 02 finns två gånger natten till normaltid.
  const nowMs = fetchedAt.getTime();
  const extremes = quarters && quarters.length > 0 ? quarterExtremes(quarters) : null;
  const restWindow = areaHours ? cheapestWindow(areaHours, nowMs) : null;
  const tomorrowHours = tomorrow?.areas[city.area] ?? null;
  const tomorrowAvg = tomorrowHours
    ? tomorrowHours.reduce((sum, h) => sum + h.ore_per_kwh, 0) / tomorrowHours.length
    : null;
  const currentPrice =
    areaHours?.find((h) => isCurrentHour(h, nowMs))?.ore_per_kwh ?? null;

  // Aktuell 15-min-slot (Stockholm) — seed för LivePriceWidgets "Uppdaterad".
  const slotLabel = stockholmSlotLabel();
  // Artikeldatum: samma härledda värden som JSON-LD datePublished/dateModified.
  const publishedAt = cityDatePublished(city);
  const modifiedAt = cityDateModified(city);

  const others = otherCitiesInArea(city.name, city.area);
  const otherCitiesText =
    others.length > 0 ? joinSwedish(others) : 'andra städer i samma elområde';

  const para1 = `${city.name} tillhör elområde ${city.area}, vilket betyder att timpriserna sätts gemensamt för hela det området. Du som bor i ${city.name} betalar samma spotpris per kilowattimme som alla andra hushåll i ${city.area}, oavsett hur långt mellan er det är geografiskt.`;

  const para2 = `Spotpriset sätts en gång per dygn i en day-ahead-auktion på Nord Pool, den nordiska elbörsen. Producenter och elhandelsbolag lämnar sina bud för nästa dygn innan buden stänger klockan 12:00, och priserna publiceras samma eftermiddag runt klockan 13:15. Priset räknas alltså inte om löpande under dagen. Det som ändras var 15:e minut är upplösningen: sedan oktober 2025 anges spotpriset per 15-minutersintervall i stället för per hel timme, vilket ger 96 prisnivåer över dygnet i stället för 24. Det är denna dygnsvisa auktion som ligger bakom prisrytmen du ser i grafen ovan.`;

  const para3 = `Alla städer i ${city.area} delar samma timpris. Förutom ${city.name} betalar exempelvis ${otherCitiesText} exakt samma per kilowattimme. Det som gör att din slutfaktura ändå skiljer sig från grannens i en annan stad är nätavgift, eventuellt påslag och elavtal — inte själva spotpriset.`;

  const gridExplainer = `Spotpriset är samma för hela ${city.area}, men nätavgiften — både den fasta delen och den rörliga delen per kilowattimme — sätts av ditt lokala nätbolag och kan skilja sig markant mellan kommuner.`;

  const canonicalUrl = `https://www.elpris.ai/elpris-idag/${city.slug}`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Elpris idag i ${city.name}`,
    description: buildDescription(city.name, city.area, today),
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: {
      '@type': 'Organization',
      name: 'elpris.ai-redaktionen',
    },
    publisher: {
      '@type': 'Organization',
      name: 'elpris.ai',
      url: 'https://www.elpris.ai',
      logo: ORG_LOGO,
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

        <PageReading as="main" className="py-8 sm:py-12">
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
            {today
              ? `${formatSwedishDay(new Date(`${today.date}T12:00:00Z`))} · Priserna sattes i går i day-ahead-auktionen`
              : formatSwedishDay(fetchedAt)}
            {' · '}
            <time dateTime={publishedAt}>Publicerad {formatMonthYear(publishedAt)}</time>
            {modifiedAt !== publishedAt && (
              <>
                {' · '}
                <time dateTime={modifiedAt}>
                  Uppdaterad {formatMonthYear(modifiedAt)}
                </time>
              </>
            )}
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

          {/* 2a. Spotpriset idag: nyckeltal + kvartsdiagram */}
          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-2">
              Spotpriset idag i {city.name}
            </h2>
            <p className="text-sm text-[#8fafc9] mb-6">
              {formatSwedishDay(today ? new Date(`${today.date}T12:00:00Z`) : fetchedAt)} · {city.area} · spotpris exkl. moms och nätavgift
            </p>
            {quarters && extremes && (
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  ['Snitt idag', `${ore1(quarterAverage(quarters))} öre/kWh`],
                  ['Billigast', `${ore1(extremes.min.ore)} öre kl ${formatClock(extremes.min.start)}`],
                  ['Dyrast', `${ore1(extremes.max.ore)} öre kl ${formatClock(extremes.max.start)}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#0F3460] border border-[#1E4976] rounded-2xl px-4 py-3">
                    <dt className="text-xs text-[#8fafc9]">{label}</dt>
                    <dd className="text-lg font-bold text-white tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <PriceGraph area={city.area} initialQuarters={quarters} placeLabel={city.name} showStats={false} />
          </section>

          {/* 2b. Timme för timme */}
          {areaHours && (
            <section className="mb-12">
              <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
                Elpriset timme för timme i {city.name}
              </h2>
              <p className="text-sm text-[#8fafc9] leading-relaxed mb-4">
                Varje rad är ett snitt av timmens fyra kvartspriser. Priset sätts per kvart –
                diagrammet ovan visar varje kvart.
              </p>
              <HourTable hours={areaHours} caption={`Snittpris per timme idag i ${city.name} (${city.area})`} nowMs={nowMs} />
              {restWindow && (
                <p className="text-lg text-white leading-relaxed mt-6">
                  Billigast resten av dagen i {city.name}:{' '}
                  <strong>
                    {restWindow.start}–{restWindow.end}
                  </strong>
                  , snitt {ore1(restWindow.avg)} öre/kWh.
                </p>
              )}
            </section>
          )}

          {/* 2c. Morgondagen */}
          <section className="mb-12 bg-[#0F3460] border border-[#1E4976] rounded-2xl p-5 sm:p-6">
            {tomorrowAvg === null ? (
              <p className="text-base text-[#e2eaf4]">
                Morgondagens elpris för {city.name} ({city.area}) publiceras runt kl 13:15.{' '}
                <Link href="/elpris-imorgon" className={LINK_CLASS}>→ Elpriset imorgon</Link>
              </p>
            ) : (
              <p className="text-base text-[#e2eaf4]">
                Elpriset imorgon i {city.name}: snitt {ore1(tomorrowAvg)} öre/kWh i {city.area}.{' '}
                <Link href={`/elpris-imorgon#${city.area.toLowerCase()}`} className={LINK_CLASS}>
                  → Se morgondagens pris timme för timme
                </Link>
              </p>
            )}
          </section>

          {/* 2d. Rörligt elpris */}
          <section className="mb-12">
            <h2 className="font-bold text-2xl sm:text-3xl text-white mb-6">
              Rörligt elpris i {city.name}
            </h2>
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              Har du rörligt elpris i {city.name} betalar du i regel ett snitt av spotpriset i{' '}
              {city.area} under månaden, plus elhandlarens påslag. Med ett kvartsprisavtal betalar
              du i stället priset för varje kvart – och då kan det löna sig att lägga tvätt, disk
              och laddning på de billiga timmarna i tabellen ovan. Vilket avtal som passar bäst
              beror på hur mycket av din förbrukning du kan flytta.
            </p>
            <p className="text-base">
              <Link href="/guider/elavtal/rorligt-vs-kvartspris" className={LINK_CLASS}>
                Rörligt pris eller kvartspris?
              </Link>
            </p>
          </section>

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

        </PageReading>
      </div>
    </>
  );
}
