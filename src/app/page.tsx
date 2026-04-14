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
import { useState } from "react";

// ─── Placeholder data ────────────────────────────────────────────────────────

const hourlyData = [
  { hour: "00", price: 28 },
  { hour: "01", price: 22 },
  { hour: "02", price: 19 },
  { hour: "03", price: 17 },
  { hour: "04", price: 18 },
  { hour: "05", price: 24 },
  { hour: "06", price: 38 },
  { hour: "07", price: 55 },
  { hour: "08", price: 72 },
  { hour: "09", price: 68 },
  { hour: "10", price: 61 },
  { hour: "11", price: 54 },
  { hour: "12", price: 49 },
  { hour: "13", price: 45 },
  { hour: "14", price: 42 },
  { hour: "15", price: 47 },
  { hour: "16", price: 58 },
  { hour: "17", price: 78 },
  { hour: "18", price: 91 },
  { hour: "19", price: 85 },
  { hour: "20", price: 74 },
  { hour: "21", price: 62 },
  { hour: "22", price: 48 },
  { hour: "23", price: 35 },
];

function getBarColor(price: number): string {
  if (price <= 30) return "#22C55E";
  if (price >= 70) return "#EF4444";
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [chatInput, setChatInput] = useState("");

  return (
    <main className="min-h-screen bg-[#0A2540] text-white">
      {/* ── Nav ── */}
      <nav className="border-b border-[#1E4976] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-extrabold text-xl tracking-tight">
          elpris<span className="text-[#00E5FF]">.ai</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-[#8fafc9]">
          <a href="#" className="hover:text-white transition-colors">
            Elområden
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Prognos
          </a>
          <a href="#" className="hover:text-white transition-colors">
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
            <span className="text-[#8fafc9]">· SE3 · Uppdaterad 14:15</span>
          </div>

          <h1 className="font-extrabold text-5xl md:text-7xl leading-none tracking-tight">
            Elpriset <span className="block md:inline">just nu</span>
          </h1>

          {/* Big price */}
          <div className="flex flex-col items-center gap-1">
            <span
              className="font-black text-8xl md:text-9xl leading-none"
              style={{
                color: "#00E5FF",
                textShadow: "0 0 40px rgba(0,229,255,0.45)",
              }}
            >
              42,3
            </span>
            <span className="text-[#8fafc9] text-xl md:text-2xl font-medium tracking-wide">
              öre / kWh · SE3
            </span>
          </div>

          <p className="text-[#8fafc9] max-w-md text-base md:text-lg leading-relaxed">
            Realtidspriser för alla svenska elområden. AI-analys av bästa tid
            att använda el.
          </p>

          <button className="mt-2 bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors duration-150 shadow-lg shadow-[#22C55E]/20">
            Se alla elområden
          </button>
        </section>

        {/* ── 2. Price chart ── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-bold text-2xl md:text-3xl">
                Dagens timpriser
              </h2>
              <p className="text-[#8fafc9] text-sm mt-1">
                Måndag 14 april · SE3 · öre/kWh
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-5 text-xs text-[#8fafc9]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" />
                Billigt (&le;30)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00E5FF]" />
                Normalt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                Dyrt (&ge;70)
              </span>
            </div>
          </div>

          <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={hourlyData}
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
                  {hourlyData.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={getBarColor(entry.price)}
                      opacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                Priset är{" "}
                <span className="text-[#00E5FF] font-semibold">
                  42,3 öre/kWh
                </span>{" "}
                just nu i SE3. Billigaste perioden är kl. 02–05 (17–19 öre).
                Vänta gärna till natten!
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
        <section className="flex flex-col gap-6">
          <h2 className="font-bold text-2xl md:text-3xl">
            Smarta rekommendationer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ValueCard
              icon="🧺"
              title="Billigaste tvättid"
              value="03:00–05:00"
              detail="17–19 öre/kWh · Spara upp till 4 kr/tvätt"
              accent="#22C55E"
            />
            <ValueCard
              icon="🚗"
              title="Ladda elbilen"
              value="02:00–06:00"
              detail="Nattpris 17–24 öre/kWh · Bäst just nu"
              accent="#00E5FF"
            />
            <ValueCard
              icon="🌅"
              title="Morgondagens pris"
              value="38,1 öre"
              detail="Prognos SE3 · 6% lägre än idag"
              accent="#f59e0b"
            />
          </div>
        </section>

        {/* ── 5. Trust section ── */}
        <section className="border-t border-[#1E4976] pt-10 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="font-extrabold text-lg text-[#8fafc9]">
              elpris<span className="text-[#00E5FF]">.ai</span>
            </span>

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
