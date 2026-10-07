"use client";

// Dagens elpris per kvart som trappstegsdiagram. x-axeln är index i
// kvartslistan (0..n) så att dygn med 92, 96 och 100 kvartar ritas rätt.
// Färgen sätts per kvart (prisnivå), inte per höjd, med en horisontell gradient.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  usePlotArea,
} from "recharts";
import { formatSwedishDay } from "@/lib/format/date";
import {
  PRICE_LEVEL_COLORS,
  PRICE_LEVEL_LABELS,
  priceLevel,
  type PriceLevel,
} from "@/lib/prices/priceLevel";
import { buildHourTicks, buildPriceTicks, formatClock } from "@/lib/prices/quarterTicks";
import type { QuarterPoint } from "@/lib/prices/quarters";

export { buildHourTicks, buildPriceTicks };

const QUARTER_MS = 15 * 60 * 1000;
const CHART_HEIGHT = 220;
/** Bredd (px) från vilken axeln får etikett var 3:e timme i stället för var 6:e. */
const WIDE_PX = 640;
const NOW_TICK_MS = 30_000;

const LEGEND: { level: PriceLevel; text: string }[] = [
  { level: "cheap", text: "Billigt ≤ 50 öre" },
  { level: "normal", text: "Normalt 51–99 öre" },
  { level: "expensive", text: "Dyrt ≥ 100 öre" },
];

/** En decimal med decimalkomma, som startsidans livepris. */
const ore1 = (v: number) => v.toFixed(1).replace(".", ",");

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const swedishDate = (ms: number) => SWEDISH_DATE.format(new Date(ms));

interface Plot {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rapporterar plotytans position (px) till föräldern — för gradient-kontroll och pekarhantering. */
function PlotReporter({ onChange }: { onChange: (p: Plot) => void }) {
  const plot = usePlotArea();
  const x = plot?.x;
  const y = plot?.y;
  const width = plot?.width;
  const height = plot?.height;
  useEffect(() => {
    if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
      onChange({ x, y, width, height });
    }
  }, [x, y, width, height, onChange]);
  return null;
}

interface Stats {
  avg: number;
  min: QuarterPoint;
  max: QuarterPoint;
}

function statsFor(quarters: QuarterPoint[]): Stats {
  let min = quarters[0];
  let max = quarters[0];
  for (const q of quarters) {
    if (q.ore < min.ore) min = q;
    if (q.ore > max.ore) max = q;
  }
  return { avg: quarters.reduce((s, q) => s + q.ore, 0) / quarters.length, min, max };
}

/** Hårda stopp per kvart; intilliggande kvartar med samma nivå slås ihop. */
function gradientStops(quarters: QuarterPoint[]): { offset: number; color: string }[] {
  const n = quarters.length;
  const stops: { offset: number; color: string }[] = [];
  let runStart = 0;
  for (let i = 1; i <= n; i++) {
    const level = priceLevel(quarters[runStart].ore);
    if (i < n && priceLevel(quarters[i].ore) === level) continue;
    const color = PRICE_LEVEL_COLORS[level];
    stops.push({ offset: runStart / n, color }, { offset: i / n, color });
    runStart = i;
  }
  return stops;
}

