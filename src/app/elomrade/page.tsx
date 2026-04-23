import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import SwedenMap from "@/components/SwedenMap";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Elområden i Sverige | SE1, SE2, SE3, SE4 – elpris.ai",
  description:
    "Lär dig om Sveriges fyra elområden SE1–SE4. Förstå varför elpriset skiljer sig åt i Luleå, Sundsvall, Stockholm och Malmö.",
};

// ─── Area data ────────────────────────────────────────────────────────────────

const AREAS = [
  { key: "se1", name: "SE1", city: "Luleå",    region: "Norra Sverige",          priceLevel: "Lägst" },
  { key: "se2", name: "SE2", city: "Sundsvall", region: "Norra mellansverige",    priceLevel: "Lågt" },
  { key: "se3", name: "SE3", city: "Stockholm", region: "Södra mellansverige",    priceLevel: "Medel" },
  { key: "se4", name: "SE4", city: "Malmö",     region: "Södra Sverige",          priceLevel: "Högst" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ElomradenPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elpris.ai" },
      { "@type": "ListItem", position: 2, name: "Elområden", item: "https://www.elpris.ai/elomrade" },
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

        <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-12">

          {/* ── Header ── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <a href="/" className="hover:text-[#00E5FF] transition-colors">Hem</a>
              <span>/</span>
              <span className="text-white">Elområden</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elområden i Sverige
            </h1>
            <p className="text-[#8fafc9] text-base md:text-lg max-w-2xl leading-relaxed">
              Sverige är uppdelat i fyra elområden – SE1, SE2, SE3 och SE4. Priserna
              skiljer sig åt beroende på var i landet du bor.
            </p>
          </section>

          {/* ── Map + area buttons ── */}
          <section className="flex flex-col items-center gap-6">
            <div className="w-full max-w-[280px]">
              <SwedenMap />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {AREAS.map(({ key, name, city }) => (
                <Link
                  key={key}
                  href={`/elomrade/${key}`}
                  className="px-5 py-2.5 bg-[#0F3460] border border-[#1E4976] hover:border-[#00E5FF]/40 hover:text-white text-[#8fafc9] rounded-xl text-sm font-semibold transition-all duration-150"
                >
                  {name} – {city}
                </Link>
              ))}
            </div>
          </section>

          {/* ── Comparison table ── */}
          <section className="flex flex-col gap-4">
            <h2 className="font-bold text-2xl">Jämförelse av elområdena</h2>
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                    <th className="text-left px-5 py-3 font-medium">Elområde</th>
                    <th className="text-left px-5 py-3 font-medium">Storstad</th>
                    <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Region</th>
                    <th className="text-left px-5 py-3 font-medium">Prisnivå</th>
                    <th className="text-left px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {AREAS.map(({ key, name, city, region, priceLevel }, i) => {
                    const accentColor =
                      i === 0 ? "#22C55E"
                      : i === 1 ? "#22C55E"
                      : i === 2 ? "#00E5FF"
                      : "#EF4444";
                    return (
                      <tr
                        key={key}
                        className="border-b border-[#1E4976]/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 font-bold text-white">{name}</td>
                        <td className="px-5 py-3 text-[#e2eaf4]">{city}</td>
                        <td className="px-5 py-3 text-[#8fafc9] hidden sm:table-cell">{region}</td>
                        <td className="px-5 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              color: accentColor,
                              backgroundColor: `${accentColor}18`,
                              border: `1px solid ${accentColor}40`,
                            }}
                          >
                            {priceLevel}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/elomrade/${key}`}
                            className="text-xs text-[#00E5FF] hover:underline"
                          >
                            Läs mer →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Article ── */}
          <section className="flex flex-col gap-8">

            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-2xl">Varför har Sverige fyra elområden?</h2>
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-3 text-[#a8c4d8] leading-relaxed">
                <p>
                  Sverige delades upp i fyra prisområden den 1 november 2011 på initiativ
                  av EU och den nordiska elmarknadens operatör{" "}
                  <span className="text-white font-medium">Nord Pool</span>. Syftet var att
                  bättre spegla var i landet el produceras och var den förbrukas, samt att
                  synliggöra flaskhalsar i elnätet.
                </p>
                <p>
                  Innan uppdelningen hade Sverige ett enda elprisområde. Det innebar att
                  konsumenter i söder betalade konstlat låga priser tack vare överskott från
                  norr, vilket hämnade incitamenten att bygga ut elnätet och lokal produktion.
                  EU och det europeiska elnätssamarbetet krävde en förändring för att öka
                  marknadseffektiviteten.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-2xl">Hur sätts elpriset?</h2>
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-3 text-[#a8c4d8] leading-relaxed">
                <p>
                  Spotpriset bestäms dagligen på elbörsen{" "}
                  <span className="text-white font-medium">Nord Pool</span> via en
                  så kallad day-ahead-auktion. Varje dag kl 12:00 lägger elproducenter
                  och elhandlare bud för varje timme nästkommande dygn, och priset sätts
                  där utbud möter efterfrågan.
                </p>
                <p>
                  Resultaten publiceras kl 13:15 och gäller leverans dagen därpå. Det
                  pris du ser på elpris.ai är detta spotpris i öre/kWh{" "}
                  <span className="text-white">exklusive</span> moms, nätavgift och
                  elhandelspåslag — det vill säga råvarupriset på el.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-2xl">Varför är el billigare i norr?</h2>
              <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-3 text-[#a8c4d8] leading-relaxed">
                <p>
                  Norra Sverige (SE1 och SE2) är hem för en enorm vattenkraftproduktion
                  längs de stora älvarna. Dessa kraftverk producerar mer el än norrlands
                  befolkning förbrukar, vilket skapar ett{" "}
                  <span className="text-white font-medium">strukturellt överskott</span>.
                </p>
                <p>
                  Södra Sverige (SE3 och SE4) har högre befolkningstäthet och industri men
                  färre inhemska kraftkällor. Elektriciteten måste transporteras söderut
                  via stamnätet, men kapaciteten är begränsad. Det uppstår{" "}
                  <span className="text-white font-medium">flaskhalsar</span> som gör att
                  priset i söder stiger ovanför priset i norr.
                </p>
                <p>
                  SE4 påverkas dessutom av kopplingen till det europeiska elnätet via
                  kablar till Danmark och Polen, där gas- och kolkraft ofta sätter
                  marginalpriset.
                </p>
              </div>
            </div>

          </section>

          {/* ── CTA ── */}
          <div className="flex justify-center">
            <Link
              href="/elpris-idag"
              className="px-6 py-3 bg-[#00E5FF] text-[#0A2540] font-semibold rounded-xl hover:bg-[#00c4db] transition-colors shadow-lg shadow-[#00E5FF]/20"
            >
              Se aktuella priser →
            </Link>
          </div>

          <Footer />

        </div>
      </main>
    </>
  );
}
