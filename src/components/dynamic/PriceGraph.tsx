'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  height?: number;
  caption?: string;
}

interface HourPrice {
  hour: number;
  hourLabel: string;
  price: number;
}

export default function PriceGraph({
  area = 'SE3',
  height = 280,
  caption,
}: Props) {
  const [data, setData] = useState<HourPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ avg: number; min: number; max: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      try {
        setLoading(true);
        const res = await fetch('/api/prices/today');
        if (!res.ok) throw new Error('Kunde inte hämta priser');
        const json = await res.json();

        // Faktiskt format: { areas: { SE3: [{ hour, time_start, ore_per_kwh }] } }
        const areaData: Array<{ hour: number; ore_per_kwh: number }> =
          json.areas?.[area] || [];
        const hourly: HourPrice[] = areaData.map((item) => ({
          hour: item.hour,
          hourLabel: String(item.hour).padStart(2, '0'),
          price: item.ore_per_kwh,
        }));

        if (!cancelled) {
          setData(hourly);
          if (hourly.length > 0) {
            const prices = hourly.map((h) => h.price);
            setStats({
              avg: prices.reduce((s, p) => s + p, 0) / prices.length,
              min: Math.min(...prices),
              max: Math.max(...prices),
            });
          }
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Prisdata kunde inte laddas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrices();
    return () => { cancelled = true; };
  }, [area]);

  const getBarColor = (price: number): string => {
    if (price < 0) return '#22d3ee';
    if (price <= 50) return '#22c55e';
    if (price <= 100) return '#f59e0b';
    return '#ef4444';
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload || !payload[0]) return null;
    const value = payload[0].value;
    return (
      <div className="rounded-lg bg-slate-900 px-3 py-2 ring-1 ring-slate-700 shadow-xl">
        <p className="text-xs text-slate-400">{label}:00–{label}:59</p>
        <p className="text-sm font-bold text-white">
          {value.toFixed(1)} <span className="text-slate-400 font-normal">öre/kWh</span>
        </p>
      </div>
    );
  };

  return (
    <div className="my-8 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">
            Dagens timpriser i {area}
          </h3>
          {stats && (
            <p className="text-xs text-slate-400 mt-1">
              Snitt: {stats.avg.toFixed(1)} öre · Min: {stats.min.toFixed(1)} · Max: {stats.max.toFixed(1)} öre/kWh
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-slate-500 text-sm">Hämtar prisdata...</div>
        </div>
      )}

      {error && !loading && (
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-amber-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="hourLabel"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
            <Bar dataKey="price" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.price)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-cyan-400" />
          <span className="text-slate-400">Negativt</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span className="text-slate-400">Billigt (≤50)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-slate-400">Normalt (51–100)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span className="text-slate-400">Dyrt (&gt;100)</span>
        </span>
      </div>

      {caption && (
        <p className="mt-4 text-sm text-slate-400 italic border-l-2 border-cyan-500 pl-3">
          {caption}
        </p>
      )}
    </div>
  );
}
