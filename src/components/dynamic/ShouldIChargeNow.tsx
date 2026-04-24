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
  if (cheapest6.has(currentHour)) {
    decision = 'JA';
  } else if (mostExpensive6.has(currentHour)) {
    decision = 'VÄNTA';
  } else {
    decision = 'OK';
  }

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

export default function ShouldIChargeNow({ area = 'SE3' }: Props) {
  const [result, setResult] = useState<ChargeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/prices/today');
        if (!res.ok) throw new Error('Fel');
        const json = await res.json();

        const areaData: Array<{ hour: number; ore_per_kwh: number }> =
          json.areas?.[area] || [];
        const hours: HourPrice[] = areaData.map((item) => ({
          hour: item.hour,
          price: item.ore_per_kwh,
        }));

        if (!cancelled) {
          setResult(analyze(hours));
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Kunde inte hämta prisdata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [area]);

  if (loading) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976] animate-pulse">
        <div className="h-8 bg-[#1E4976] rounded w-1/3 mb-3" />
        <div className="h-12 bg-[#1E4976] rounded w-1/2 mb-3" />
        <div className="h-4 bg-[#1E4976] rounded w-2/3" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        <p className="text-amber-400 text-sm">{error ?? 'Ingen prisdata tillgänglig.'}</p>
      </div>
    );
  }

  const cfg = CONFIG[result.decision];
  const hoursUntilCheap =
    result.nextCheapHour !== null
      ? result.nextCheapHour.hour - getCurrentStockholmHour()
      : null;

  return (
    <div className={`my-6 rounded-2xl bg-gradient-to-br ${cfg.gradient} p-6 ring-1 ${cfg.ring}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{cfg.emoji}</span>
        <div>
          <p className={`text-xs uppercase tracking-wider font-semibold ${cfg.accent}`}>
            Ska jag ladda nu?
          </p>
          <h3 className="text-xl font-bold text-white">{cfg.label}</h3>
        </div>
      </div>

      {/* Current price — färg följer prisregler, inte tillstånd */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-5xl font-bold" style={{ color: priceColor(result.currentPrice) }}>
          {result.currentPrice.toFixed(1)}
        </span>
        <span className="text-slate-400 text-sm">öre/kWh just nu i {area}</span>
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
                <span className="font-semibold text-[#00E5FF]">
                  {hoursUntilCheap} {hoursUntilCheap === 1 ? 'timme' : 'timmar'}
                </span>{' '}
                — kl {String(result.nextCheapHour.hour).padStart(2, '0')}:00 sjunker
                priset till{' '}
                <span className="font-semibold" style={{ color: priceColor(result.nextCheapHour.price) }}>
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
            Priset är okej just nu. Det blir billigare
            kl{' '}
            <span className="font-semibold text-[#00E5FF]">
              {String(result.nextCheapHour.hour).padStart(2, '0')}:00
            </span>{' '}
            (
            <span className="font-semibold" style={{ color: priceColor(result.nextCheapHour.price) }}>
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
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Uppdaterad {lastSlotTime()} · Spotpris i {area}
      </p>
    </div>
  );
}
