import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { stockholmISODate, stockholmHour } from "@/lib/time";

// ─── Types ────────────────────────────────────────────────────────────────────

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Elpris idag | Spotpris timme för timme – elpris.ai",
  description:
    "Se elpriset idag för alla svenska elområden SE1–SE4. Uppdateras var 15:e minut. Spotpris i öre/kWh.",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTodayPrices(): Promise<Record<Area, HourEntry[]> | null> {
  const isoDate = stockholmISODate();

  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .gte("delivery_period_start", `${isoDate}T00:00:00`)
    .lt("delivery_period_start", `${isoDate}T24:00:00`)
    .order("delivery_period_start");

  if (error || !data || data.length === 0) return null;

  // Group by area, then average 15-min slots into hourly buckets
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

export default async function ElprisIdag() {
  const areas = await fetchTodayPrices();
  const now = stockholmHour();
  const dateLabel = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.elpris.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Elpris idag",
        item: "https://www.elpris.ai/elpris-idag",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-[#0A2540] text-white">
        {/* ── Nav ── */}
        <nav className="border-b border-[#1E4976] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <a href="/" className="font-extrabold text-xl tracking-tight">
            elpris<span className="text-[#00E5FF]">.ai</span>
          </a>
          <div className="flex items-center gap-6 text-sm text-[#8fafc9]">
            <a href="/#elomraden" className="hover:text-white transition-colors">
              Elområden
            </a>
            <a href="/#rekommendationer" className="hover:text-white transition-colors">
              Prognos
            </a>
            <a href="/#om-oss" className="hover:text-white transition-colors">
              Om oss
            </a>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12">
          {/* ── Header ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-[#8fafc9]">
              <a href="/" className="hover:text-[#00E5FF] transition-colors">
                Hem
              </a>
              <span>/</span>
              <span className="text-white">Elpris idag</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elpris idag
            </h1>
            <p className="text-[#8fafc9] text-base md:text-lg max-w-2xl leading-relaxed">
              Aktuella spotpriser för alla svenska elområden, uppdaterade var 15:e minut.
              Priserna visas i öre/kWh exkl. moms och nätavgift.
            </p>
            <p className="text-[#8fafc9] text-sm capitalize">{dateLabel}</p>
          </section>

          {/* ── Legend ── */}
          <div className="flex flex-wrap gap-5 text-xs text-[#8fafc9]">
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
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-white/40 bg-white/10" />
              Aktuell timme
            </span>
          </div>

          {/* ── Price tables ── */}
          {areas === null ? (
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-10 text-center text-[#8fafc9]">
              Prisdata är inte tillgänglig just nu. Försök igen om en stund.
            </div>
          ) : (
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
                  <div
                    key={area}
                    className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden"
                  >
                    {/* Table header */}
                    <div className="px-5 py-4 border-b border-[#1E4976] flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-lg">{area}</h2>
                        <p className="text-[#8fafc9] text-xs mt-0.5">
                          {area === "SE1" && "Luleå · Norra Sverige"}
                          {area === "SE2" && "Sundsvall · Norra mellansverige"}
                          {area === "SE3" && "Stockholm · Södra mellansverige"}
                          {area === "SE4" && "Malmö · Södra Sverige"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[#8fafc9] flex flex-col gap-0.5">
                        <span>
                          Snitt:{" "}
                          <span className="text-white font-semibold">{fmt(avg)} öre</span>
                        </span>
                        <span>
                          Min:{" "}
                          <span style={{ color: priceColor(min) }} className="font-semibold">
                            {fmt(min)}
                          </span>{" "}
                          · Max:{" "}
                          <span style={{ color: priceColor(max) }} className="font-semibold">
                            {fmt(max)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
                          <th className="text-left px-5 py-2 font-medium">Timme</th>
                          <th className="text-right px-5 py-2 font-medium">öre/kWh</th>
                          <th className="text-right px-5 py-2 font-medium hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => {
                          const isCurrent = entry.hour === now;
                          return (
                            <tr
                              key={entry.hour}
                              className={`border-b border-[#1E4976]/50 last:border-0 transition-colors ${
                                isCurrent
                                  ? "bg-white/5"
                                  : "hover:bg-white/[0.02]"
                              }`}
                            >
                              <td className="px-5 py-2.5 font-mono text-[#e2eaf4] flex items-center gap-2">
                                {isCurrent && (
                                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E5FF]" />
                                  </span>
                                )}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Footer note ── */}
          <section className="border-t border-[#1E4976] pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8fafc9]">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <a href="/" className="font-extrabold text-sm text-[#8fafc9]">
                elpris<span className="text-[#00E5FF]">.ai</span>
              </a>
              <a
                href="/integritetspolicy"
                className="hover:text-[#00E5FF] transition-colors"
              >
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
