'use client';

import { useEffect, useState } from 'react';
import { ore1 } from '@/lib/format/ore';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area: Area;
}

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
  /** "14:00–15:00" eller "02:00–03:00 (sommartid)" från /api/prices/today. */
  label: string;
}

interface Analysis {
  avg: number;
  cheap: HourEntry;
  expensive: HourEntry;
  level: 'lågt' | 'normalt' | 'högt';
  levelColor: string;
  curveDesc: string;
}

/** Kort form av timmens etikett: "14–15", "02–03 (sommartid)". */
function fmt(h: HourEntry): string {
  return h.label.replace(/:00/g, '');
}

function priceColor(price: number): string {
  if (price < 50) return '#22C55E';
  if (price < 100) return '#00E5FF';
  return '#EF4444';
}

function analyze(hours: HourEntry[]): Analysis | null {
  if (hours.length === 0) return null;

  const avg =
    Math.round((hours.reduce((s, h) => s + h.ore_per_kwh, 0) / hours.length) * 10) / 10;
  const cheap = hours.reduce((min, h) => (h.ore_per_kwh < min.ore_per_kwh ? h : min));
  const expensive = hours.reduce((max, h) => (h.ore_per_kwh > max.ore_per_kwh ? h : max));

  let level: Analysis['level'];
  let levelColor: string;
  if (avg < 50) {
    level = 'lågt';
    levelColor = '#22C55E';
  } else if (avg < 100) {
    level = 'normalt';
    levelColor = '#00E5FF';
  } else {
    level = 'högt';
    levelColor = '#EF4444';
  }

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

  return { avg, cheap, expensive, level, levelColor, curveDesc };
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
        const areaData: HourEntry[] = json.areas?.[area] || [];
        const hours: HourEntry[] = areaData.map((item) => ({
          hour: item.hour,
          ore_per_kwh: item.ore_per_kwh,
          label: item.label,
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

  const { avg, cheap, expensive, level, levelColor, curveDesc } = result;
  const avgColor = priceColor(avg);

  return (
    <section className="py-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-bold text-2xl md:text-3xl text-white mb-6">
          Vad betyder dagens prismönster?
        </h2>
        <p className="text-base text-[#8fafc9] leading-relaxed">
          Idag är dygnssnittet{' '}
          <strong style={{ color: avgColor }}>{ore1(avg)} öre/kWh</strong> i{' '}
          {area}, vilket är{' '}
          <strong style={{ color: levelColor }}>{level}</strong> för säsongen.
          Billigaste timmen är{' '}
          <strong className="text-[#22C55E]">kl {fmt(cheap)}</strong>{' '}
          (<span className="text-[#22C55E]">{ore1(cheap.ore_per_kwh)} öre</span>),
          dyraste är{' '}
          <strong className="text-[#EF4444]">kl {fmt(expensive)}</strong>{' '}
          (<span className="text-[#EF4444]">{ore1(expensive.ore_per_kwh)} öre</span>).
          {' '}{curveDesc}
        </p>
      </div>
    </section>
  );
}
