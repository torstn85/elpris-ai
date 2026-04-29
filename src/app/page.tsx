"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Chatbot from "@/components/dynamic/Chatbot";
import DailyPriceAnalysis from "@/components/dynamic/DailyPriceAnalysis";
import Footer from "@/components/Footer";
import type { HourEntry, PricesResponse } from "./api/prices/today/route";
import type { CurrentPriceResponse } from "./api/prices/current/route";
import { stockholmHour } from "@/lib/time";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBarColor(price: number): string {
  if (price <= 0) return "#22C55E";
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
    <div className="relative bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-3 hover:border-[#00E5FF]/40 transition-colors duration-200">
      {/* CTA-badge — visuell signal, kortet är klickbart via Link-wrapper */}
      <span className="absolute top-3 right-3 flex items-center rounded-full bg-[#22C55E] text-white text-xs font-semibold px-2.5 py-1 shadow-sm shadow-[#22C55E]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
        Klicka för mer →
      </span>
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

function priceAccentColor(avg: number | null): string {
  if (avg === null) return "#00E5FF";
  if (avg <= 50) return "#22C55E";
  if (avg < 100) return "#00E5FF";
  return "#EF4444";
}

function regionToArea(region: string): "SE1" | "SE2" | "SE3" | "SE4" {
  const r = region.toLowerCase();
  if (SE1_REGIONS.some((s) => r.includes(s))) return "SE1";
  if (SE2_REGIONS.some((s) => r.includes(s))) return "SE2";
  if (SE4_REGIONS.some((s) => r.includes(s))) return "SE4";
  return "SE3";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPriceData, setCurrentPriceData] = useState<CurrentPriceResponse | null>(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<"SE1" | "SE2" | "SE3" | "SE4">("SE3");
  const [minutesLeft, setMinutesLeft] = useState<number>(0);

  // Tick countdown to next 15-min slot
  useEffect(() => {
    function compute() {
      const minute = parseInt(
        new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", minute: "numeric" }).format(new Date()),
        10
      );
      setMinutesLeft(15 - (minute % 15));
    }
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, []);

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
    function fetchCurrent() {
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
    }

    fetchCurrent();
    const id = setInterval(fetchCurrent, 60_000);
    return () => clearInterval(id);
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
      <NavBar />

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12">
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
              <span className="hidden sm:inline">{minutesLeft > 0 ? ` · Nästa om ${minutesLeft} min` : ""}</span>
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
                {currentPrice !== null && currentPrice <= 0 && (
                  <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/40 rounded-full px-4 py-2 text-sm text-[#22C55E] font-medium">
                    ⚡ Negativt spotpris – elen är gratis just nu!
                  </div>
                )}
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
          <Link href="/elpris-idag" className="text-sm text-[#00E5FF] hover:underline mt-1">
            → Se timtabell för alla elområden
          </Link>
          {cheap && (
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <Link
                href="/guider/spara-el/tvatta-billigt"
                className="flex items-center gap-2 bg-[#0F3460] border border-[#22C55E]/40 rounded-full px-4 py-2 text-sm transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
              >
                <span>🧺</span>
                <span className="text-[#8fafc9]">Tvätt/disk billigast:</span>
                <span className="text-[#22C55E] font-semibold">{cheap.label}</span>
                <span className="text-[#8fafc9]">{cheap.avg <= 0 ? "⚡ Gratis!" : `(${cheap.avg} öre)`}</span>
              </Link>
              <Link
                href="/guider/spara-el/ladda-elbil-billigt"
                className="flex items-center gap-2 bg-[#0F3460] border border-[#22C55E]/40 rounded-full px-4 py-2 text-sm transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
              >
                <span>🚗</span>
                <span className="text-[#8fafc9]">Ladda elbil billigast:</span>
                <span className="text-[#22C55E] font-semibold">{cheap.label}</span>
                <span className="text-[#8fafc9]">{cheap.avg <= 0 ? "⚡ Gratis!" : `(${cheap.avg} öre)`}</span>
              </Link>
            </div>
          )}
        </section>

        {/* ── 1b. Intro-sektion ── */}
        <section className="py-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
              Så fungerar elpriset i Sverige
            </h2>
            {/* Stycke 1 */}
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              Elpriset varierar varje{" "}
              <Link href="/guider/elavtal/kvartspris-vs-timpris" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">kvart</Link>.
              {" "}Sedan oktober 2025 sätts priset i 15-minutersintervaller på den nordiska elbörsen{" "}
              <Link href="/guider/forsta-elpriset/nord-pool-forklarat" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">Nord Pool</Link>,
              {" "}baserat på utbud och efterfrågan. När det blåser mycket, solen skiner och
              konsumtionen är låg blir elen billig — ibland till och med{" "}
              <Link href="/guider/forsta-elpriset/negativa-elpriser" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">negativ</Link>.
              {" "}När många använder el samtidigt och produktionen är låg stiger priset snabbt.
            </p>
            {/* Stycke 2 */}
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              Sverige är indelat i{" "}
              <Link href="/elomrade" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">fyra elområden</Link>
              {" "}där priserna kan skilja sig markant beroende på var produktionen av el
              sker och hur överföringskapaciteten ser ut. Bor du i söder har du historiskt
              haft högre och mer volatila priser än norra Sverige.
            </p>
            {/* Stycke 3 */}
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              På elpris.ai ser du{" "}
              <Link href="/elpris-idag" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">aktuella priser i realtid</Link>
              {" "}för alla fyra elområden, dagens dygnskurva timme för timme, samt{" "}
              <Link href="/elpris-imorgon" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">morgondagens priser</Link>
              {" "}så snart de publiceras runt kl 13:15 varje dag. Du kan också ställa frågor
              till vår AI-assistent som hämtar färska prisdata och ger konkreta råd: när är
              det billigast att{" "}
              <Link href="/guider/spara-el/tvatta-billigt" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">tvätta idag</Link>?
              {" "}När bör jag{" "}
              <Link href="/guider/spara-el/ladda-elbil-billigt" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">ladda elbilen</Link>?
              {" "}Är det dyrt just nu jämfört med dygnssnittet?
            </p>
            {/* Stycke 4 */}
            <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
              Priserna som visas är{" "}
              <Link href="/guider/forsta-elpriset/vad-ar-spotpris" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">spotpris</Link>
              {" "}exklusive moms och nätavgifter — det vill säga den del av elpriset som faktiskt
              varierar över dygnet och som du kan påverka genom när du använder el. För att
              få din fulla kostnad lägger du till moms (25%), elnätsavgift, energiskatt och
              eventuellt påslag från ditt{" "}
              <Link href="/guider/elavtal/byta-elavtal-guide" className="font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150">elavtal</Link>.
            </p>
          </div>
        </section>

        {/* ── 3. AI chatbot (flyttad hit) ── */}
        <section id="chat" className="flex flex-col gap-6">
          <div>
            <h2 className="font-bold text-2xl md:text-3xl">Fråga elpris.ai</h2>
            <p className="text-[#8fafc9] text-sm mt-1">
              AI-assistenten svarar på frågor om elpriset
            </p>
          </div>

          <Chatbot />
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
                Billigt (≤50 öre)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00E5FF]" />
                Normalt (51–99 öre)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                Dyrt (≥100 öre)
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
                  <ReferenceLine y={0} stroke="#ffffff30" strokeDasharray="3 3" />
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

        {/* ── 2b. Daily price analysis ── */}
        <DailyPriceAnalysis area={selectedArea} />

        {/* ── 4. Value blocks ── */}
        <section id="rekommendationer" className="flex flex-col gap-6">
          <h2 className="font-bold text-2xl md:text-3xl">
            Smarta rekommendationer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/guider/spara-el/tvatta-billigt" className="block transition-transform hover:scale-[1.02]">
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
            </Link>
            <Link href="/guider/spara-el/ladda-elbil-billigt" className="block transition-transform hover:scale-[1.02]">
              <ValueCard
                icon="🚗"
                title="Ladda elbilen"
                value={cheap ? cheap.label : "–"}
                detail={
                  cheap
                    ? `Snittpriser ${cheap.avg.toFixed(1).replace(".", ",")} öre/kWh`
                    : "Laddar..."
                }
                accent={priceAccentColor(cheap?.avg ?? null)}
              />
            </Link>
            <Link href="/guider/forsta-elpriset/vad-ar-spotpris" className="block transition-transform hover:scale-[1.02]">
              <ValueCard
                icon={
                  currentPrice !== null && currentPrice <= 0
                    ? "⚡"
                    : "📊"
                }
                title={
                  currentPrice === null
                    ? "PRIS JUST NU"
                    : currentPrice <= 0
                    ? "GRATIS JUST NU"
                    : currentPrice <= 50
                    ? "BILLIGT JUST NU"
                    : currentPrice >= 100
                    ? "DYRT JUST NU"
                    : "NORMALT JUST NU"
                }
                value={
                  currentPrice !== null
                    ? `${currentPrice.toFixed(1).replace(".", ",")} öre`
                    : "–"
                }
                detail={
                  currentPrice === null
                    ? "Laddar..."
                    : currentPrice <= 0
                    ? "Negativt pris – kör allt nu!"
                    : currentPrice <= 50
                    ? "Lågt pris – bra tid att förbruka"
                    : currentPrice >= 100
                    ? "Högt pris – undvik onödig förbrukning"
                    : "Normalt pris just nu"
                }
                accent={
                  currentPrice === null
                    ? "#8fafc9"
                    : currentPrice <= 0
                    ? "#22C55E"
                    : currentPrice <= 50
                    ? "#22C55E"
                    : currentPrice >= 100
                    ? "#EF4444"
                    : "#00E5FF"
                }
              />
            </Link>
          </div>
        </section>

        {/* ── 5. Trust section ── */}
        <Footer id="om-oss" />
      </div>
    </main>
  );
}
