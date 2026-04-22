import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import SwedenMap from "@/components/SwedenMap";

// ─── Types ────────────────────────────────────────────────────────────────────

type AreaKey = "se1" | "se2" | "se3" | "se4";

interface FaqItem {
  q: string;
  a: string;
}

interface AreaContent {
  intro: string;
  why_price: string;
  production: string;
  counties: string[];
  faq: FaqItem[];
}

// ─── Area metadata ────────────────────────────────────────────────────────────

const AREA_META = {
  se1: { name: "SE1", city: "Luleå",    region: "Norra Sverige" },
  se2: { name: "SE2", city: "Sundsvall", region: "Norra mellansverige" },
  se3: { name: "SE3", city: "Stockholm", region: "Södra mellansverige" },
  se4: { name: "SE4", city: "Malmö",    region: "Södra Sverige" },
} as const;

// ─── Evergreen content ────────────────────────────────────────────────────────

const AREA_CONTENT: Record<AreaKey, AreaContent> = {
  se1: {
    intro:
      "SE1 är Sveriges nordligaste elområde och omfattar Norrbottens och Västerbottens län. Området har Sveriges lägsta elpriser tack vare enorm vattenkraftproduktion och låg befolkningstäthet.",
    why_price:
      "SE1 producerar långt mer el än vad området förbrukar, vilket ger ett konstant överskott. Överföringskapaciteten söderut är begränsad, vilket håller priserna nere lokalt.",
    production:
      "Vattenkraft dominerar helt – älvar som Lule älv och Ume älv är bland Europas kraftigaste.",
    counties: ["Norrbottens län", "Västerbottens län"],
    faq: [
      {
        q: "Varför är elpriset lägst i SE1?",
        a: "SE1 har Sveriges största vattenkraftproduktion och exporterar el söderut. Överföringskapaciteten är begränsad vilket skapar ett lokalt prisöverskott.",
      },
      {
        q: "Vilka städer ingår i SE1?",
        a: "Luleå, Umeå, Skellefteå, Kiruna och Gällivare är de största städerna i elområde SE1.",
      },
      {
        q: "Hur ofta är priset negativt i SE1?",
        a: "Negativt elpris förekommer i SE1 under perioder med hög vattenkraftproduktion och låg förbrukning, särskilt under vår och höst.",
      },
    ],
  },
  se2: {
    intro:
      "SE2 omfattar Jämtlands, Västernorrlands, Dalarnas och Gävleborgs län. Området är en viktig transitzon för el som produceras i norr och ska förbrukas i söder.",
    why_price:
      "SE2 har också stor vattenkraftproduktion men ligger geografiskt mellan det elrika norr och det elfattiga söder. Priserna är låga men något högre än SE1.",
    production:
      "Vattenkraft är dominerande med älvar som Indalsälven och Ljungan. Vindkraft växer snabbt i fjällområdena.",
    counties: [
      "Jämtlands län",
      "Västernorrlands län",
      "Dalarnas län",
      "Gävleborgs län",
    ],
    faq: [
      {
        q: "Vad ingår i elområde SE2?",
        a: "SE2 omfattar mellersta Norrland och inkluderar städer som Sundsvall, Östersund, Falun och Gävle.",
      },
      {
        q: "Varför är SE2 billigare än SE3?",
        a: "SE2 har mer vattenkraftproduktion per capita än SE3 och är fysiskt närmare de stora kraftverken i norr.",
      },
      {
        q: "Hur påverkar vindkraft priset i SE2?",
        a: "Ökad vindkraftsutbyggnad i SE2 pressar priserna nedåt, särskilt under blåsiga perioder.",
      },
    ],
  },
  se3: {
    intro:
      "SE3 är Sveriges folkrikaste elområde och inkluderar Stockholm, Göteborg och stora delar av Mellansverige. Här bor drygt 60% av Sveriges befolkning.",
    why_price:
      "SE3 förbrukar mer el än vad som produceras lokalt och är beroende av import från norr och utlandet. Det gör priserna mer känsliga för väder, exportkapacitet och europeiska gaspriser.",
    production:
      "Kärnkraft från Ringhals och Forsmark är basen. Vindkraft och solenergi växer kraftigt. Vattenkraften är begränsad jämfört med norr.",
    counties: [
      "Stockholms län",
      "Uppsala län",
      "Västra Götalands län",
      "Örebro län",
      "Västmanlands län",
      "Södermanlands län",
      "Östergötlands län",
      "Värmlands län",
      "Gotlands län",
    ],
    faq: [
      {
        q: "Varför är elpriset högre i SE3 än i norra Sverige?",
        a: "SE3 importerar el från norr och utlandet för att täcka sitt underskott. Överföringskapaciteten är begränsad och europeiska energipriser påverkar mer direkt.",
      },
      {
        q: "Ingår Gotland i SE3?",
        a: "Ja, Gotland tillhör elområde SE3 men är anslutet via en separat likströmskabel till fastlandet.",
      },
      {
        q: "Hur påverkar kärnkraften elpriset i SE3?",
        a: "Kärnkraftverken Ringhals och Forsmark levererar stabil baskraft som dämpar prissvängningar. Planerade revisioner kan tillfälligt höja priserna.",
      },
    ],
  },
  se4: {
    intro:
      "SE4 är Sveriges sydligaste elområde och omfattar Skåne, Blekinge, Halland och södra Småland. Området har starka kopplingar till de europeiska och danska elnäten.",
    why_price:
      "SE4 importerar el från Danmark och Polen via flera elkablar. Priserna påverkas starkt av vindkraft i Danmark och kontinentens gaspriser, vilket ger stora svängningar.",
    production:
      "Vindkraft dominerar allt mer i SE4. Kärnkraftverket Barsebäck är nedlagt. Bioenergi och viss vattenkraft kompletterar.",
    counties: [
      "Skåne län",
      "Blekinge län",
      "Hallands län",
      "Kronobergs län",
      "Kalmar län",
    ],
    faq: [
      {
        q: "Varför är SE4 ofta dyrast i Sverige?",
        a: "SE4 är starkt kopplat till det europeiska elnätet där gas- och kolkraft sätter marginalpriset. När Europa är dyrare smittar det av sig på SE4.",
      },
      {
        q: "Vilka länder påverkar elpriset i SE4?",
        a: "Danmark, Tyskland och Polen påverkar SE4 mest via direkta elkablar. Hög vindkraft i Danmark kan ge låga priser, medan gasbrister i Europa driver upp dem.",
      },
      {
        q: "Vad hände när Barsebäck stängdes?",
        a: "Nedläggningen av Barsebäck kärnkraftverk ökade SE4:s importberoende och bidrog till att priserna i söder ibland överstiger resten av Sverige.",
      },
    ],
  },
};

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return ["se1", "se2", "se3", "se4"].map((area) => ({ area }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const meta = AREA_META[area as AreaKey];
  if (!meta) return {};
  return {
    title: `Elpris ${meta.name} | Spotpris ${meta.city} & ${meta.region} – elpris.ai`,
    description: `Se aktuellt elpris för elområde ${meta.name} (${meta.city}, ${meta.region}). Timpriser idag och imorgon i öre/kWh.`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ElprisArea({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const meta = AREA_META[area as AreaKey];
  const content = AREA_CONTENT[area as AreaKey];

  if (!meta || !content) {
    return (
      <main className="min-h-screen bg-[#0A2540] text-white flex items-center justify-center">
        <p className="text-[#8fafc9]">Okänt elområde.</p>
      </main>
    );
  }

  const otherAreas = (["se1", "se2", "se3", "se4"] as AreaKey[]).filter(
    (a) => a !== area
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elpris.ai" },
      { "@type": "ListItem", position: 2, name: "Elområden", item: "https://www.elpris.ai/elomrade/se3" },
      { "@type": "ListItem", position: 3, name: `${meta.name} – ${meta.city}`, item: `https://www.elpris.ai/elomrade/${area}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col items-center">

          {/* ── Header ── */}
          <section className="w-full flex flex-col gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <a href="/" className="hover:text-[#00E5FF] transition-colors">Hem</a>
              <span>/</span>
              <a href="/elomrade/se3" className="hover:text-[#00E5FF] transition-colors">Elområden</a>
              <span>/</span>
              <span className="text-white">{meta.name} – {meta.city}</span>
            </div>

            {/* Area selector */}
            <div className="flex flex-row flex-wrap justify-center gap-2 mb-2 mt-2">
              {Object.entries(AREA_META).map(([key, m]) => (
                <Link
                  key={key}
                  href={`/elomrade/${key}`}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
                    key === area
                      ? "bg-[#00E5FF] text-[#0A2540] shadow-lg shadow-[#00E5FF]/20"
                      : "bg-[#0F3460] border border-[#1E4976] text-[#8fafc9] hover:border-[#00E5FF]/40 hover:text-white"
                  }`}
                >
                  {m.name} – {m.city}
                </Link>
              ))}
            </div>

            {/* Map */}
            <div className="mb-2">
              <div className="w-full max-w-[260px] mx-auto">
                <SwedenMap />
              </div>
            </div>

            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elpris {meta.name} – {meta.city}
            </h1>
            <p className="text-[#8fafc9] text-base md:text-lg">
              {meta.region} · Spotpris i öre/kWh exkl. moms & nätavgift
            </p>
          </section>

          {/* ── Content section ── */}
          <div className="w-full flex flex-col gap-8 mt-12">

            {/* Intro + why price */}
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-[#e2eaf4] leading-relaxed">{content.intro}</p>
              <p className="text-[#a8c4d8] leading-relaxed">{content.why_price}</p>
            </div>

            {/* Production + counties row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Production */}
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-[#8fafc9] text-xs font-medium uppercase tracking-wider">
                  Dominerande produktion
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <p className="text-[#e2eaf4] text-sm leading-relaxed">{content.production}</p>
                </div>
              </div>

              {/* Counties */}
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-[#8fafc9] text-xs font-medium uppercase tracking-wider">
                  Ingående län
                </p>
                <div className="flex flex-wrap gap-2">
                  {content.counties.map((county) => (
                    <span
                      key={county}
                      className="px-3 py-1 bg-[#0A2540] border border-[#1E4976] rounded-full text-xs text-[#e2eaf4]"
                    >
                      {county}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1E4976]">
                <h2 className="font-bold text-lg">Vanliga frågor om {meta.name}</h2>
              </div>
              <div className="divide-y divide-[#1E4976]">
                {content.faq.map((item, i) => (
                  <div key={i} className="px-6 py-5 flex flex-col gap-2">
                    <p className="font-semibold text-white text-sm">{item.q}</p>
                    <p className="text-[#a8c4d8] text-sm leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex justify-center">
              <Link
                href="/elpris-idag"
                className="px-6 py-3 bg-[#00E5FF] text-[#0A2540] font-semibold rounded-xl hover:bg-[#00c4db] transition-colors shadow-lg shadow-[#00E5FF]/20"
              >
                Se aktuella priser →
              </Link>
            </div>

            {/* See also */}
            <div className="flex flex-col gap-3">
              <p className="text-[#8fafc9] text-sm font-medium">Se även:</p>
              <div className="flex flex-wrap gap-3">
                {otherAreas.map((a) => {
                  const m = AREA_META[a];
                  return (
                    <a
                      key={a}
                      href={`/elomrade/${a}`}
                      className="bg-[#0F3460] border border-[#1E4976] hover:border-[#00E5FF]/40 hover:text-white text-[#8fafc9] rounded-xl px-4 py-2.5 text-sm transition-colors"
                    >
                      <span className="font-semibold text-white">{m.name}</span>
                      <span className="mx-1.5 text-[#1E4976]">·</span>
                      {m.city}, {m.region}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <section className="w-full border-t border-[#1E4976] pt-8 pb-4 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8fafc9]">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <a href="/" className="font-extrabold text-sm text-[#8fafc9]">
                elpris<span className="text-[#00E5FF]">.ai</span>
              </a>
              <a href="/integritetspolicy" className="hover:text-[#00E5FF] transition-colors">
                Integritetspolicy
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <span>Data från Supabase · elprisetjustnu.se</span>
              <span>Uppdateras var 15:e minut</span>
              <span>Spotpris exkl. moms & nätavgift</span>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
