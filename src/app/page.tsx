"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { HourEntry, PricesResponse } from "./api/prices/today/route";
import type { CurrentPriceResponse } from "./api/prices/current/route";
import { stockholmHour } from "@/lib/time";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBarColor(price: number): string {
  if (price <= 50) return "#22C55E";
  if (price >= 100) return "#EF4444";
  return "#00E5FF";
}


// ─── Custom tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-[#8fafc9] mb-0.5">Kl. {label}:00</p>
      <p className="font-semibold text-white">
        {payload[0].value}{" "}
        <span className="text-[#00E5FF] text-xs font-normal">öre/kWh</span>
      </p>
    </div>
  );
}

// ─── Value card ──────────────────────────────────────────────────────────────

function ValueCard({
  icon,
  title,
  value,
  detail,
  accent,
}: {
  icon: string;
  title: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-3 hover:border-[#00E5FF]/40 transition-colors duration-200">
      <div className="text-2xl">{icon}</div>
      <p className="text-[#8fafc9] text-sm font-medium uppercase tracking-wider">
        {title}
      </p>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-[#8fafc9] text-sm">{detail}</p>
    </div>
  );
}

// ─── Derived stats from SE3 hourly data ──────────────────────────────────────

function cheapestWindow(
  hours: HourEntry[],
  windowSize = 3
): { label: string; avg: number } | null {
  if (hours.length < windowSize) return null;
  let best = Infinity;
  let bestStart = 0;
  for (let i = 0; i <= hours.length - windowSize; i++) {
    const avg =
      hours.slice(i, i + windowSize).reduce((s, h) => s + h.ore_per_kwh, 0) /
      windowSize;
    if (avg < best) {
      best = avg;
      bestStart = i;
    }
  }
  const start = hours[bestStart].hour;
  const end = hours[bestStart + windowSize - 1].hour + 1;
  return {
    label: `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`,
    avg: Math.round(best * 10) / 10,
  };
}

// ─── Region → elområde mapping ───────────────────────────────────────────────

const SE1_REGIONS = ["norrbotten", "västerbotten"];
const SE2_REGIONS = ["jämtland", "västernorrland"];
const SE4_REGIONS = ["skåne", "blekinge", "kronoberg"];

function regionToArea(region: string): "SE1" | "SE2" | "SE3" | "SE4" {
  const r = region.toLowerCase();
  if (SE1_REGIONS.some((s) => r.includes(s))) return "SE1";
  if (SE2_REGIONS.some((s) => r.includes(s))) return "SE2";
  if (SE4_REGIONS.some((s) => r.includes(s))) return "SE4";
  return "SE3";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [chatInput, setChatInput] = useState("");
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPriceData, setCurrentPriceData] = useState<CurrentPriceResponse | null>(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<"SE1" | "SE2" | "SE3" | "SE4">("SE3");

  // Geolocation: detect user's Swedish region and pre-select area
  useEffect(() => {
    fetch("https://api.ipapi.is")
      .then((r) => r.json())
      .then((data) => {
        const region: string = data?.location?.region ?? "";
        const area = regionToArea(region);
        setSelectedArea(area);
      })
      .catch(() => {
        // Fallback SE3 already set as default
      });
  }, []);

  useEffect(() => {
    fetch("/api/prices/today")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PricesResponse>;
      })
      .then((data) => {
        setPrices(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/prices/current")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CurrentPriceResponse>;
      })
      .then((data) => {
        setCurrentPriceData(data);
        setCurrentLoading(false);
      })
      .catch(() => {
        setCurrentLoading(false);
      });
  }, []);

  const now = stockholmHour();
  const areaData = prices?.areas[selectedArea] ?? [];
  const currentPrice = currentPriceData?.[selectedArea] ?? null;

  const chartData = areaData.map((h) => ({
    hour: String(h.hour).padStart(2, "0"),
    price: h.ore_per_kwh,
  }));

  const cheap = cheapestWindow(areaData, 3);

  // Show the slot start time (rounded-down quarter) rather than wall-clock time
  const updatedAt = currentPriceData
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(currentPriceData.slot_start))
    : null;

  return (
    <main className="min-h-screen bg-[#0A2540] text-white">
      {/* ── Nav ── */}
      <nav className="border-b border-[#1E4976] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-extrabold text-xl tracking-tight">
          elpris<span className="text-[#00E5FF]">.ai</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-[#8fafc9]">
          <a href="#elomraden" className="hover:text-white transition-colors">
            Elområden
          </a>
          <a href="#rekommendationer" className="hover:text-white transition-colors">
            Prognos
          </a>
          <a href="#om-oss" className="hover:text-white transition-colors">
            Om oss
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-20">
        {/* ── 1. Hero ── */}
        <section className="flex flex-col items-center text-center gap-6 pt-8">
          {/* Live badge */}
          <div className="flex items-center gap-2 bg-[#0F3460] border border-[#1E4976] rounded-full px-4 py-1.5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E5FF]" />
            </span>
            <span className="text-[#00E5FF] font-medium">LIVE</span>
            <span className="text-[#8fafc9]">
              · {selectedArea}
              {updatedAt ? ` · Uppdaterad ${updatedAt}` : ""}
            </span>
          </div>

          <h1 className="font-extrabold text-5xl md:text-7xl leading-none tracking-tight">
            Elpriset <span className="block md:inline">just nu</span>
          </h1>

          {/* Big price */}
          <div className="flex flex-col items-center gap-1 min-h-[120px] justify-center">
            {currentLoading ? (
              <div className="w-48 h-24 rounded-2xl bg-[#0F3460] animate-pulse" />
            ) : error ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[#EF4444] text-lg">Kunde inte hämta live-pris</p>
                <p className="text-[#8fafc9] text-sm">Försök ladda om sidan</p>
                <button onClick={() => window.location.reload()} className="mt-1 px-4 py-2 bg-[#0F3460] border border-[#1E4976] rounded-xl text-sm text-[#8fafc9] hover:text-white hover:border-[#00E5FF]/40 transition-colors">
                  Ladda om ↺
                </button>
              </div>
            ) : (
              <>
                <span
                  className="font-black text-8xl md:text-9xl leading-none"
                  style={{
                    color:
                      currentPrice !== null && currentPrice >= 100
                        ? "#EF4444"
                        : currentPrice !== null && currentPrice <= 50
                        ? "#22C55E"
                        : "#00E5FF",
                    textShadow:
                      currentPrice !== null && currentPrice >= 100
                        ? "0 0 40px rgba(239,68,68,0.45)"
                        : currentPrice !== null && currentPrice <= 50
                        ? "0 0 40px rgba(34,197,94,0.45)"
                        : "0 0 40px rgba(0,229,255,0.45)",
                  }}
                >
                  {currentPrice !== null
                    ? currentPrice.toFixed(1).replace(".", ",")
                    : "–"}
                </span>
                <span className="text-[#8fafc9] text-xl md:text-2xl font-medium tracking-wide">
                  öre / kWh · {selectedArea}
                </span>
                <span className="text-[#8fafc9] text-xs mt-1">Spotpris exkl. moms & nätavgift</span>
              </>
            )}
          </div>

          <p className="text-[#8fafc9] max-w-md text-base md:text-lg leading-relaxed">
            Realtidspriser för alla svenska elområden. AI-analys av bästa tid
            att använda el.
          </p>

          <div className="mt-2 flex gap-2">
            {(["SE1", "SE2", "SE3", "SE4"] as const).map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
                  selectedArea === area
                    ? "bg-[#00E5FF] text-[#0A2540] shadow-lg shadow-[#00E5FF]/20"
                    : "bg-[#0F3460] border border-[#1E4976] text-[#8fafc9] hover:border-[#00E5FF]/40 hover:text-white"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
          {cheap && (
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <div className="flex items-center gap-2 bg-[#0F3460] border border-[#22C55E]/40 rounded-full px-4 py-2 text-sm">
                <span>🧺</span>
                <span className="text-[#8fafc9]">Tvätt/disk billigast:</span>
                <span className="text-[#22C55E] font-semibold">{cheap.label}</span>
                <span className="text-[#8fafc9]">({cheap.avg} öre)</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0F3460] border border-[#22C55E]/40 rounded-full px-4 py-2 text-sm">
                <span>🚗</span>
                <span className="text-[#8fafc9]">Ladda elbil billigast:</span>
                <span className="text-[#22C55E] font-semibold">{cheap.label}</span>
                <span className="text-[#8fafc9]">({cheap.avg} öre)</span>
              </div>
            </div>
          )}
        </section>

        {/* ── 2. Price chart ── */}
        <section id="elomraden" className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-bold text-2xl md:text-3xl">
                Dagens timpriser
              </h2>
              <p className="text-[#8fafc9] text-sm mt-1">
                {prices?.date
                  ? prices.date.replace("/", " ").replace("-", " ") + " · "
                  : ""}
                {selectedArea} · öre/kWh
              </p>
              <p className="text-[#8fafc9] text-xs mt-0.5">
                Staplarna visar snittpris per timme
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-5 text-xs text-[#8fafc9]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" />
                Billigt (&le;50)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00E5FF]" />
                Normalt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                Dyrt (&ge;100)
              </span>
            </div>
          </div>

          <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6">
            {loading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="w-full h-full rounded-xl bg-[#0A2540] animate-pulse" />
              </div>
            ) : error || chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[#8fafc9] text-sm">
                Prisdata ej tillgänglig
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  barCategoryGap="20%"
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#8fafc9", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    tick={{ fill: "#8fafc9", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.hour}
                        fill={getBarColor(entry.price)}
                        opacity={parseInt(entry.hour) === now ? 1 : 0.75}
                        stroke={
                          parseInt(entry.hour) === now ? "#ffffff" : "none"
                        }
                        strokeWidth={parseInt(entry.hour) === now ? 1 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── 3. AI chatbot ── */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="font-bold text-2xl md:text-3xl">Fråga elpris.ai</h2>
            <p className="text-[#8fafc9] text-sm mt-1">
              AI-assistenten svarar på frågor om elpriset
            </p>
          </div>

          <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-4">
            {/* User message */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#00E5FF] text-sm">⚡</span>
              </div>
              <div className="bg-[#1E4976] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#e2eaf4] max-w-md">
                Ska jag ladda bilen nu?
              </div>
            </div>

            {/* AI response */}
            <div className="flex items-start gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#22C55E] text-xs font-bold">AI</span>
              </div>
              <div className="bg-[#0A2540] border border-[#1E4976] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#e2eaf4] max-w-sm">
                {currentPrice !== null && cheap ? (
                  <>
                    Priset är{" "}
                    <span className="text-[#00E5FF] font-semibold">
                      {currentPrice.toFixed(1).replace(".", ",")} öre/kWh
                    </span>{" "}
                    just nu i SE3. Billigaste 3-timmarsperioden är{" "}
                    <span className="text-[#22C55E] font-semibold">
                      {cheap.label}
                    </span>{" "}
                    ({cheap.avg.toFixed(1).replace(".", ",")} öre i snitt).
                    {currentPrice > cheap.avg + 5
                      ? " Vänta gärna!"
                      : " Priset är bra nu!"}
                  </>
                ) : (
                  "Hämtar prisdata..."
                )}
              </div>
            </div>

            {/* Input */}
            <div className="mt-2 flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ställ en fråga om elpriset..."
                className="flex-1 bg-[#0A2540] border border-[#1E4976] focus:border-[#00E5FF]/60 outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a6b8a] transition-colors duration-150"
              />
              <button className="bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors duration-150 shadow-md shadow-[#22C55E]/20 flex-shrink-0">
                Fråga
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. Value blocks ── */}
        <section id="rekommendationer" className="flex flex-col gap-6">
          <h2 className="font-bold text-2xl md:text-3xl">
            Smarta rekommendationer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ValueCard
              icon="🧺"
              title="Billigaste tvättid"
              value={cheap ? cheap.label : "–"}
              detail={
                cheap
                  ? `${cheap.avg.toFixed(1).replace(".", ",")} öre/kWh i snitt`
                  : "Laddar..."
              }
              accent="#22C55E"
            />
            <ValueCard
              icon="🚗"
              title="Ladda elbilen"
              value={cheap ? cheap.label : "–"}
              detail={
                cheap
                  ? `Snittpriser ${cheap.avg.toFixed(1).replace(".", ",")} öre/kWh`
                  : "Laddar..."
              }
              accent="#00E5FF"
            />
            <ValueCard
              icon="📊"
              title="Dyrt just nu"
              value={
                currentPrice !== null
                  ? `${currentPrice.toFixed(1).replace(".", ",")} öre`
                  : "–"
              }
              detail={
                currentPrice !== null
                  ? currentPrice >= 100
                    ? "Högt pris – skjut upp förbrukning"
                    : currentPrice <= 50
                    ? "Lågt pris – bra tid att förbruka"
                    : "Normalt prisnivå just nu"
                  : "Laddar..."
              }
              accent={
                currentPrice !== null
                  ? currentPrice >= 100
                    ? "#EF4444"
                    : currentPrice <= 50
                    ? "#22C55E"
                    : "#00E5FF"
                  : "#8fafc9"
              }
            />
          </div>
        </section>

        {/* ── 5. Trust section ── */}
        <section id="om-oss" className="border-t border-[#1E4976] pt-10 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="font-extrabold text-lg text-[#8fafc9]">
                elpris<span className="text-[#00E5FF]">.ai</span>
              </span>
              <Link
                href="/integritetspolicy"
                className="text-xs text-[#8fafc9] hover:text-[#00E5FF] transition-colors"
              >
                Integritetspolicy
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-[#8fafc9]">
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#22C55E] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Data från elprisetjustnu.se
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#22C55E] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Uppdateras var 15:e minut
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#22C55E] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Täcker SE1–SE4
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
