'use client';

import { useEffect, useState } from 'react';

type CalcType = 'tvatt' | 'elbil' | 'varmepump';
type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  type?: CalcType;
  area?: Area;
}

interface PriceStats {
  avgCheap: number;
  avgExpensive: number;
}

const TYPE_CONFIG = {
  tvatt: {
    emoji: '🧺',
    label: 'Tvätt',
    inputLabel: 'Antal tvättar per vecka',
    inputUnit: 'tvättar/vecka',
    defaultValue: 4,
    min: 1,
    max: 20,
    step: 1,
    note: '1 kWh per tvätt × 52 veckor',
    toYearlyKwh: (v: number) => v * 1.0 * 52,
  },
  elbil: {
    emoji: '🚗',
    label: 'Elbil',
    inputLabel: 'Kilometer per år',
    inputUnit: 'km/år',
    defaultValue: 15000,
    min: 1000,
    max: 100000,
    step: 1000,
    note: '0,18 kWh per km (snittförbrukning)',
    toYearlyKwh: (v: number) => v * 0.18,
  },
  varmepump: {
    emoji: '🌡️',
    label: 'Värmepump',
    inputLabel: 'Årlig elförbrukning (kWh)',
    inputUnit: 'kWh/år',
    defaultValue: 15000,
    min: 1000,
    max: 80000,
    step: 500,
    note: '40% antas kunna styras till billiga timmar',
    toYearlyKwh: (v: number) => v * 0.4,
  },
} as const;

function formatKr(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function calcStats(hours: Array<{ hour: number; ore_per_kwh: number }>): PriceStats | null {
  if (hours.length < 6) return null;
  const sorted = [...hours].sort((a, b) => a.ore_per_kwh - b.ore_per_kwh);
  const cheapest6 = sorted.slice(0, 6);
  const expensive6 = sorted.slice(-6);
  const avg = (arr: typeof cheapest6) =>
    arr.reduce((s, h) => s + h.ore_per_kwh, 0) / arr.length;
  return { avgCheap: avg(cheapest6), avgExpensive: avg(expensive6) };
}

export default function SavingsCalculator({ type = 'tvatt', area = 'SE3' }: Props) {
  const cfg = TYPE_CONFIG[type];
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>(String(cfg.defaultValue));

  // Reset text when type prop changes
  useEffect(() => {
    setInputText(String(cfg.defaultValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

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
        if (!cancelled) {
          setStats(calcStats(areaData));
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
        <div className="h-6 bg-[#1E4976] rounded w-1/3 mb-4" />
        <div className="h-10 bg-[#1E4976] rounded w-full mb-4" />
        <div className="h-20 bg-[#1E4976] rounded w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        <p className="text-amber-400 text-sm">{error ?? 'Ingen prisdata tillgänglig.'}</p>
      </div>
    );
  }

  // Clamp to valid range for use in calculation — rawValue may be mid-edit
  const rawValue = parseInt(inputText, 10);
  const inputValue = isNaN(rawValue)
    ? cfg.defaultValue
    : Math.min(cfg.max, Math.max(cfg.min, rawValue));

  const yearlyKwh = cfg.toYearlyKwh(inputValue);
  const costExpensive = (yearlyKwh * stats.avgExpensive) / 100;
  const costCheap = (yearlyKwh * stats.avgCheap) / 100;
  const savings = costExpensive - costCheap;

  return (
    <div className="my-6 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-6 ring-1 ring-blue-900">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">{cfg.emoji}</span>
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
            Besparingskalkyl
          </p>
          <h3 className="text-base font-bold text-white">{cfg.label} — hur mycket kan du spara?</h3>
        </div>
      </div>

      {/* Input */}
      <div className="mb-5">
        <label className="block text-sm text-slate-300 mb-1.5">
          {cfg.inputLabel}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={() => {
              const v = parseInt(inputText, 10);
              if (isNaN(v) || v < cfg.min) setInputText(String(cfg.min));
              else if (v > cfg.max) setInputText(String(cfg.max));
              else setInputText(String(v));
            }}
            className="w-36 bg-[#0F3460] border border-[#1E4976] focus:border-[#00E5FF]/60 outline-none rounded-lg px-3 py-2 text-white text-base transition-colors"
          />
          <span className="text-slate-400 text-sm">{cfg.inputUnit}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{cfg.note}</p>
      </div>

      {/* Result */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0A2540]/80 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">På dyra timmar</p>
          <p className="text-xl font-bold text-red-400">{formatKr(costExpensive)} kr</p>
          <p className="text-xs text-slate-500 mt-0.5">({stats.avgExpensive.toFixed(0)} öre/kWh snitt)</p>
        </div>
        <div className="bg-[#0A2540]/80 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">På billiga timmar</p>
          <p className="text-xl font-bold text-green-400">{formatKr(costCheap)} kr</p>
          <p className="text-xs text-slate-500 mt-0.5">({stats.avgCheap.toFixed(0)} öre/kWh snitt)</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 ring-1 ring-[#22C55E]/30">
          <p className="text-xs text-slate-400 mb-1">Din besparing</p>
          <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>
            {formatKr(savings)} kr
          </p>
          <p className="text-xs text-slate-500 mt-0.5">per år</p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Baserat på dagens prisspridning i {area}. Årssnitt kan avvika.
      </p>
    </div>
  );
}
