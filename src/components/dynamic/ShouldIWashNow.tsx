'use client';

import { useEffect, useState } from 'react';
import { isCurrentHour, isFutureHour, type HourEntry } from '@/lib/prices/hourly';

const HOUR_MS = 60 * 60 * 1000;

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
}

interface HourPrice {
  hour: number;
  price: number;
  /** Unik start (UTC) — 02 kan förekomma två gånger natten till normaltid. */
  startUTC: string;
  endUTC: string;
  label: string;
  dst?: HourEntry['dst'];
}

/** Från API-formatet till komponentens. */
function toHourPrice(item: HourEntry): HourPrice {
  return { hour: item.hour, price: item.ore_per_kwh, startUTC: item.startUTC, endUTC: item.endUTC, label: item.label, dst: item.dst };
}

/** Starttiden som "kl"-text: "02:00", eller "02:00 (sommartid)" när timmen finns två gånger. */
function startClock(h: HourPrice): string {
  const suffix = h.dst === 'summer' ? ' (sommartid)' : h.dst === 'winter' ? ' (normaltid)' : '';
  return `${h.label.slice(0, 5)}${suffix}`;
}

/** Hela timmar mellan två timstarter (verklig tid, även på dygn med 23/25 timmar). */
function hoursBetween(from: HourPrice, to: HourPrice): number {
  return Math.round((Date.parse(to.startUTC) - Date.parse(from.startUTC)) / HOUR_MS);
}

type Decision = 'JA' | 'VÄNTA' | 'OK';

interface WashResult {
  decision: Decision;
  currentPrice: number;
  currentHour: HourPrice;
  nextCheapHour: HourPrice | null;
}

function priceColor(price: number): string {
  if (price <= 50) return '#22C55E';
  if (price < 100) return '#00E5FF';
  return '#EF4444';
}

function getBackgroundLevel(price: number): Decision {
  if (price <= 50) return 'JA';
  if (price < 100) return 'OK';
  return 'VÄNTA';
}

