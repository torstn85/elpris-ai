"use client";

// "Just nu"-kortet och kvartsdiagrammet för valt område. Kortet visar kvarten
// som pågår och uppdateras var 30:e sekund. Första renderingen använder
// serverns tid (serverNow) så att server-HTML och hydrering stämmer överens.

import { useEffect, useState } from "react";
import QuarterPriceChart from "@/components/prices/QuarterPriceChart";
import { PRICE_LEVEL_COLORS, PRICE_LEVEL_LABELS, priceLevel } from "@/lib/prices/priceLevel";
import { formatClock } from "@/lib/prices/quarterTicks";
import { currentQuarter } from "@/lib/prices/todaySummary";
import type { QuarterPoint } from "@/lib/prices/quarters";
import type { Area } from "@/lib/prices/today";
import { useArea } from "./AreaSelect";

const QUARTER_MS = 15 * 60 * 1000;
const TICK_MS = 30_000;

const ore1 = (v: number) => (Math.round(v * 10) / 10 || 0).toFixed(1).replace(".", ",");

export default function NowAndChart({
  quarters,
  serverNow,
}: {
  quarters: Record<Area, QuarterPoint[]>;
  serverNow: number;
}) {
  const area = useArea();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const q = currentQuarter(quarters[area], now);
  const level = q ? priceLevel(q.ore) : null;
  const color = level ? PRICE_LEVEL_COLORS[level] : undefined;

  return (
    <section className="flex flex-col gap-8">
      {q && level && (
        <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-5 sm:p-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#8fafc9] mb-1">Just nu i {area}</p>
            <p className="font-extrabold text-5xl tabular-nums" style={{ color }}>
              {ore1(q.ore)} <span className="text-lg font-semibold text-[#8fafc9]">öre/kWh</span>
            </p>
            <p className="text-sm text-[#8fafc9] mt-1">
              kl {formatClock(q.start)}–{formatClock(new Date(Date.parse(q.start) + QUARTER_MS).toISOString())}
            </p>
          </div>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
          >
            {PRICE_LEVEL_LABELS[level]}
          </span>
        </div>
      )}

      <QuarterPriceChart
        quarters={quarters[area]}
        area={area}
        headingLevel="h2"
        title={`Dagens elpris per kvart i ${area}`}
      />
    </section>
  );
}
