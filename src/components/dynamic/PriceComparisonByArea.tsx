'use client';

import { useEffect, useState } from 'react';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  highlightArea?: Area;
}

interface AreaPrice {
  area: Area;
  city: string;
  price_ore_kwh: number;
}

const AREA_INFO: Record<Area, { city: string; description: string }> = {
  SE1: { city: 'Luleå', description: 'Norra Sverige' },
  SE2: { city: 'Sundsvall', description: 'Norra mellansverige' },
  SE3: { city: 'Stockholm', description: 'Södra mellansverige' },
  SE4: { city: 'Malmö', description: 'Södra Sverige' },
};

export default function PriceComparisonByArea({ highlightArea = 'SE3' }: Props) {
  const [prices, setPrices] = useState<AreaPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoading(true);
        const res = await fetch('/api/prices/all');
        if (!res.ok) throw new Error('Fel');
        const json = await res.json();
        const result: AreaPrice[] = (['SE1', 'SE2', 'SE3', 'SE4'] as Area[]).map((a) => ({
          area: a,
          city: AREA_INFO[a].city,
          price_ore_kwh: json[a]?.price_ore_kwh ?? 0,
        }));
        if (!cancelled) {
          setPrices(result);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Kunde inte jämföra elområden just nu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const getPriceColor = (price: number): string => {
    if (price < 0) return 'text-cyan-400';
    if (price <= 50) return 'text-green-400';
    if (price <= 100) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="my-8 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">
          Jämför just nu: alla fyra elområden
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Aktuellt 15-minuterspris (öre/kWh exkl. moms)
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#1E4976] rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-amber-400 text-sm">{error}</p>
      )}

      {!loading && !error && prices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {prices.map((p) => {
            const isHighlight = p.area === highlightArea;
            return (
              <div
                key={p.area}
                className={`rounded-xl p-4 transition ${
                  isHighlight
                    ? 'bg-cyan-950/50 ring-2 ring-cyan-500'
                    : 'bg-[#1E4976]/50 ring-1 ring-[#1E4976]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isHighlight ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {p.area}
                  </span>
                  {isHighlight && (
                    <span className="text-[10px] text-cyan-400 font-medium">DITT OMRÅDE</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">{p.city}</p>
                <p className={`text-2xl font-bold ${getPriceColor(p.price_ore_kwh)}`}>
                  {p.price_ore_kwh.toFixed(1)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">öre/kWh</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-slate-500">
        💡 Stora skillnader mellan områden beror på flaskhalsar i stamnätet och var elen produceras.
      </p>
    </div>
  );
}
