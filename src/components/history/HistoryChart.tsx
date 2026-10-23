"use client";

// Månadssnitt per elområde sedan november 2021 som linjediagram. Områdena kan
// visas och döljas; varje linje har namn i förklaringen och i tooltip, och SE2
// och SE4 är streckade så att färgen inte är enda skillnaden (SE1 och SE2 låg
// på samma nivå fram till 2024). Samma siffror finns i tabellerna på sidan.

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonthLong, formatMonthShort } from "@/lib/format/date";
import { integer, ore1 } from "@/lib/format/ore";

const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
type Area = (typeof AREAS)[number];

const STYLE: Record<Area, { color: string; dash?: string }> = {
  SE1: { color: "#60A5FA" },
  SE2: { color: "#C084FC", dash: "6 4" },
  SE3: { color: "#00E5FF" },
  SE4: { color: "#FBBF24", dash: "2 3" },
};

/** Bredd (px) från vilken x-axeln visar "jan 2023" i stället för "2023". */
const WIDE_PX = 560;

export interface HistoryChartPoint {
  /** "YYYY-MM" */
  month: string;
  partial: boolean;
  SE1: number | null;
  SE2: number | null;
  SE3: number | null;
  SE4: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | null; payload?: HistoryChartPoint }[];
}

function ChartTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg bg-[#0F3460] px-3 py-2 ring-1 ring-[#1E4976] shadow-xl text-sm">
      <p className="text-xs text-[#8fafc9] mb-1">
        {formatMonthLong(point.month)}
        {point.partial ? " (hittills)" : ""}
      </p>
      {payload!.map((p) => {
        const area = p.dataKey as Area;
        if (p.value == null) return null;
        return (
          <p key={area} className="text-white tabular-nums">
            <span style={{ color: STYLE[area].color }}>{area}</span> {ore1(p.value)}
            {" "}
            <span className="text-[#8fafc9]">öre/kWh</span>
          </p>
        );
      })}
    </div>
  );
}

export default function HistoryChart({ data }: { data: HistoryChartPoint[] }) {
  const [visible, setVisible] = useState<Record<Area, boolean>>({ SE1: true, SE2: true, SE3: true, SE4: true });
  const boxRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= WIDE_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggle = (area: Area) =>
    setVisible((v) => {
      const next = { ...v, [area]: !v[area] };
      // Minst ett område ska alltid synas.
      return AREAS.some((a) => next[a]) ? next : v;
    });

  // Etikett varje januari ("jan 2023", på smal skärm "2023"). Första månaden
  // (nov 2021) får ingen egen etikett – den krockar med januari två månader senare.
  const ticks = data.filter((d) => d.month.endsWith("-01")).map((d) => d.month);
  const tickLabel = (month: string) => (wide ? formatMonthShort(month) : month.slice(0, 4));

  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Visa eller dölj elområden">
        {AREAS.map((area) => (
          <button
            key={area}
            type="button"
            aria-pressed={visible[area]}
            onClick={() => toggle(area)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border transition-colors ${
              visible[area]
                ? "border-[#1E4976] bg-[#0A2540] text-white"
                : "border-[#1E4976]/50 bg-transparent text-[#8fafc9] line-through"
            }`}
          >
            <svg width="22" height="8" aria-hidden="true">
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke={STYLE[area].color}
                strokeWidth="3"
                strokeDasharray={STYLE[area].dash}
                opacity={visible[area] ? 1 : 0.4}
              />
            </svg>
            {area}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#8fafc9] mb-1">öre/kWh</p>
      <div ref={boxRef} className="h-[280px] sm:h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#1E4976" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              ticks={ticks}
              tickFormatter={tickLabel}
              tick={{ fill: "#8fafc9", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#1E4976" }}
              interval={0}
              minTickGap={4}
            />
            <YAxis
              tickFormatter={integer}
              tick={{ fill: "#8fafc9", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#8fafc9", strokeOpacity: 0.4 }} />
            {AREAS.map((area) =>
              visible[area] ? (
                <Line
                  key={area}
                  type="linear"
                  dataKey={area}
                  name={area}
                  stroke={STYLE[area].color}
                  strokeWidth={2}
                  strokeDasharray={STYLE[area].dash}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
