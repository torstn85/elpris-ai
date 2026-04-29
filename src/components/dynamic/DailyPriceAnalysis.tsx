'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area: Area;
}

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
}

interface Analysis {
  avg: number;
  cheap: HourEntry;
  expensive: HourEntry;
  level: 'lågt' | 'normalt' | 'högt';
  curveDesc: string;
}

function fmt(h: number): string {
  const start = String(h).padStart(2, '0');
  const end = String((h + 1) % 24).padStart(2, '0');
  return `${start}–${end}`;
}

function analyze(hours: HourEntry[]): Analysis | null {
  if (hours.length === 0) return null;

  const avg =
    Math.round((hours.reduce((s, h) => s + h.ore_per_kwh, 0) / hours.length) * 10) / 10;
  const cheap = hours.reduce((min, h) => (h.ore_per_kwh < min.ore_per_kwh ? h : min));
  const expensive = hours.reduce((max, h) => (h.ore_per_kwh > max.ore_per_kwh ? h : max));

  const level: Analysis['level'] = avg < 50 ? 'lågt' : avg < 100 ? 'normalt' : 'högt';

  // Check top 4 most expensive hours for dual-peak pattern
  const top4 = [...hours].sort((a, b) => b.ore_per_kwh - a.ore_per_kwh).slice(0, 4);
  const hasMorning = top4.some((h) => h.hour >= 6 && h.hour <= 9);
  const hasEvening = top4.some((h) => h.hour >= 17 && h.hour <= 21);

  let curveDesc: string;
  if (hasMorning && hasEvening) {
    curveDesc = 'Det är en typisk dygnskurva med pristoppar morgon och kväll.';
  } else if (expensive.hour >= 6 && expensive.hour <= 9) {
    curveDesc = 'Det är en typisk morgonpik.';
  } else if (expensive.hour >= 17 && expensive.hour <= 21) {
    curveDesc = 'Det är en typisk kvällspik.';
  } else {
    curveDesc = 'Prismönstret avviker från det vanliga idag.';
  }

  return { avg, cheap, expensive, level, curveDesc };
}

export default function DailyPriceAnalysis({ area }: Props) {
  const [result, setResult] = useState<Analysis | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch('/api/prices/today');
        if (!res.ok) return;
        const json = await res.json();
        const areaData: Array<{ hour: number; ore_per_kwh: number }> =
          json.areas?.[area] || [];
        const hours: HourEntry[] = areaData.map((item) => ({
          hour: item.hour,
          ore_per_kwh: item.ore_per_kwh,
        }));
        if (!cancelled) setResult(analyze(hours));
      } catch {
        // Dölj sektionen tyst vid fel
      }
    }

    fetchData();
    const id = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [area]);

  if (!result) return null;

  const { avg, cheap, expensive, level, curveDesc } = result;

  return (
    <section className="py-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
          Vad betyder dagens prismönster?
        </h2>
        <p className="text-base text-[#8fafc9] leading-relaxed">
          Idag är dygnssnittet{' '}
          <strong className="text-white">{avg.toFixed(1)} öre/kWh</strong> i{' '}
          {area}, vilket är{' '}
          <strong className="text-white">{level}</strong> för säsongen.
          Billigaste timmen är{' '}
          <strong className="text-white">kl {fmt(cheap.hour)}</strong>{' '}
          ({cheap.ore_per_kwh.toFixed(1)} öre), dyraste är{' '}
          <strong className="text-white">kl {fmt(expensive.hour)}</strong>{' '}
          ({expensive.ore_per_kwh.toFixed(1)} öre). {curveDesc}
        </p>

        <p className="mt-6 text-sm text-[#8fafc9]">
          Läs mer:{' '}
          <Link
            href="/guider/spara-el/tvatta-billigt"
            className="text-[#00E5FF] hover:underline transition-colors duration-150"
          >
            Tvätta billigt
          </Link>
          <span className="mx-2">·</span>
          <Link
            href="/guider/spara-el/ladda-elbil-billigt"
            className="text-[#00E5FF] hover:underline transition-colors duration-150"
          >
            Ladda elbil billigt
          </Link>
          <span className="mx-2">·</span>
          <Link
            href="/guider/forsta-elpriset/dygnsmonster-elpris"
            className="text-[#00E5FF] hover:underline transition-colors duration-150"
          >
            Dygnsmönster i elpriset
          </Link>
        </p>
      </div>
    </section>
  );
}
