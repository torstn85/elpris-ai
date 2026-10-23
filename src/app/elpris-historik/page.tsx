import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import FaqAccordion, { type FaqItem } from "@/components/dynamic/FaqAccordion";
import HistoryChart, { type HistoryChartPoint } from "@/components/history/HistoryChart";
import PageWide from "@/components/layout/PageWide";
import {
  formatDayLong,
  formatDayMonthShort,
  formatDayShort,
  formatMonthLong,
  formatMonthShort,
  formatSwedishDay,
  monthName,
} from "@/lib/format/date";
import { ore1 } from "@/lib/format/ore";
import { OG_HISTORY_URL } from "@/lib/og/images";
import { HISTORY_AREAS, HISTORY_FROM, loadHistory, type HistoryArea, type PriceHistory } from "@/lib/prices/history";
import { pageMeta } from "@/lib/seo";

// Medvetet undantag från force-dynamic: historiken ändras bara en gång per
// dygn. Omvalidering varje timme gör att "Data till och med" blir rätt strax
// efter midnatt. Läsfel kastas – vid omvalidering ligger den gamla sidan kvar.
export const revalidate = 3600;

const PAGE_URL = "https://www.elpris.ai/elpris-historik";
const NB = " ";

export const metadata: Metadata = pageMeta({
  path: "/elpris-historik",
  title: "Elpris historik – historiska elpriser per månad och år (SE1–SE4)",
  description:
    "Historiska elpriser för SE1–SE4 sedan november 2021 – graf, månadssnitt, årssnitt och rekord. Se hur spotpriset har ändrats från krisåret 2022 till i dag.",
  image: { url: OG_HISTORY_URL, alt: "Elpris historik – månadssnitt för SE1–SE4 sedan november 2021" },
});

const H2 = "font-bold text-2xl md:text-3xl text-white mb-6";
const BOX = "bg-[#0F3460] border border-[#1E4976] rounded-2xl";
const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";
const NOTE = "text-xs text-[#8fafc9] mt-3 leading-relaxed";
const P = "text-[#e2eaf4] leading-relaxed";
const TH = "text-left px-2 sm:px-5 py-3 font-medium";
const TD = "px-2 sm:px-5 py-3 text-right tabular-nums whitespace-nowrap";

// ─── Formatering ──────────────────────────────────────────────────────────────

const round1 = (v: number) => Math.round(v * 10) / 10;
const oreKwh = (v: number) => `${ore1(v)}${NB}öre/kWh`;
const ore = (v: number) => `${ore1(v)}${NB}öre`;
const pct = (v: number) => `${ore1(v)}${NB}%`;
const ORDINALS = ["dyraste", "näst dyraste", "tredje dyraste", "fjärde dyraste", "femte dyraste", "sjätte dyraste"];

/** "SE1, SE2 och SE3" */
function listAreas(areas: string[]): string {
  return areas.length <= 1 ? areas.join("") : `${areas.slice(0, -1).join(", ")} och ${areas[areas.length - 1]}`;
}

// ─── Härledda värden ur historiken ────────────────────────────────────────────

