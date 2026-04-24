'use client';

import { useEffect, useState } from 'react';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
}

interface HourPrice {
  hour: number;
  price: number;
}

type Decision = 'JA' | 'VÄNTA' | 'OK';

interface ChargeResult {
  decision: Decision;
  currentPrice: number;
  nextCheapHour: HourPrice | null;
}

function priceColor(price: number): string {
  if (price <= 50) return '#22C55E';
  if (price < 100) return '#00E5FF';
  return '#EF4444';
}

function getCurrentStockholmHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10
  );
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

function analyze(hours: HourPrice[]): ChargeResult | null {
  if (hours.length === 0) return null;
  const currentHour = getCurrentStockholmHour();
  const current = hours.find((h) => h.hour === currentHour);
  if (!current) return null;

  const sorted = [...hours].sort((a, b) => a.price - b.price);
  const cheapest6 = new Set(sorted.slice(0, 6).map((h) => h.hour));
  const mostExpensive6 = new Set(sorted.slice(-6).map((h) => h.hour));

  const futureHours = hours.filter((h) => h.hour > currentHour);
  const nextCheapHour =
    futureHours.length > 0
      ? futureHours.reduce((min, h) => (h.price < min.price ? h : min))
      : null;

  let decision: Decision;
  if (cheapest6.has(currentHour)) decision = 'JA';
  else if (mostExpensive6.has(currentHour)) decision = 'VÄNTA';
  else decision = 'OK';

  return { decision, currentPrice: current.price, nextCheapHour };
}

const CONFIG = {
  JA: {
    emoji: '🚗',
    label: 'Ladda nu!',
    gradient: 'from-green-950 to-[#0A2540]',
    ring: 'ring-green-900',
    accent: 'text-green-400',
    tip: 'Sätt på laddningen — priset är bland dagens 6 billigaste timmar.',
  },
  VÄNTA: {
    emoji: '⏰',
    label: 'Vänta lite',
    gradient: 'from-amber-950 to-[#0A2540]',
    ring: 'ring-amber-900',
    accent: 'text-amber-400',
    tip: null,
  },
  OK: {
    emoji: '👌',
    label: 'OK att ladda',
    gradient: 'from-blue-950 to-[#0A2540]',
    ring: 'ring-blue-900',
    accent: 'text-blue-400',
    tip: null,
  },
};

export default function ShouldIChargeNow({ area: areaProp = 'SE3' }: Props) {
  const [selectedArea, setSelectedArea] = useState<Area>(areaProp);
  const [result, setResult] = useState<ChargeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowCheap, setTomorrowCheap] = useState<HourPrice | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setTomorrowCheap(null);
    setLoading(true);

    async function fetchData() {
      try {
        const [todayRes, tomorrowRes] = await Promise.allSettled([
          fetch('/api/prices/today'),
          fetch(`/api/prices/tomorrow?area=${selectedArea}`),
        ]);

        if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
          const json = await todayRes.value.json();
          const areaData: Array<{ hour: number; ore_per_kwh: number }> =
            json.areas?.[selectedArea] || [];
          const hours: HourPrice[] = areaData.map((item) => ({
            hour: item.hour,
            price: item.ore_per_kwh,
          }));
          if (!cancelled) { setResult(analyze(hours)); setError(null); }
        } else {
          if (!cancelled) setError('Kunde inte hämta prisdata');
        }

        if (tomorrowRes.status === 'fulfilled' && tomorrowRes.value.ok) {
          const tj = await tomorrowRes.value.json();
          if (tj.available !== false && tj.areas?.[selectedArea]?.length > 0) {
            const tmHours: HourPrice[] = tj.areas[selectedArea].map(
              (item: { hour: number; ore_per_kwh: number }) => ({
                hour: item.hour,
                price: item.ore_per_kwh,
              })
            );
            const cheapest = tmHours.reduce((min, h) => (h.price < min.price ? h : min));
            if (!cancelled) setTomorrowCheap(cheapest);
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
  const hoursUntilCheap =
    result.nextCheapHour !== null
      ? result.nextCheapHour.hour - getCurrentStockholmHour()
      : null;

  const showTomorrow =
    tomorrowCheap !== null &&
    !(result.decision === 'JA' && tomorrowCheap.price > result.currentPrice) &&
    Math.abs(tomorrowCheap.price - result.currentPrice) / result.currentPrice > 0.1;

  const nextPriceClr = result.nextCheapHour ? priceColor(result.nextCheapHour.price) : '#00E5FF';

  return (
    <div className={`my-6 rounded-2xl bg-gradient-to-br ${cfg.gradient} p-6 ring-1 ${cfg.ring}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Ska jag ladda nu?</h3>
          <p className={`text-sm font-semibold mt-0.5 ${cfg.accent}`}>
            {cfg.emoji} {cfg.label}
          </p>
        </div>
        {areaSelector}
      </div>

      {/* Current price */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-5xl font-bold" style={{ color: priceColor(result.currentPrice) }}>
          {result.currentPrice.toFixed(1)}
        </span>
        <span className="text-slate-400 text-sm">öre/kWh just nu i {selectedArea}</span>
      </div>

      {/* Decision message */}
      <div className="space-y-2 text-sm">
        {result.decision === 'JA' && (
          <p className="text-slate-300">{cfg.tip}</p>
        )}

        {result.decision === 'VÄNTA' && result.nextCheapHour && (
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
                  {String(result.nextCheapHour.hour).padStart(2, '0')}:00
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
        )}

        {result.decision === 'VÄNTA' && !result.nextCheapHour && (
          <p className="text-slate-300">
            Priset är bland dagens dyraste. Inga billigare timmar återstår idag.
          </p>
        )}

        {result.decision === 'OK' && result.nextCheapHour && (
          <p className="text-slate-300">
            Priset är okej just nu. Det blir billigare kl{' '}
            <span className="font-semibold" style={{ color: nextPriceClr }}>
              {String(result.nextCheapHour.hour).padStart(2, '0')}:00
            </span>{' '}
            (
            <span className="font-semibold" style={{ color: nextPriceClr }}>
              {result.nextCheapHour.price.toFixed(1)} öre/kWh
            </span>
            ).
          </p>
        )}

        {result.decision === 'OK' && !result.nextCheapHour && (
          <p className="text-slate-300">
            Priset är okej. Det finns inga billigare timmar kvar idag.
          </p>
        )}

        {showTomorrow && tomorrowCheap && (
          <p className="text-slate-400 text-xs mt-2">
            💡 Eller vänta till imorgon kl{' '}
            <span className="font-semibold" style={{ color: priceColor(tomorrowCheap.price) }}>
              {String(tomorrowCheap.hour).padStart(2, '0')}:00
            </span>{' '}
            då priset är{' '}
            <span className="font-semibold" style={{ color: priceColor(tomorrowCheap.price) }}>
              {tomorrowCheap.price.toFixed(1)} öre/kWh
            </span>.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Uppdaterad {lastSlotTime()} · Spotpris i {selectedArea}
      </p>
      <p className="text-xs text-slate-600">Alla priser som visas är timsnitt</p>
    </div>
  );
}
