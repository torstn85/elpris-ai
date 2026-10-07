'use client';

// Tunt skal runt QuarterPriceChart för stadssidor och guider (MDX: <PriceGraph />).
// Props-gränssnittet är bakåtkompatibelt så att MDX-filerna inte behöver ändras.

import { useCallback, useEffect, useRef, useState } from 'react';
import QuarterPriceChart from '@/components/prices/QuarterPriceChart';
import type { QuarterPoint } from '@/lib/prices/quarters';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  /** Används inte längre — kvartsdiagrammet har fast höjd. Kvar för bakåtkompatibilitet. */
  height?: number;
  caption?: string;
  /** Används inte längre (timdata). Kvar för bakåtkompatibilitet — använd initialQuarters. */
  initialData?: Array<{ hour: number; ore_per_kwh: number }> | null;
  /** Server-side seed: dagens kvartar för `area`, renderas i HTML före hydrering. */
  initialQuarters?: QuarterPoint[] | null;
  /** Ort, t.ex. "Göteborg" — ger underraden "Göteborg (SE3)". */
  placeLabel?: string;
}

const SWEDISH_DATE = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' });
const swedishToday = () => SWEDISH_DATE.format(new Date());
const swedishDateOf = (iso: string) => SWEDISH_DATE.format(new Date(iso));

export default function PriceGraph({
  area = 'SE3',
  caption,
  initialQuarters = null,
  placeLabel,
}: Props) {
  const seed = initialQuarters && initialQuarters.length > 0 ? initialQuarters : null;
  const [quarters, setQuarters] = useState<QuarterPoint[]>(seed ?? []);
  const [loading, setLoading] = useState(seed === null);

  const fetchQuarters = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/today');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setQuarters(json.quarters?.[area] ?? []);
    } catch {
      setQuarters([]);
    } finally {
      setLoading(false);
    }
  }, [area]);

  // Hämta bara om SSR-datat saknas eller gäller ett annat svenskt datum än idag.
  useEffect(() => {
    if (seed && swedishDateOf(seed[0].start) === swedishToday()) return;
    fetchQuarters();
    // seed ändras inte efter montering; area/fetchQuarters styr.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchQuarters]);

  // Midnattsbyte: hämta igen när svenskt datum ändras medan sidan är öppen.
  const day = useRef<string | null>(null);
  useEffect(() => {
    function check() {
      const today = swedishToday();
      if (day.current !== null && day.current !== today) fetchQuarters();
      day.current = today;
    }
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [fetchQuarters]);

  return (
    <div className="not-prose my-8">
      <QuarterPriceChart
        quarters={quarters}
        area={area}
        placeLabel={placeLabel}
        headingLevel="h3"
        loading={loading}
      />
      {caption && (
        <p className="mt-4 text-sm text-slate-400 italic border-l-2 border-cyan-500 pl-3">
          {caption}
        </p>
      )}
    </div>
  );
}