function derive(h: PriceHistory) {
  const latestLabel = formatDayMonthShort(h.latest);
  // Innevarande år: "2026 (t.o.m. 22 okt)", parentesen på egen rad på smal skärm.
  const yearLabel = (y: { year: number; partial: boolean }) =>
    y.partial ? (
      <>
        {y.year} <span className="block sm:inline font-normal text-[#8fafc9]">(t.o.m. {latestLabel})</span>
      </>
    ) : (
      String(y.year)
    );

  const maxMonth = HISTORY_AREAS.map((a) => ({ area: a, ...h.records[a].maxMonth })).reduce((x, r) => (r.avg > x.avg ? r : x));
  const maxDay = HISTORY_AREAS.map((a) => ({ area: a, ...h.records[a].maxDay })).reduce((x, r) => (r.avg > x.avg ? r : x));
  const minDay = HISTORY_AREAS.map((a) => ({ area: a, ...h.records[a].minDay })).reduce((x, r) => (r.avg < x.avg ? r : x));
  const minMonth = HISTORY_AREAS.map((a) => ({ area: a, ...h.records[a].minMonth })).reduce((x, r) => (r.avg < x.avg ? r : x));
  const dayValues = HISTORY_AREAS.map((a) => h.cheapestDayAllAreas.avg[a]);
  const minDayWholeCountry =
    h.cheapestDayAllAreas.date === minDay.date &&
    dayValues.every((v) => v !== null && round1(v) === round1(minDay.avg));

  const year = (y: number) => h.years.find((x) => x.year === y);
  const current = h.years.find((y) => y.partial);

  // "Hittills är 2026 det näst dyraste året …" – bara om rangen är densamma i alla områden.
  let rankSentence: string | null = null;
  if (current && h.years.length > 1) {
    const ranks = HISTORY_AREAS.map(
      (a) => [...h.years].sort((x, y) => y.avg[a] - x.avg[a]).findIndex((y) => y.year === current.year),
    );
    if (ranks.every((r) => r === ranks[0])) {
      const word = ranks[0] === h.years.length - 1 ? "billigaste" : ORDINALS[ranks[0]];
      if (word) rankSentence = `Hittills är ${current.year} det ${word} året i vår data i alla fyra områden.`;
    }
  }

  // Kvoten vinter 2023/24 mot sommar 2024 i SE3, ur de avrundade talen i tabellen.
  const w24 = h.seasons.find((s) => s.kind === "winter" && s.year === 2024);
  const s24 = h.seasons.find((s) => s.kind === "summer" && s.year === 2024);
  const ratioSe3 = w24 && s24 ? ore1(round1(w24.avg.SE3) / round1(s24.avg.SE3)) : null;

  // Andel negativ tid i år: lägsta–högsta av områdena.
  let negativeThisYear: string | null = null;
  if (current) {
    const vals = HISTORY_AREAS.map((a) => round1(current.negativeShare[a]));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    negativeThisYear = lo === hi ? pct(lo) : `${ore1(lo)}–${ore1(hi)}${NB}%`;
  }

  // FAQ: dyraste månad per område, grupperat på månad.
  const groups = new Map<string, HistoryArea[]>();
  for (const a of HISTORY_AREAS) {
    const m = h.records[a].maxMonth.month;
    groups.set(m, [...(groups.get(m) ?? []), a]);
  }
  const sortedGroups = Array.from(groups.entries()).sort((x, y) => y[1].length - x[1].length);
  const maxMonthAnswer =
    sortedGroups.length === 1
      ? `I alla fyra elområden var ${formatMonthLong(sortedGroups[0][0])} den dyraste månaden.`
      : sortedGroups
          .map(([m, areas], i) =>
            i === 0
              ? `I ${listAreas(areas)} var ${formatMonthLong(m)} den dyraste månaden.`
              : areas.length === 1
                ? `I ${areas[0]} var det ${formatMonthLong(m)}, med ${oreKwh(h.records[areas[0]].maxMonth.avg)} i snitt.`
                : `I ${listAreas(areas)} var det ${formatMonthLong(m)}.`,
          )
          .join(" ");

  return {
    latestLabel,
    yearLabel,
    maxMonth,
    maxDay,
    minDay,
    minMonth,
    minDayWholeCountry,
    year,
    rankSentence,
    ratioSe3,
    negativeThisYear,
    maxMonthAnswer,
  };
}

// ─── Sida ─────────────────────────────────────────────────────────────────────