function lastSlotTime(): string {
  const now = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    parseInt(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', ...opts }).format(now), 10);
  const hour = fmt({ hour: 'numeric', hour12: false });
  const minute = fmt({ minute: 'numeric' });
  const slotMinute = Math.floor(minute / 15) * 15;
  return `${String(hour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
}

function analyze(hours: HourPrice[]): WashResult | null {
  if (hours.length === 0) return null;
  // På tid, inte klocktimme — 02 kan förekomma två gånger natten till normaltid.
  const nowMs = Date.now();
  const current = hours.find((h) => isCurrentHour(h, nowMs));
  if (!current) return null;

  const sorted = [...hours].sort((a, b) => a.price - b.price);
  const cheapest6 = new Set(sorted.slice(0, 6).map((h) => h.startUTC));
  const mostExpensive6 = new Set(sorted.slice(-6).map((h) => h.startUTC));

  const futureHours = hours.filter((h) => isFutureHour(h, nowMs));
  const nextCheapHour =
    futureHours.length > 0
      ? futureHours.reduce((min, h) => (h.price < min.price ? h : min))
      : null;

  let decision: Decision;
  if (cheapest6.has(current.startUTC)) decision = 'JA';
  else if (mostExpensive6.has(current.startUTC)) decision = 'VÄNTA';
  else decision = 'OK';

  return { decision, currentPrice: current.price, currentHour: current, nextCheapHour };
}

const CONFIG = {
  JA: {
    emoji: '🧺',
    label: 'Tvätta nu!',
    gradient: 'from-green-950 to-[#0A2540]',
    ring: 'ring-green-900',
    accent: 'text-green-400',
    tip: 'Nu är ett bra tillfälle att köra tvätt, diskmaskin eller ladda elbilen.',
  },
  VÄNTA: {
    emoji: '⏰',
    label: 'Vänta lite',
    gradient: 'from-red-950 to-[#0A2540]',
    ring: 'ring-red-900',
    accent: 'text-red-400',
    tip: null,
  },
  OK: {
    emoji: '👌',
    label: 'OK att tvätta',
    gradient: 'from-blue-950 to-[#0A2540]',
    ring: 'ring-blue-900',
    accent: 'text-blue-400',
    tip: null,
  },
};

export default function ShouldIWashNow({ area: areaProp = 'SE3' }: Props) {
  const [selectedArea, setSelectedArea] = useState<Area>(areaProp);
  const [result, setResult] = useState<WashResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowCheap, setTomorrowCheap] = useState<HourPrice | null>(null);
  const [todayHours, setTodayHours] = useState<HourPrice[]>([]);
  const [tomorrowHours, setTomorrowHours] = useState<HourPrice[]>([]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setTomorrowCheap(null);
    setTodayHours([]);
    setTomorrowHours([]);
    setLoading(true);

    async function fetchData() {
      try {
        const [todayRes, tomorrowRes] = await Promise.allSettled([
          fetch('/api/prices/today'),
          fetch(`/api/prices/tomorrow?area=${selectedArea}`),
        ]);

        if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
          const json = await todayRes.value.json();
          const areaData: HourEntry[] = json.areas?.[selectedArea] || [];
          const hours: HourPrice[] = areaData.map(toHourPrice);
          if (!cancelled) {
            setTodayHours(hours);
            setResult(analyze(hours));
            setError(null);
          }
        } else {
          if (!cancelled) setError('Kunde inte hämta prisdata');
        }

        if (tomorrowRes.status === 'fulfilled' && tomorrowRes.value.ok) {
          const tj = await tomorrowRes.value.json();
          if (tj.available !== false && tj.areas?.[selectedArea]?.length > 0) {
            const tmHours: HourPrice[] = (tj.areas[selectedArea] as HourEntry[]).map(toHourPrice);
            const cheapest = tmHours.reduce((min, h) => (h.price < min.price ? h : min));
            if (!cancelled) {
              setTomorrowHours(tmHours);
              setTomorrowCheap(cheapest);
            }
          }
        }
      } catch {
        if (!cancelled) setError('Kunde inte hämta prisdata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedArea]);

  const areaSelector = (
    <div className="flex gap-1 flex-shrink-0">
      {(['SE1', 'SE2', 'SE3', 'SE4'] as Area[]).map((a) => (
        <button
          key={a}
          onClick={() => setSelectedArea(a)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            selectedArea === a
              ? 'bg-cyan-500 text-slate-900'
              : 'bg-[#1E4976] text-[#8fafc9] hover:bg-[#1E4976]/80'
          }`}
          aria-label={`Välj elområde ${a}`}
        >
          {a}
        </button>
      ))}
    </div>
  );

  if (loading || !result) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976] animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-[#1E4976] rounded w-40" />
          {areaSelector}
        </div>
        <div className="h-12 bg-[#1E4976] rounded w-1/2 mb-3" />
        <div className="h-4 bg-[#1E4976] rounded w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        <div className="flex items-center justify-between mb-3">{areaSelector}</div>
        <p className="text-amber-400 text-sm">{error}</p>
      </div>
    );
  }

  const cfg = CONFIG[result.decision];
  const bgCfg = CONFIG[getBackgroundLevel(result.currentPrice)];

  const hoursUntilCheap =
    result.nextCheapHour !== null
      ? hoursBetween(result.currentHour, result.nextCheapHour)
      : null;

  const showTomorrow =
    tomorrowCheap !== null &&
    !(result.decision === 'JA' && tomorrowCheap.price > result.currentPrice) &&
    Math.abs(tomorrowCheap.price - result.currentPrice) / result.currentPrice > 0.1;

  const nextPriceClr = result.nextCheapHour ? priceColor(result.nextCheapHour.price) : '#00E5FF';

  const tomorrowLine = showTomorrow && tomorrowCheap ? (
    <p className="text-slate-300">
      Eller imorgon kl{' '}
      <span className="font-semibold" style={{ color: priceColor(tomorrowCheap.price) }}>
        {startClock(tomorrowCheap)}
      </span>{' '}
      då priset är{' '}
      <span className="font-semibold" style={{ color: priceColor(tomorrowCheap.price) }}>
        {tomorrowCheap.price.toFixed(1)} öre/kWh
      </span>.
    </p>
  ) : null;

  // ── Best alternative ≥3h ahead (JA-mode only) ─────────────────────────────
  // Minst 3 timmar fram i verklig tid, räknat från innevarande timmes start.
  const nowHour = result.currentHour;
  let bestAlternative: (HourPrice & { isToday: boolean }) | null = null;

  if (result.decision === 'JA') {
    const todayCandidates = todayHours
      .filter((h) => hoursBetween(nowHour, h) >= 3)
      .map((h) => ({ ...h, isToday: true }));

    const tomorrowCandidates = tomorrowHours
      .filter((h) => hoursBetween(nowHour, h) >= 3)
      .map((h) => ({ ...h, isToday: false }));

    const all = [...todayCandidates, ...tomorrowCandidates];
    if (all.length > 0) {
      bestAlternative = all.reduce((min, h) => (h.price < min.price ? h : min));
    }
  }

  const alternativeLine = bestAlternative ? (
    <p className="text-slate-300">
      {bestAlternative.isToday ? (
        <>
          Alternativt: vänta{' '}
          <span className="font-semibold" style={{ color: priceColor(bestAlternative.price) }}>
            {hoursBetween(nowHour, bestAlternative)}{' '}
            {hoursBetween(nowHour, bestAlternative) === 1 ? 'timme' : 'timmar'}
          </span>{' '}
          då elpriset är{' '}
          <span className="font-semibold" style={{ color: priceColor(bestAlternative.price) }}>
            {bestAlternative.price.toFixed(1)} öre/kWh
          </span>.
        </>
      ) : (
        <>
          Alternativt imorgon kl{' '}
          <span className="font-semibold" style={{ color: priceColor(bestAlternative.price) }}>
            {startClock(bestAlternative)}
          </span>{' '}
          —{' '}
          <span className="font-semibold" style={{ color: priceColor(bestAlternative.price) }}>
            {bestAlternative.price.toFixed(1)} öre/kWh
          </span>.
        </>
      )}
    </p>
  ) : null;

  return (
    <div className={`my-6 rounded-2xl bg-gradient-to-br ${bgCfg.gradient} p-6 ring-1 ${bgCfg.ring}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Ska jag tvätta nu?</h3>
          <p className={`text-lg font-bold mt-0.5 ${cfg.accent}`}>
            {cfg.label} {cfg.emoji}
          </p>
        </div>
        {areaSelector}
      </div>

      {/* Current price */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-5xl font-bold leading-none" style={{ color: priceColor(result.currentPrice) }}>
          {result.currentPrice.toFixed(1)}
        </span>
        <span className="text-slate-400 text-sm">öre/kWh<br />just nu i {selectedArea}</span>
      </div>

      {/* Decision message */}
      <div className="space-y-0.5 text-sm">
        {result.decision === 'JA' && (
          <>
            <p className="text-slate-300">{cfg.tip}</p>
            {alternativeLine}
          </>
        )}

        {result.decision === 'VÄNTA' && result.nextCheapHour && (
          <>
            <p className="text-slate-300">
              Priset är bland dagens dyraste.{' '}
              {hoursUntilCheap !== null && hoursUntilCheap > 0 ? (
                <>
                  Vänta{' '}
                  <span className="font-semibold" style={{ color: nextPriceClr }}>
                    {hoursUntilCheap} {hoursUntilCheap === 1 ? 'timme' : 'timmar'}
                  </span>{' '}
                  — kl{' '}
                  <span className="font-semibold" style={{ color: nextPriceClr }}>
                    {startClock(result.nextCheapHour)}
                  </span>{' '}
                  sjunker priset till{' '}
                  <span className="font-semibold" style={{ color: nextPriceClr }}>
                    {result.nextCheapHour.price.toFixed(1)} öre/kWh
                  </span>.
                </>
              ) : (
                <>Inga billigare timmar återstår idag.</>
              )}
            </p>
            {tomorrowLine}
          </>
        )}

        {result.decision === 'VÄNTA' && !result.nextCheapHour && (
          <>
            <p className="text-slate-300">
              Priset är bland dagens dyraste. Inga billigare timmar återstår idag.
            </p>
            {tomorrowLine}
          </>
        )}

        {result.decision === 'OK' && result.nextCheapHour && (
          <>
            <p className="text-slate-300">
              Priset är varken billigast eller dyrast just nu. Det blir billigare kl{' '}
              <span className="font-semibold" style={{ color: nextPriceClr }}>
                {startClock(result.nextCheapHour)}
              </span>{' '}
              (
              <span className="font-semibold" style={{ color: nextPriceClr }}>
                {result.nextCheapHour.price.toFixed(1)} öre/kWh
              </span>
              ).
            </p>
            {tomorrowLine}
          </>
        )}

        {result.decision === 'OK' && !result.nextCheapHour && (
          <>
            <p className="text-slate-300">
              Priset är okej. Det finns inga billigare timmar kvar idag.
            </p>
            {tomorrowLine}
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-slate-500 flex flex-wrap gap-x-1">
        <span>Uppdaterad {lastSlotTime()} · Spotpris i {selectedArea} ·</span>
        <span>Priser som visas här är timsnitt och exkl. moms & nätavgift</span>
      </p>
    </div>
  );
}
