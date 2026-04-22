import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { stockholmISODate, stockholmHour, stockholmDayUTCRange } from "@/lib/time";
import SwedenMap from "@/components/SwedenMap";

// ─── Types ────────────────────────────────────────────────────────────────────

type AreaKey = "se1" | "se2" | "se3" | "se4";

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
}

// ─── Area metadata ────────────────────────────────────────────────────────────

const AREA_META = {
  se1: { name: "SE1", city: "Luleå", region: "Norra Sverige" },
  se2: { name: "SE2", city: "Sundsvall", region: "Norra mellansverige" },
  se3: { name: "SE3", city: "Stockholm", region: "Södra mellansverige" },
  se4: { name: "SE4", city: "Malmö", region: "Södra Sverige" },
} as const;

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

// ─── Data fetching ────────────────────────────────────────────────────────────

async function aggregateHourly(
  rows: { delivery_period_start: string; ore_per_kwh: number }[]
): Promise<HourEntry[]> {
  const buckets: { sum: number; count: number }[] = Array.from(
    { length: 24 },
    () => ({ sum: 0, count: 0 })
  );
  for (const row of rows) {
    const h = parseInt(
      new Date(row.delivery_period_start).toLocaleString("sv-SE", {
        timeZone: "Europe/Stockholm",
        hour: "numeric",
        hour12: false,
      }),
      10
    );
    buckets[h].sum += row.ore_per_kwh;
    buckets[h].count += 1;
  }
  return buckets
    .map((b, hour) =>
      b.count > 0
        ? { hour, ore_per_kwh: Math.round((b.sum / b.count) * 10) / 10 }
        : null
    )
    .filter((e): e is HourEntry => e !== null);
}

async function fetchAreaPrices(
  areaName: string,
  isoDate: string
): Promise<HourEntry[]> {
  const { from, to } = stockholmDayUTCRange(isoDate);
  const { data, error } = await supabase
    .from("spot_prices")
    .select("delivery_period_start, ore_per_kwh")
    .eq("area", areaName)
    .gte("delivery_period_start", from)
    .lte("delivery_period_start", to)
    .order("delivery_period_start");

  if (error || !data || data.length === 0) return [];
  return aggregateHourly(data);
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

function summaryStats(entries: HourEntry[]) {
  const min = Math.min(...entries.map((e) => e.ore_per_kwh));
  const max = Math.max(...entries.map((e) => e.ore_per_kwh));
  const avg =
    Math.round(
      (entries.reduce((s, e) => s + e.ore_per_kwh, 0) / entries.length) * 10
    ) / 10;
  return { min, max, avg };
}

// ─── Reusable price table ─────────────────────────────────────────────────────

function PriceTable({
  entries,
  now,
  highlightCurrent,
}: {
  entries: HourEntry[];
  now: number;
  highlightCurrent: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
          <th className="text-left px-5 py-2 font-medium">Timme</th>
          <th className="text-right px-5 py-2 font-medium">öre/kWh</th>
          <th className="text-right px-5 py-2 font-medium hidden sm:table-cell">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const isCurrent = highlightCurrent && entry.hour === now;
          return (
            <tr
              key={entry.hour}
              className={`border-b border-[#1E4976]/50 last:border-0 transition-colors ${
                isCurrent ? "bg-white/5" : "hover:bg-white/[0.02]"
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ElprisArea({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const meta = AREA_META[area as AreaKey];

  // Fallback for unknown area slugs (shouldn't happen with generateStaticParams)
  if (!meta) {
    return (
      <main className="min-h-screen bg-[#0A2540] text-white flex items-center justify-center">
        <p className="text-[#8fafc9]">Okänt elområde.</p>
      </main>
    );
  }

  const today = stockholmISODate();
  const tomorrow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const [todayEntries, tomorrowEntries] = await Promise.all([
    fetchAreaPrices(meta.name, today),
    fetchAreaPrices(meta.name, tomorrow),
  ]);

  const now = stockholmHour();

  const dateLabel = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const tomorrowLabel = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${tomorrow}T12:00:00`));

  const otherAreas = (["se1", "se2", "se3", "se4"] as AreaKey[]).filter(
    (a) => a !== area
  );

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
      {
        "@type": "ListItem",
        position: 3,
        name: `${meta.name} – ${meta.city}`,
        item: `https://www.elpris.ai/elpris/${area}`,
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
            <a href="/elpris-idag" className="hover:text-white transition-colors">
              Elpris idag
            </a>
            <a href="/elpris-imorgon" className="hover:text-white transition-colors">
              Elpris imorgon
            </a>
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
              <a href="/elpris-idag" className="hover:text-[#00E5FF] transition-colors">
                Elpris idag
              </a>
              <span>/</span>
              <span className="text-white">
                {meta.name} – {meta.city}
              </span>
            </div>

            {/* ── Area selector ── */}
            <div className="flex flex-wrap gap-2 mb-6">
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

            {/* ── Sweden map ── */}
            <div className="mb-2">
              <div className="w-full max-w-[280px]">
                <SwedenMap />
              </div>
            </div>

            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight">
              Elpris {meta.name} – {meta.city}
            </h1>
            <p className="text-[#8fafc9] text-base md:text-lg">
              {meta.region} · Spotpris i öre/kWh exkl. moms & nätavgift
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

          {/* ── Today's table ── */}
          {todayEntries.length === 0 ? (
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-10 text-center text-[#8fafc9]">
              Prisdata är inte tillgänglig just nu. Försök igen om en stund.
            </div>
          ) : (
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E4976] flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Priser idag · {meta.name}</h2>
                  <p className="text-[#8fafc9] text-xs mt-0.5 capitalize">{dateLabel}</p>
                </div>
                {(() => {
                  const { min, max, avg } = summaryStats(todayEntries);
                  return (
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
                  );
                })()}
              </div>
              <PriceTable entries={todayEntries} now={now} highlightCurrent={true} />
            </div>
          )}

          {/* ── Tomorrow's table ── */}
          {tomorrowEntries.length > 0 && (
            <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1E4976] flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Priser imorgon · {meta.name}</h2>
                  <p className="text-[#8fafc9] text-xs mt-0.5 capitalize">{tomorrowLabel}</p>
                </div>
                {(() => {
                  const { min, max, avg } = summaryStats(tomorrowEntries);
                  return (
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
                  );
                })()}
              </div>
              <PriceTable entries={tomorrowEntries} now={now} highlightCurrent={false} />
            </div>
          )}

          {/* ── See also: other areas ── */}
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

          {/* ── Footer ── */}
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