export default async function ElprisHistorikPage() {
  const h = await loadHistory();
  const d = derive(h);
  const se4Max = h.records.SE4.maxMonth;
  const se1Min = h.records.SE1.minMonth;
  const y2022 = d.year(2022);
  const y2025 = d.year(2025);

  const chartData: HistoryChartPoint[] = h.months.map((m) => ({
    month: m.month,
    partial: m.partial,
    SE1: m.avg.SE1 === null ? null : round1(m.avg.SE1),
    SE2: m.avg.SE2 === null ? null : round1(m.avg.SE2),
    SE3: m.avg.SE3 === null ? null : round1(m.avg.SE3),
    SE4: m.avg.SE4 === null ? null : round1(m.avg.SE4),
  }));

  // "torsdag 22 oktober" – står mitt i meningen, gemen veckodag.
  const latestDay = formatSwedishDay(new Date(`${h.latest}T12:00:00Z`));
  const monthYears = Array.from(new Set(h.months.map((m) => m.month.slice(0, 4)))).sort().reverse();

  const faq: FaqItem[] = [
    {
      question: "Vilket år var elpriset högst?",
      answer: y2022
        ? `2022 var det dyraste året i vår data i alla fyra elområden. Spotpriset låg då i snitt på ${ore1(y2022.avg.SE1)}${NB}öre/kWh i SE1, ${ore1(y2022.avg.SE2)} i SE2, ${ore1(y2022.avg.SE3)} i SE3 och ${ore1(y2022.avg.SE4)} i SE4, exkl. moms.`
        : "",
    },
    { question: "Vilken månad har elpriset varit dyrast?", answer: d.maxMonthAnswer },
    {
      question: "Är elen alltid dyrare på vintern?",
      answer:
        "Oftast, men inte alltid. Sommaren 2022 var dyrare än vintern 2021/22 i SE3 och SE4. Hur stor skillnaden mellan vinter och sommar är varierar mycket från år till år.",
    },
    {
      question: "Vad är det lägsta elpriset som har noterats?",
      answer: `Det billigaste dygnet i vår data var den 16${NB}juli 2023, då dygnssnittet var −9,6${NB}öre/kWh i hela landet. Den billigaste månaden var ${formatMonthLong(d.minMonth.month)} i ${d.minMonth.area}, med ${oreKwh(d.minMonth.avg)} i snitt.`,
    },
    {
      question: "Hur långt tillbaka går historiken?",
      answer:
        "Till 1 november 2021. Fram till oktober 2025 sattes elpriset per timme och sedan dess per kvart, så historiken har timpriser fram till dess.",
    },
    {
      question: "Ingår moms och nätavgift i siffrorna?",
      answer:
        "Nej. Siffrorna är spotpris exkl. moms. På elräkningen tillkommer elhandlarens påslag, energiskatt, nätavgift och moms.",
      link: { href: "/guider/forsta-elpriset/elprisets-bestandsdelar", text: "Se vad elpriset består av" },
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hem", item: "https://www.elpris.ai" },
        { "@type": "ListItem", position: 2, name: "Elpris historik", item: PAGE_URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Historiska elpriser i Sverige per elområde (SE1–SE4)",
      description:
        "Månadssnitt, årssnitt och rekord för spotpriset i SE1–SE4 sedan november 2021, tidsviktat medel i öre/kWh exkl. moms. Timpriser före oktober 2025, kvartspriser därefter.",
      url: PAGE_URL,
      keywords: ["elpris historik", "historiska elpriser", "spotpris", "SE1", "SE2", "SE3", "SE4", "Sverige"],
      isAccessibleForFree: true,
      license: "https://www.elprisetjustnu.se/elpris-api",
      creator: { "@type": "Organization", name: "elpris.ai", url: "https://www.elpris.ai" },
      temporalCoverage: `${HISTORY_FROM}/${h.latest}`,
      spatialCoverage: { "@type": "Place", name: "Sverige" },
      variableMeasured: "Spotpris, öre/kWh exkl. moms",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.link ? `${f.answer} ${f.link.text}.` : f.answer },
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((ld) => (
        <script key={ld["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <main className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <PageWide className="py-12 flex flex-col gap-12">
          {/* B.1–B.2 Brödsmulor, H1, ingress */}
          <section className="flex flex-col gap-4">
            <nav aria-label="Brödsmulor" className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <Link href="/" className="hover:text-[#00E5FF] transition-colors">Hem</Link>
              <span>›</span>
              <span className="text-white">Elpris historik</span>
            </nav>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elpris historik – så har elpriset varierat sedan 2021
            </h1>
            <p className="text-[#e2eaf4] text-base md:text-lg max-w-3xl leading-relaxed">
              Här ser du historiska elpriser för alla fyra elområden sedan november 2021, månad för månad och år för år.
              Spannet är enormt: i {formatMonthLong(se4Max.month)} kostade spotpriset i SE4 i snitt {oreKwh(se4Max.avg)},
              och i {formatMonthLong(se1Min.month)} låg det på {ore(se1Min.avg)} i SE1. Siffrorna räknas fram ur vår egen
              prisdata och uppdateras varje dygn.
            </p>
            <p className="text-sm text-[#8fafc9]">
              Data till och med {latestDay.charAt(0).toLowerCase() + latestDay.slice(1)} · Spotpris exkl. moms
            </p>
          </section>

          {/* B.3 Fyra nyckeltal */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${BOX} p-5`}>
                <p className="text-sm font-semibold text-[#8fafc9]">Dyraste månaden</p>
                <p className="text-white mt-2">
                  {d.maxMonth.area} {formatMonthLong(d.maxMonth.month)}
                </p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{oreKwh(d.maxMonth.avg)}</p>
              </div>
              <div className={`${BOX} p-5`}>
                <p className="text-sm font-semibold text-[#8fafc9]">Dyraste dygnet</p>
                <p className="text-white mt-2">
                  {d.maxDay.area} {formatDayLong(d.maxDay.date)}
                </p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{oreKwh(d.maxDay.avg)}</p>
              </div>
              <div className={`${BOX} p-5`}>
                <p className="text-sm font-semibold text-[#8fafc9]">Billigaste dygnet</p>
                <p className="text-white mt-2">{formatDayLong(d.minDay.date)}</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                  {oreKwh(d.minDay.avg)}
                  {d.minDayWholeCountry && <span className="text-base font-normal text-[#e2eaf4]"> i hela landet</span>}
                </p>
              </div>
              <div className={`${BOX} p-5`}>
                <p className="text-sm font-semibold text-[#8fafc9]">Årssnitt SE3</p>
                <p className="text-white mt-2 tabular-nums">
                  {y2022 && <>2022: {ore(y2022.avg.SE3)}</>}
                  {y2022 && y2025 && " · "}
                  {y2025 && <>2025: {ore(y2025.avg.SE3)}</>}
                </p>
              </div>
            </div>
            <p className={NOTE}>Spotpris exkl. moms, tidsviktat medel.</p>
          </section>

          {/* B.4 Graf */}
          <section>
            <h2 className={H2}>Elpriser historik – graf per månad sedan 2021</h2>
            <HistoryChart data={chartData} />
            <p className={NOTE}>
              Månadssnitt av spotpriset (tidsviktat medel) i öre/kWh exkl. moms och nätavgift. Innevarande månad visar
              snittet hittills.
            </p>
          </section>

          {/* B.5 Årssnitt */}
          <section className="max-w-3xl">
            <h2 className={H2}>Elpris per år – årssnitt 2022–2026</h2>
            <div className={`${BOX} overflow-x-auto`}>
              <table className="w-full text-sm">
                <caption className="sr-only">Årssnitt av spotpriset per elområde, öre/kWh exkl. moms</caption>
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th scope="col" className={TH}>År</th>
                    {HISTORY_AREAS.map((a) => (
                      <th key={a} scope="col" className={`${TH} text-right`}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h.years.map((y) => (
                    <tr key={y.year} className="border-b border-[#1E4976]/50 last:border-0">
                      <th scope="row" className={`${TH} font-semibold text-white`}>{d.yearLabel(y)}</th>
                      {HISTORY_AREAS.map((a) => (
                        <td key={a} className={`${TD} text-white`}>{ore1(y.avg[a])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={NOTE}>2021 saknas eftersom vår data börjar 1 november 2021.</p>
            <div className="flex flex-col gap-4 mt-6">
              <p className={P}>
                2022 är det dyraste året i vår data i alla fyra elområden. Sedan dess har nivån sjunkit, men inte i en rak
                linje: i SE3 och SE4 var 2024 det billigaste året, och i SE1 och SE2 var det 2025.
              </p>
              {d.rankSentence && <p className={P}>{d.rankSentence}</p>}
            </div>
          </section>

          {/* B.6 Krisåret 2022 */}
          <section className="max-w-3xl">
            <h2 className={H2}>Elpriset 2022 – varför blev det så dyrt?</h2>
            <div className="flex flex-col gap-4">
              <p className={P}>
                Pristoppen kom på hösten och vintern 2022. I SE4 var augusti 2022 den dyraste månaden i vår data, med
                305,6 öre/kWh i snitt, och det dyraste dygnet kom den 22 augusti med 577,3 öre. I SE1, SE2 och SE3 var
                december 2022 dyrast. Den 14 december 2022 hade hela Sverige samma pris under dygnets alla timmar:
                483,2 öre/kWh i snitt, vilket är det dyraste dygnet i vår data för SE1 och SE2.
              </p>
              <p className={P}>
                Enligt Energimyndigheten var höga priser på naturgas och utsläppsrätter en viktig drivkraft till de höga
                elpriserna 2022, både i Tyskland och i Norden. I början av december 2022 tillkom kyla och svag vind,
                isbildning på vindkraftverken, isläggning i älvarna som begränsade vattenkraften och att reaktorn
                Oskarshamn 3 stod still i nio dagar.
              </p>
            </div>
            <p className={NOTE}>
              Källa: Energimyndigheten,{" "}
              <a
                href="https://www.energimyndigheten.se/48dc50/globalassets/om-oss/lagesrapporter/elmarknaden/2022/nulaget-pa-elmarknaden-december-2022.pdf"
                className="text-[#00E5FF] hover:underline"
                rel="noopener"
              >
                Nuläget på elmarknaden december 2022
              </a>{" "}
              (publicerad 10 januari 2023). Prissiffrorna: elpris.ai:s egen prisdata.
            </p>
          </section>

          {/* B.7 Vinter mot sommar */}
          <section className="max-w-3xl">
            <h2 className={H2}>Är elen alltid dyrast på vintern?</h2>
            <p className={`${P} mb-6`}>
              Nej, inte alltid. De flesta år har vintern (december–februari) varit dyrare än sommaren efter (juni–augusti),
              men skillnaden varierar kraftigt mellan år och elområden. Sommaren 2022 var dyrare än vintern innan i SE3 och
              SE4 och ungefär lika dyr i SE2. Vintern 2023/24 kostade däremot {d.ratioSe3} gånger så mycket som sommaren
              2024 i SE3.
            </p>
            <div className={`${BOX} overflow-x-auto`}>
              <table className="w-full text-sm">
                <caption className="sr-only">Snitt för vinter och sommar per elområde, öre/kWh exkl. moms</caption>
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th scope="col" className={TH}>Säsong</th>
                    {HISTORY_AREAS.map((a) => (
                      <th key={a} scope="col" className={`${TH} text-right`}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h.seasons.map((s) => (
                    <tr key={`${s.kind}-${s.year}`} className="border-b border-[#1E4976]/50 last:border-0">
                      <th scope="row" className={`${TH} font-semibold text-white`}>
                        {s.kind === "winter" ? `vinter ${s.year - 1}/${String(s.year).slice(2)}` : `sommar ${s.year}`}
                      </th>
                      {HISTORY_AREAS.map((a) => (
                        <td key={a} className={`${TD} text-white`}>{ore1(s.avg[a])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={NOTE}>Vinter = december–februari, sommar = juni–augusti. Tidsviktat medel av spotpriset exkl. moms.</p>
          </section>

          {/* B.8 Negativa elpriser */}
          <section className="max-w-3xl">
            <h2 className={H2}>Hur ofta har elpriset varit negativt?</h2>
            <p className={`${P} mb-6`}>
              Negativa spotpriser var nästan okända 2022 (0,3 % av tiden) men blev betydligt vanligare 2023–2025. Flest
              var de 2024, då priset låg under noll 7–8 % av tiden i alla elområden.
              {d.negativeThisYear && <> Hittills i år är andelen {d.negativeThisYear}.</>} Det billigaste dygnet i hela vår
              data var den 16 juli 2023, då dygnssnittet var −9,6 öre/kWh i alla fyra elområden.
            </p>
            <div className={`${BOX} overflow-x-auto`}>
              <table className="w-full text-sm">
                <caption className="sr-only">Andel tid med negativt spotpris per år och elområde</caption>
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th scope="col" className={TH}>År</th>
                    {HISTORY_AREAS.map((a) => (
                      <th key={a} scope="col" className={`${TH} text-right`}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h.years.map((y) => (
                    <tr key={y.year} className="border-b border-[#1E4976]/50 last:border-0">
                      <th scope="row" className={`${TH} font-semibold text-white`}>{d.yearLabel(y)}</th>
                      {HISTORY_AREAS.map((a) => (
                        <td key={a} className={`${TD} text-white`}>{pct(y.negativeShare[a])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={NOTE}>Andel av tiden med spotpris under 0 öre. Före oktober 2025 räknas timmar, därefter kvartar.</p>
            <p className={`${P} mt-4`}>
              Läs mer:{" "}
              <Link href="/guider/forsta-elpriset/negativa-elpriser" className={LINK}>
                Negativa elpriser – så fungerar det
              </Link>
            </p>
          </section>

          {/* B.9 Rekord */}
          <section>
            <h2 className={H2}>Rekord per elområde</h2>
            <div className={`${BOX} overflow-x-auto`}>
              <table className="w-full text-sm">
                <caption className="sr-only">Dyraste och billigaste månad och dygn per elområde</caption>
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th scope="col" className={TH}>Elområde</th>
                    <th scope="col" className={TH}>Dyraste månaden</th>
                    <th scope="col" className={TH}>Billigaste månaden</th>
                    <th scope="col" className={TH}>Dyraste dygnet</th>
                    <th scope="col" className={TH}>Billigaste dygnet</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORY_AREAS.map((a) => {
                    const r = h.records[a];
                    const cell = "px-3 sm:px-5 py-3 text-white tabular-nums whitespace-nowrap";
                    return (
                      <tr key={a} className="border-b border-[#1E4976]/50 last:border-0">
                        <th scope="row" className={`${TH} font-semibold text-white`}>{a}</th>
                        <td className={cell}>{formatMonthShort(r.maxMonth.month)} · {ore(r.maxMonth.avg)}</td>
                        <td className={cell}>{formatMonthShort(r.minMonth.month)} · {ore(r.minMonth.avg)}</td>
                        <td className={cell}>{formatDayShort(r.maxDay.date)} · {ore(r.maxDay.avg)}</td>
                        <td className={cell}>{formatDayShort(r.minDay.date)} · {ore(r.minDay.avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={NOTE}>Månader: hela kalendermånader. Dygn: dygnssnitt. Spotpris exkl. moms, tidsviktat medel.</p>
          </section>

          {/* B.9 Månadstabell */}
          <section className="max-w-3xl">
            <h2 className={H2}>Historiska elpriser per månad</h2>
            <div className="flex flex-col gap-3">
              {monthYears.map((year, i) => (
                <details key={year} open={i === 0} className={`${BOX} px-4 sm:px-5 py-4 group`}>
                  <summary className="font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-3">
                    <span>{year}</span>
                    <span className="text-[#00E5FF] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Månadssnitt {year} per elområde, öre/kWh exkl. moms</caption>
                      <thead>
                        <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                          <th scope="col" className="text-left pr-2 sm:pr-4 py-2 font-medium">Månad</th>
                          {HISTORY_AREAS.map((a) => (
                            <th key={a} scope="col" className="text-right px-1.5 sm:px-4 py-2 font-medium">{a}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {h.months
                          .filter((m) => m.month.startsWith(year))
                          .map((m) => (
                            <tr key={m.month} className="border-b border-[#1E4976]/50 last:border-0">
                              <th scope="row" className="text-left pr-2 sm:pr-4 py-2 font-normal text-[#e2eaf4]">
                                {monthName(m.month)}
                                {m.partial ? " (hittills)" : ""}
                              </th>
                              {HISTORY_AREAS.map((a) => (
                                <td key={a} className="text-right px-1.5 sm:px-4 py-2 tabular-nums text-white">
                                  {m.avg[a] === null ? "–" : ore1(m.avg[a]!)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
            <p className={NOTE}>
              SE2 saknar 4 dygn 2022 (4, 10 och 15 september, 20 oktober) och SE3 saknar 4 november 2021 i källdatan. De
              dygnen räknas inte.
            </p>
          </section>

          {/* B.10 FAQ */}
          <section className="max-w-3xl">
            <h2 className={H2}>Vanliga frågor om historiska elpriser</h2>
            <FaqAccordion items={faq} />
          </section>

          {/* B.11 Så räknar vi */}
          <section className="max-w-3xl">
            <h2 className={H2}>Så räknar vi</h2>
            <ul className="list-disc pl-5 space-y-2 text-[#e2eaf4] leading-relaxed">
              <li>
                Källa: elpris.ai:s egen prisdata, hämtad från elprisetjustnu.se (som bygger på ENTSO-E). Data från
                1 november 2021.
              </li>
              <li>
                Snitten är tidsviktade: varje timpris väger en timme och varje kvartspris en kvart. Det motsvarar vad ett
                hushåll med jämn förbrukning skulle ha betalat i spotpris i snitt.
              </li>
              <li>Spotpris exkl. moms, påslag, energiskatt och nätavgift.</li>
              <li>Dygn som saknas i källdatan räknas inte. Siffrorna uppdateras en gång per dygn.</li>
            </ul>
          </section>

          {/* B.12 Vidare läsning */}
          <section className="max-w-3xl">
            <h2 className={H2}>Mer om elpriset</h2>
            <ul className="space-y-2 text-[#e2eaf4] leading-relaxed">
              <li>
                <Link href="/elpris-idag" className={LINK}>Elpriset idag</Link> – dagens pris per kvart och timme
              </li>
              <li>
                <Link href="/elpris-imorgon" className={LINK}>Elpriset imorgon</Link> – publiceras runt kl 13:15
              </li>
              <li>
                <Link href="/guider/forsta-elpriset/framtidens-elpriser" className={LINK}>Elpris prognos 2027–2030</Link> –
                så väntas elpriset utvecklas
              </li>
              <li>
                <Link href="/guider/forsta-elpriset/dygnsmonster-elpris" className={LINK}>
                  När är elen billigast på dygnet?
                </Link>
              </li>
              <li>
                <Link href="/elomrade" className={LINK}>Elområden i Sverige</Link> – SE1–SE4 förklarade
              </li>
            </ul>
          </section>

          {/* B.13 Fotnot */}
          <p className="text-xs text-[#8fafc9] max-w-3xl">
            Spotpris exkl. moms, tidsviktat medel. Timpriser före oktober 2025, kvartspriser därefter. Källa: elpris.ai:s
            egen prisdata från 1 november 2021.
          </p>
        </PageWide>
      </main>
    </>
  );
}