export default function QuarterPriceChart({
  quarters,
  area,
  placeLabel,
  headingLevel = "h2",
  loading = false,
}: {
  quarters: QuarterPoint[];
  area: string;
  /** Ort, t.ex. "Göteborg" — ger underraden "Göteborg (SE3)". */
  placeLabel?: string;
  headingLevel?: "h2" | "h3";
  /** Visa laddningsyta i stället för tomt läge medan datan hämtas. */
  loading?: boolean;
}) {
  const Heading = headingLevel;
  const gradientId = `qpc-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const n = quarters.length;
  const hasData = n > 0;

  // Klockan sätts först i webbläsaren (ingen hydreringsskillnad) och tickar var 30:e sekund.
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWide(el.clientWidth >= WIDE_PX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // Diagrammets div finns först när data finns — koppla om då.
  }, [hasData, loading]);

  useEffect(() => setActive(null), [quarters]);
  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const data = useMemo(
    () =>
      hasData
        ? [...quarters.map((q, i) => ({ x: i, ore: q.ore })), { x: n, ore: quarters[n - 1].ore }]
        : [],
    [quarters, hasData, n],
  );
  const ticks = useMemo(() => buildHourTicks(quarters, wide ? 3 : 6), [quarters, wide]);
  const stops = useMemo(() => gradientStops(quarters), [quarters]);
  const stats = useMemo(() => (hasData ? statsFor(quarters) : null), [quarters, hasData]);
  const yAxis = useMemo(
    () => (stats ? buildPriceTicks(stats.min.ore, stats.max.ore) : null),
    [stats],
  );

  // "Nu" bara när kvartarna gäller dagens svenska datum.
  const nowMark = useMemo(() => {
    if (!hasData || now === null) return null;
    if (swedishDate(Date.parse(quarters[0].start)) !== swedishDate(now)) return null;
    const i = quarters.findIndex((q) => {
      const start = Date.parse(q.start);
      return start <= now && now < start + QUARTER_MS;
    });
    if (i < 0) return null;
    return { i, x: i + (now - Date.parse(quarters[i].start)) / QUARTER_MS };
  }, [quarters, hasData, now]);

  const onPlotChange = useCallback((p: Plot) => {
    setPlot((prev) =>
      prev && prev.x === p.x && prev.y === p.y && prev.width === p.width && prev.height === p.height
        ? prev
        : p,
    );
  }, []);

  /** Aktiv kvart = den under pekaren (mus eller finger). */
  const pick = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || n === 0) return;
      const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
      setActive(Math.min(n - 1, Math.max(0, i)));
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    [n],
  );
  const release = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setActive(null), 2000);
  }, []);

  const subline = [
    hasData ? formatSwedishDay(new Date(quarters[0].start)) : null,
    placeLabel ? `${placeLabel} (${area})` : area,
    "öre/kWh",
  ]
    .filter(Boolean)
    .join(" · ");

  const ariaLabel = stats
    ? `Elpris per kvart idag i ${area}: snitt ${ore1(stats.avg)} öre, lägst ${ore1(stats.min.ore)} öre kl ${formatClock(stats.min.start)}, högst ${ore1(stats.max.ore)} öre kl ${formatClock(stats.max.start)}.`
    : undefined;

  const activeQ = active !== null ? quarters[active] : null;
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const tooltipLeft =
    activeQ && plot
      ? Math.min(
          Math.max(plot.x + ((active! + 0.5) / n) * plot.width, 70),
          Math.max(70, containerWidth - 70),
        )
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading className="font-bold text-2xl md:text-3xl">Dagens elpris per kvart</Heading>
        <p className="text-[#8fafc9] text-sm mt-1">{subline}</p>
        <p className="text-[#8fafc9] text-xs mt-0.5">
          Spotpris exkl. moms och nätavgift. Varje pris gäller i 15 minuter.
        </p>
      </div>

      <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-4 sm:p-6">
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-[#0A2540] animate-pulse" />
          </div>
        ) : !hasData ? (
          <div className="h-[220px] flex items-center justify-center text-[#8fafc9] text-sm">
            Prisdata ej tillgänglig
          </div>
        ) : (
          <>
            <div ref={containerRef} className="relative" role="img" aria-label={ariaLabel}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={data} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    {/* Horisontell gradient över areans bounding box, som spänner x = 0..n. */}
                    <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                      {stops.map((s, k) => (
                        <stop key={k} offset={s.offset} stopColor={s.color} />
                      ))}
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, n]}
                    ticks={ticks}
                    interval={0}
                    tickFormatter={(i: number) => (quarters[i] ? formatClock(quarters[i].start) : "")}
                    tick={{ fill: "#8fafc9", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDataOverflow
                  />
                  <YAxis
                    ticks={yAxis?.ticks}
                    domain={yAxis?.domain}
                    interval={0}
                    allowDataOverflow
                    tick={{ fill: "#8fafc9", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine y={0} stroke="#ffffff30" strokeDasharray="3 3" />
                  {activeQ && (
                    <ReferenceArea
                      x1={active!}
                      x2={active! + 1}
                      fill="#ffffff"
                      fillOpacity={0.08}
                      stroke="none"
                    />
                  )}
                  <Area
                    type="stepAfter"
                    dataKey="ore"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={2}
                    strokeOpacity={1}
                    fill={`url(#${gradientId})`}
                    fillOpacity={0.35}
                    isAnimationActive={false}
                    activeDot={false}
                    dot={false}
                  />
                  {nowMark && (
                    <ReferenceLine
                      x={nowMark.x}
                      stroke="#ffffff"
                      strokeOpacity={0.7}
                      strokeDasharray="3 3"
                      label={{ value: "Nu", position: "top", fill: "#ffffff", fontSize: 11 }}
                    />
                  )}
                  {nowMark && (
                    <ReferenceDot
                      x={nowMark.i + 0.5}
                      y={quarters[nowMark.i].ore}
                      r={4}
                      fill={PRICE_LEVEL_COLORS[priceLevel(quarters[nowMark.i].ore)]}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  )}
                  <PlotReporter onChange={onPlotChange} />
                </AreaChart>
              </ResponsiveContainer>

              {/* Pekaryta över plotytan: mus och touch. pan-y låter sidan scrolla vertikalt. */}
              {plot && (
                <div
                  className="absolute"
                  style={{
                    left: plot.x,
                    top: plot.y,
                    width: plot.width,
                    height: plot.height,
                    touchAction: "pan-y",
                  }}
                  onPointerDown={pick}
                  onPointerMove={pick}
                  onPointerUp={release}
                  onPointerCancel={() => setActive(null)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
                  data-testid="quarter-chart-pointer"
                />
              )}

              {activeQ && plot && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 bg-[#0F3460] border border-[#1E4976] rounded-lg px-3 py-2 text-sm shadow-xl whitespace-nowrap"
                  style={{ left: tooltipLeft, top: 0 }}
                  aria-hidden
                >
                  <p className="text-[#8fafc9] mb-0.5">
                    {formatClock(activeQ.start)}–
                    {formatClock(new Date(Date.parse(activeQ.start) + QUARTER_MS).toISOString())}
                  </p>
                  <p className="font-semibold text-white">
                    {ore1(activeQ.ore)} <span className="text-[#00E5FF] text-xs font-normal">öre/kWh</span>
                  </p>
                  <p
                    className="text-xs font-medium"
                    style={{ color: PRICE_LEVEL_COLORS[priceLevel(activeQ.ore)] }}
                  >
                    {PRICE_LEVEL_LABELS[priceLevel(activeQ.ore)]}
                  </p>
                </div>
              )}
            </div>

            {stats && (
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#cfe0f0]">
                <span>Snitt {ore1(stats.avg)} öre</span>
                <span>
                  Lägst {ore1(stats.min.ore)} öre kl {formatClock(stats.min.start)}
                </span>
                <span>
                  Högst {ore1(stats.max.ore)} öre kl {formatClock(stats.max.start)}
                </span>
              </p>
            )}
          </>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8fafc9]">
          {LEGEND.map(({ level, text }) => (
            <span key={level} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PRICE_LEVEL_COLORS[level] }} />
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
