import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { stockholmDayUTCRange } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Elpriset imorgon — Sveriges fyra elområden | elpris.ai",
  description:
    "Se morgondagens elpriser för SE1, SE2, SE3 och SE4. Day-ahead-priser publiceras runt kl 13:15 varje dag. Planera tvätt, elbilsladdning och uppvärmning till de billigaste timmarna.",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTomorrowPrices(): Promise<Record<Area, HourEntry[]> | null> {
  const tomorrow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const { from, to } = stockholmDayUTCRange(tomorrow);

  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .gte("delivery_period_start", from)
    .lte("delivery_period_start", to)
    .order("delivery_period_start");

  if (error || !data || data.length === 0) return null;

  const grouped: Record<string, { sum: number; count: number }[]> = {};
  for (const row of data) {
    const hour = new Date(row.delivery_period_start).toLocaleString("sv-SE", {
      timeZone: "Europe/Stockholm",
      hour: "numeric",
      hour12: false,
    });
    const h = parseInt(hour, 10);
    if (!grouped[row.area]) grouped[row.area] = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));
    grouped[row.area][h].sum += row.ore_per_kwh;
    grouped[row.area][h].count += 1;
  }

  const toEntries = (area: string): HourEntry[] =>
    (grouped[area] ?? [])
      .map((bucket, hour) =>
        bucket.count > 0
          ? { hour, ore_per_kwh: Math.round((bucket.sum / bucket.count) * 10) / 10 }
          : null
      )
      .filter((e): e is HourEntry => e !== null);

  if (!AREAS.every((a) => toEntries(a).length > 0)) return null;

  return {
    SE1: toEntries("SE1"),
    SE2: toEntries("SE2"),
    SE3: toEntries("SE3"),
    SE4: toEntries("SE4"),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceColor(price: number): string {
  if (price <= 0) return "#22C55E";
  if (price <= 50) return "#22C55E";
  if (price >= 100) return "#EF4444";
  return "#00E5FF";
}

function priceLabel(price: number): string {
  if (price <= 0) return "Negativt";
  if (price <= 50) return "Billigt";
  if (price >= 100) return "Dyrt";
  return "Normalt";
}

function fmt(price: number): string {
  return price.toFixed(1).replace(".", ",");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ElprisImorgon() {
  const areas = await fetchTomorrowPrices();

  const tomorrow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const tomorrowLabel = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${tomorrow}T12:00:00`));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elpris.ai" },
      { "@type": "ListItem", position: 2, name: "Elpris imorgon", item: "https://www.elpris.ai/elpris-imorgon" },
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

        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12">

          {/* ── Header ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <a href="/" className="hover:text-[#00E5FF] transition-colors">Hem</a>
              <span>/</span>
              <span className="text-white">Elpris imorgon</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elpriset imorgon — Sveriges fyra elområden
            </h1>
            <p className="text-base text-[#8fafc9] leading-relaxed max-w-3xl">
              Här ser du morgondagens elpriser så snart de publiceras. Day-ahead-priser
              fastställs på elbörsen Nord Pool varje eftermiddag runt{" "}
              <strong className="text-white">kl 13:15</strong>, och uppdateras automatiskt
              här på sidan så snart de blir tillgängliga.
            </p>
          </section>

          {/* ── Villkorligt innehåll: ej publicerat / publicerat ── */}
          {areas === null ? (

            /* ── 3A: Empty state ── */
            <>
              <section>
                <div className="max-w-3xl">
                  <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
                    Morgondagens priser publiceras runt kl 13:15
                  </h2>
                  <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
                    Elpriset för imorgon sätts varje eftermiddag på Nord Pool när all europeisk
                    produktion och förbrukning har balanserats. Kom tillbaka efter kl 13:15 för
                    att se morgondagens timpriser för alla fyra elområden.
                  </p>
                  <p className="text-base text-[#8fafc9] leading-relaxed">
                    Vill du planera redan nu? Titta på{" "}
                    <Link
                      href="/elpris-idag"
                      className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150"
                    >
                      dagens priser
                    </Link>{" "}
                    för att se prismönstret — morgondagens priser brukar följa liknande
                    dygnskurvor.
                  </p>
                </div>
              </section>
            </>

          ) : (

            /* ── 3B: Priser publicerade ── */
            <>
              {/* 3B.1: Hur du planerar */}
              <section>
                <div className="max-w-3xl">
                  <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
                    Hur du planerar med morgondagens priser
                  </h2>
                  <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
                    Att se morgondagens priser i förväg är en av de mest värdefulla möjligheterna
                    med kvartspris. När du vet när elen är som billigast respektive dyrast under
                    nästa dygn kan du planera in tunga laster i rätt fönster:
                  </p>
                  <ul className="space-y-2 text-base text-[#8fafc9] leading-relaxed mb-4">
                    <li>
                      <strong className="text-[#22C55E]">Grön</strong> (under 50 öre/kWh) — bra
                      timmar för planerad förbrukning, ställ in tvättmaskinen på fördröjd start
                    </li>
                    <li>
                      <strong className="text-[#00E5FF]">Cyan</strong> (50–99 öre/kWh) — normal
                      nivå, ingen större anledning att vänta
                    </li>
                    <li>
                      <strong className="text-[#EF4444]">Röd</strong> (över 100 öre/kWh) — undvik
                      om möjligt eller flytta förbrukning till en grön timme
                    </li>
                  </ul>
                  <p className="text-base text-[#8fafc9] leading-relaxed">
                    Tänk på att morgondagens priser kan svänga mer än dagens — extrema pristoppar
                    är vanligast under vintermånaderna och vid kalla, vindstilla dygn.
                  </p>
                </div>
              </section>

              {/* 3B.2: Pristabell */}
              <section>
                <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
                  Timpriser för imorgon — alla elområden
                </h2>
                <p className="text-[#8fafc9] text-sm capitalize mb-3">{tomorrowLabel}</p>

                {/* Legend */}
                <div className="flex flex-wrap gap-5 text-xs text-[#8fafc9] mb-6">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" />
                    Billigt / negativt (&le;50 öre)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#00E5FF]" />
                    Normalt (51–99 öre)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                    Dyrt (&ge;100 öre)
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {AREAS.map((area) => {
                    const entries = areas[area];
                    const min = Math.min(...entries.map((e) => e.ore_per_kwh));
                    const max = Math.max(...entries.map((e) => e.ore_per_kwh));
                    const avg =
                      Math.round(
                        (entries.reduce((s, e) => s + e.ore_per_kwh, 0) / entries.length) * 10
                      ) / 10;

                    return (
                      <div key={area} className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#1E4976] flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-lg">{area}</h3>
                            <p className="text-[#8fafc9] text-xs mt-0.5">
                              {area === "SE1" && "Luleå · Norra Sverige"}
                              {area === "SE2" && "Sundsvall · Norra mellansverige"}
                              {area === "SE3" && "Stockholm · Södra mellansverige"}
                              {area === "SE4" && "Malmö · Södra Sverige"}
                            </p>
                          </div>
                          <div className="text-right text-xs text-[#8fafc9] flex flex-col gap-0.5">
                            <span>Snitt: <span className="text-white font-semibold">{fmt(avg)} öre</span></span>
                            <span>
                              Min: <span style={{ color: priceColor(min) }} className="font-semibold">{fmt(min)}</span>
                              {" "}· Max: <span style={{ color: priceColor(max) }} className="font-semibold">{fmt(max)}</span>
                            </span>
                          </div>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                              <th className="text-left px-5 py-2 font-medium">Timme</th>
                              <th className="text-right px-5 py-2 font-medium">öre/kWh</th>
                              <th className="text-right px-5 py-2 font-medium hidden sm:table-cell">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry) => (
                              <tr
                                key={entry.hour}
                                className="border-b border-[#1E4976]/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="px-5 py-2.5 font-mono text-[#e2eaf4]">
                                  {String(entry.hour).padStart(2, "0")}:00–
                                  {String(entry.hour + 1).padStart(2, "0")}:00
                                </td>
                                <td className="px-5 py-2.5 text-right font-bold font-mono tabular-nums">
                                  <span style={{ color: priceColor(entry.ore_per_kwh) }}>
                                    {fmt(entry.ore_per_kwh)}
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-right hidden sm:table-cell">
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      color: priceColor(entry.ore_per_kwh),
                                      backgroundColor: `${priceColor(entry.ore_per_kwh)}18`,
                                      border: `1px solid ${priceColor(entry.ore_per_kwh)}40`,
                                    }}
                                  >
                                    {priceLabel(entry.ore_per_kwh)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 3B.3: Vad du kan planera */}
              <section>
                <div className="max-w-3xl">
                  <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
                    Vad du kan planera redan ikväll
                  </h2>
                  <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
                    Tre konkreta saker du kan förbereda kvällen innan:
                  </p>
                  <ol className="space-y-3 text-base text-[#8fafc9] leading-relaxed list-decimal list-inside mb-4">
                    <li>
                      <strong className="text-white">Tvätt och disk på fördröjd start.</strong>{" "}
                      De flesta moderna maskiner har timer-funktion som låter dig starta upp till
                      24 timmar fram. Sätt programmet ikväll, schemalägg starten till morgondagens
                      billigaste timme.
                    </li>
                    <li>
                      <strong className="text-white">Schemalägg elbilsladdning.</strong>{" "}
                      De flesta moderna laddboxar och elbilar har inbyggd schemafunktion som kan
                      ställas in att starta laddning under specifika timmar. Många smarta laddboxar
                      kan dessutom kopplas till spotpriset och välja billigaste timmarna
                      automatiskt — kolla i din laddbox-app eller bilens menyer.
                    </li>
                    <li>
                      <strong className="text-white">Justera värmepumpens schema.</strong>{" "}
                      Om din värmepump har stöd för smart styrning eller spotprisanpassning kan
                      du programmera den att köra hårdare under billiga timmar och dra ner under
                      dyra. Hur du gör beror på modell — kolla manualen eller tillverkarens app.
                    </li>
                  </ol>
                  <p className="text-base text-[#8fafc9] leading-relaxed">
                    För djupare strategier, läs våra guider om{" "}
                    <Link href="/guider/spara-el/tvatta-billigt" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">tvätta billigt</Link>,{" "}
                    <Link href="/guider/spara-el/ladda-elbil-billigt" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">ladda elbil billigt</Link>{" "}
                    och{" "}
                    <Link href="/guider/spara-el/varmepump-elpris" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">värmepump och spotpris</Link>.
                  </p>
                </div>
              </section>
            </>
          )}

          {/* ── Om priserna (visas alltid) ── */}
          <section>
            <div className="max-w-3xl">
              <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
                Om priserna på elpris.ai
              </h2>
              <p className="text-sm text-[#8fafc9] leading-relaxed mb-3">
                Priserna som visas är{" "}
                <strong className="text-white">spotpris exklusive moms och nätavgifter</strong>,
                hämtade från{" "}
                <a
                  href="https://www.elprisetjustnu.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150"
                >
                  elprisetjustnu.se
                </a>{" "}
                som i sin tur bygger på data från ENTSO-E Transparency Platform. Din faktiska
                elkostnad påverkas också av moms (25%), elnätsavgift, energiskatt och eventuellt
                påslag från ditt elavtal.
              </p>
              <p className="text-sm text-[#8fafc9] leading-relaxed">
                För att förstå hur de olika delarna av elpriset hänger ihop, läs{" "}
                <Link href="/guider/forsta-elpriset/elprisets-bestandsdelar" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">elprisets beståndsdelar</Link>.
                Vill du veta hur prisbildningen fungerar, läs{" "}
                <Link href="/guider/forsta-elpriset/vad-ar-spotpris" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">vad är spotpris</Link>.
              </p>
            </div>
          </section>

          <Footer />
        </div>
      </main>
    </>
  );
}
