'use client';

import { useEffect, useState } from 'react';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  showAreaSelector?: boolean;
}

interface PriceData {
  price_ore_kwh: number;
  price_with_vat: number;
  time_start: string;
  area: Area;
}

export default function LivePriceWidget({
  area: initialArea = 'SE3',
  showAreaSelector = true,
}: Props) {
  const [area, setArea] = useState<Area>(initialArea);
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        setLoading(true);
        const res = await fetch('/api/prices/current');
        if (!res.ok) throw new Error('Kunde inte hämta priset');
        const json = await res.json();
        const price_ore_kwh: number = json[area];
        if (!cancelled) {
          setData({
            price_ore_kwh,
            price_with_vat: Math.round(price_ore_kwh * 1.25 * 10) / 10,
            time_start: json.slot_start,
            area,
          });
          setLastFetch(new Date());
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Pris kunde inte hämtas just nu');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [area]);

  const getPriceColor = (price: number): string => {
    if (price <= 50) return 'text-green-400';
    if (price < 100) return 'text-[#00E5FF]';
    return 'text-red-400';
  };

  const getPriceLabel = (price: number): string => {
    if (price <= 0) return '⚡ Negativt — du får betalt';
    if (price <= 50) return 'Billigt';
    if (price < 100) return 'Normalt';
    return 'Dyrt';
  };

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm',
    });

  return (
    <div className="my-8 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976] shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
            ⚡ Spotpris just nu
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Aktuellt 15-minuterspris i {area}
          </p>
        </div>

        {showAreaSelector && (
          <div className="flex gap-1">
            {(['SE1', 'SE2', 'SE3', 'SE4'] as Area[]).map((a) => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  area === a
                    ? 'bg-cyan-500 text-slate-900'
                    : 'bg-[#1E4976] text-[#8fafc9] hover:bg-[#1E4976]/80'
                }`}
                aria-label={`Välj elområde ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="animate-pulse">
          <div className="h-16 bg-[#1E4976] rounded w-2/3 mb-3" />
          <div className="h-4 bg-[#1E4976] rounded w-1/3" />
        </div>
      )}

      {error && !data && (
        <p className="text-amber-400 text-sm">{error}. Försök igen om en stund.</p>
      )}

      {data && (
        <>
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl font-bold ${getPriceColor(data.price_ore_kwh)}`}>
              {data.price_ore_kwh.toFixed(1)}
            </span>
            <span className="text-xl text-slate-400 font-medium">öre/kWh</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className={`font-semibold ${getPriceColor(data.price_ore_kwh)}`}>
              {getPriceLabel(data.price_ore_kwh)}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Inkl. moms: {data.price_with_vat.toFixed(1)} öre
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Spotpris exkl. nätavgift och skatt
            </span>
          </div>

          {lastFetch && (
            <p className="mt-3 text-xs text-slate-500">
              Uppdaterad {formatTime(lastFetch)} · Nästa uppdatering inom 5 min
            </p>
          )}
        </>
      )}
    </div>
  );
}
