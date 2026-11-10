"use client";

// "Just nu"-kortet och kvartsdiagrammet för valt område (eller ett låst område
// via prop area, som på /elomrade/seX). Kortet visar kvarten
// som pågår och uppdateras strax efter varje kvartsbyte och när fliken visas
// igen (useNow; bara dagens priser — /elpris-imorgon visar bara diagrammet).
// Första renderingen använder serverns tid (serverNow) så att server-HTML och
// hydrering stämmer överens.

import QuarterPriceChart from "@/components/prices/QuarterPriceChart";
import { PRICE_LEVEL_COLORS, PRICE_LEVEL_LABELS, priceLevel } from "@/lib/prices/priceLevel";
import { quarterRangeLabel } from "@/lib/prices/dstLabels";
import { currentQuarter } from "@/lib/prices/todaySummary";
import type { QuarterPoint } from "@/lib/prices/quarters";
import type { Area } from "@/lib/prices/today";
import { ore1 } from "@/lib/format/ore";
import { useNow } from "@/lib/prices/useLiveClock";
import { useArea } from "./AreaSelect";

export default function NowAndChart({
  quarters,
  serverNow,
  titlePrefix = "Dagens elpris per kvart i",
  title,
  showNow = true,
  area: lockedArea,
}: {
  quarters: Record<Area, QuarterPoint[]>;
  serverNow: number;
  /** Diagramrubrik före områdets namn. */
  titlePrefix?: string;
  /** Hela diagramrubriken; ersätter "{titlePrefix} {område}". */
  title?: string;
  /** Visa "Just nu"-kortet. */
  showNow?: boolean;
  /** Lås till ett område (t.ex. /elomrade/se1) i stället för AreaProvider-valet. */
  area?: Area;
}) {
  const selectedArea = useArea();
  const area = lockedArea ?? selectedArea;
  const now = useNow(serverNow);

  const q = showNow ? currentQuarter(quarters[area], now) : null;
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
              kl {quarterRangeLabel(q.start)}
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
        title={title ?? `${titlePrefix} ${area}`}
        nowMs={now}
      />
    </section>
  );
}
