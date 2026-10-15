'use client';

import { useEffect, useState } from 'react';
import type { HourEntry } from '@/lib/prices/hourly';
import { ore1 } from '@/lib/format/ore';

/** Det komponenten behöver av en timme: unik start (nyckel), etikett och pris. */
type HourInput = Pick<HourEntry, 'startUTC' | 'label' | 'ore_per_kwh'>;

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  count?: number;
  /** Server-side seed: today's hourly entries for `area`, renders in HTML before hydration. */
  initialData?: HourInput[] | null;
}

interface HourPrice {
  key: string;
  label: string;
  price: number;
}

function mostExpensive(
  areaData: HourInput[],
  count: number,
): HourPrice[] {
  return areaData
    .map((item) => ({ key: item.startUTC, label: item.label, price: item.ore_per_kwh }))
    .sort((a, b) => b.price - a.price)
    .slice(0, count);
}

export default function MostExpensiveHoursToday({
  area = 'SE3',
  count = 3,
  initialData = null,
}: Props) {
  const seed =
    initialData && initialData.length > 0 ? mostExpensive(initialData, count) : [];
  const [hours, setHours] = useState<HourPrice[]>(seed);
  const [loading, setLoading] = useState(seed.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/prices/today');
        if (!res.ok) throw new Error('Fel');
        const json = await res.json();

        // Format: { areas: { SE3: [{ hour, startUTC, label, ore_per_kwh, … }] } }
        const areaData: HourInput[] =
          json.areas?.[area] || [];

        if (!cancelled) {
          setHours(mostExpensive(areaData, count));
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Kunde inte hämta dagens dyraste timmar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [area, count]);

  return (
    <div className="my-6 rounded-2xl bg-gradient-to-br from-red-950 to-slate-900 p-6 ring-1 ring-red-900">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔴</span>
        <h3 className="text-base font-bold text-white">
          Dagens {count} dyraste timmar i {area}
        </h3>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-12 bg-[#0A2540]/50 rounded-lg" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-amber-400 text-sm">{error}</p>
      )}

      {!loading && !error && hours.length > 0 && (
        <ul className="space-y-2">
          {hours.map((h, i) => (
            <li
              key={h.key}
              className="flex items-center justify-between bg-[#0A2540]/60 rounded-lg px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-400 w-5">#{i + 1}</span>
                <span className="text-base font-semibold text-white">
                  {h.label}
                </span>
              </span>
              <span className="text-lg font-bold text-red-400">
                {ore1(h.price)} <span className="text-xs text-slate-400 font-normal">öre/kWh</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && (
        <p className="mt-4 text-xs text-slate-500">
          ⚠️ Undvik energikrävande aktiviteter under dessa timmar — flytta gärna förbrukningen.
        </p>
      )}
    </div>
  );
}
