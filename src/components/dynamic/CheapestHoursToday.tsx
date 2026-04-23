'use client';

import { useEffect, useState } from 'react';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  count?: number;
  format?: 'compact' | 'detailed';
}

interface HourPrice {
  hour: number;
  price: number;
}

export default function CheapestHoursToday({
  area = 'SE3',
  count = 3,
  format = 'detailed',
}: Props) {
  const [hours, setHours] = useState<HourPrice[]>([]);
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

        // Faktiskt format: { areas: { SE3: [{ hour, time_start, ore_per_kwh }] } }
        const areaData: Array<{ hour: number; ore_per_kwh: number }> =
          json.areas?.[area] || [];
        const all: HourPrice[] = areaData.map((item) => ({
          hour: item.hour,
          price: item.ore_per_kwh,
        }));

        const sorted = [...all].sort((a, b) => a.price - b.price).slice(0, count);

        if (!cancelled) {
          setHours(sorted);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Kunde inte hämta dagens billigaste timmar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [area, count]);

  const formatHourRange = (hour: number): string => {
    const start = String(hour).padStart(2, '0');
    const end = String((hour + 1) % 24).padStart(2, '0');
    return `${start}:00–${end}:00`;
  };

  return (
    <div className="my-6 rounded-2xl bg-gradient-to-br from-green-950 to-slate-900 p-6 ring-1 ring-green-900">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🟢</span>
        <h3 className="text-base font-bold text-white">
          Dagens {count} billigaste timmar i {area}
        </h3>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/50 rounded-lg" />
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
              key={h.hour}
              className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="text-xs font-bold text-green-400 w-5">#{i + 1}</span>
                <span className="text-base font-semibold text-white">
                  {formatHourRange(h.hour)}
                </span>
              </span>
              <span className="text-lg font-bold text-green-400">
                {h.price.toFixed(1)} <span className="text-xs text-slate-400 font-normal">öre/kWh</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {format === 'detailed' && !loading && !error && (
        <p className="mt-4 text-xs text-slate-500">
          💡 Sätt på tvätt, diskmaskin eller ladda elbilen under dessa timmar för maximal besparing.
        </p>
      )}
    </div>
  );
}
