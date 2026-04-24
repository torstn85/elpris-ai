'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
}

interface DayData {
  date: string;       // "YYYY-MM-DD"
  label: string;      // "17/4"
  price: number;      // öre/kWh
}

function barColor(price: number): string {
  if (price <= 50) return '#22C55E';
  if (price < 100) return '#00E5FF';
  return '#EF4444';
}

function formatDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${parseInt(day)}/${parseInt(month)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload || !payload[0]) return null;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 ring-1 ring-slate-700 shadow-xl">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-bold text-white">
        {payload[0].value.toFixed(1)}{' '}
        <span className="text-slate-400 font-normal">öre/kWh</span>
      </p>
    </div>
  );
};

export default function SevenDayPriceTrend({ area = 'SE3' }: Props) {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/prices/history?area=${area}`);
        if (!res.ok) throw new Error('Fel');
        const json = await res.json();

        const parsed: DayData[] = (json.days ?? [])
          .filter((d: { areas: Record<string, number> }) => d.areas?.[area] != null)
          .map((d: { date: string; areas: Record<string, number> }) => ({
            date: d.date,
            label: formatDate(d.date),
            price: d.areas[area],
          }));

        if (!cancelled) {
          setDays(parsed);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Kunde inte hämta prishistorik');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [area]);

  if (loading) {
    return (
      <div className="my-6 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-[180px] bg-slate-800 rounded" />
      </div>
    );
  }

  if (error || days.length === 0) {
    return (
      <div className="my-6 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <p className="text-amber-400 text-sm">{error ?? 'Ingen historik tillgänglig ännu.'}</p>
      </div>
    );
  }

  // Trend: compare first vs last day
  const first = days[0].price;
  const last = days[days.length - 1].price;
  const pct = ((last - first) / first) * 100;
  const weekAvg =
    Math.round((days.reduce((s, d) => s + d.price, 0) / days.length) * 10) / 10;

  let trendLabel: string;
  let trendColor: string;
  if (Math.abs(pct) <= 3) {
    trendLabel = '→ Priset är stabilt den senaste veckan';
    trendColor = 'text-slate-300';
  } else if (pct > 0) {
    trendLabel = `↑ ${Math.abs(pct).toFixed(0)}% högre än för en vecka sedan`;
    trendColor = 'text-red-400';
  } else {
    trendLabel = `↓ ${Math.abs(pct).toFixed(0)}% lägre än för en vecka sedan`;
    trendColor = 'text-green-400';
  }

  return (
    <div className="my-6 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-6 ring-1 ring-blue-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
              Pristrend
            </p>
            <h3 className="text-base font-bold text-white">
              Senaste 7 dagarna i {area}
            </h3>
          </div>
        </div>
        <span className={`text-sm font-semibold ${trendColor}`}>
          {trendLabel}
        </span>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={days} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {days.map((d, i) => (
              <Cell key={i} fill={barColor(d.price)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Weekly average */}
      <p className="mt-3 text-xs text-slate-400 text-right">
        Veckans snitt:{' '}
        <span className="font-semibold text-white">{weekAvg} öre/kWh</span>
      </p>
    </div>
  );
}
