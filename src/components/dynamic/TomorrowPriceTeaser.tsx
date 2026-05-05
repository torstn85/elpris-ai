'use client';

import { useEffect, useState } from 'react';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
}

interface HourEntry {
  hour: number;
  ore_per_kwh: number;
}

interface ViewState {
  tomorrowAvg: number | null;
  todayAvg: number | null;
  loading: boolean;
}

function priceColor(price: number): string {
  if (price < 50) return 'text-[#22C55E]';
  if (price < 100) return 'text-[#00E5FF]';
  return 'text-[#EF4444]';
}

function average(entries: HourEntry[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((s, e) => s + e.ore_per_kwh, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

export default function TomorrowPriceTeaser({ area = 'SE3' }: Props) {
  const [state, setState] = useState<ViewState>({
    tomorrowAvg: null,
    todayAvg: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [todayRes, tomorrowRes] = await Promise.all([
          fetch('/api/prices/today'),
          fetch('/api/prices/tomorrow'),
        ]);

        const todayJson = todayRes.ok ? await todayRes.json() : null;
        const tomorrowJson = tomorrowRes.ok ? await tomorrowRes.json() : null;

        if (cancelled) return;

        const todayHours: HourEntry[] = todayJson?.areas?.[area] ?? [];
        const todayAvg = todayHours.length > 0 ? average(todayHours) : null;

        const isUnavailable = tomorrowJson?.available === false;
        const tomorrowHours: HourEntry[] = isUnavailable
          ? []
          : tomorrowJson?.areas?.[area] ?? [];
        const tomorrowAvg = tomorrowHours.length > 0 ? average(tomorrowHours) : null;

        setState({ todayAvg, tomorrowAvg, loading: false });
      } catch {
        if (!cancelled) {
          setState({ todayAvg: null, tomorrowAvg: null, loading: false });
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [area]);

  if (state.loading) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976] animate-pulse">
        <div className="h-3 bg-[#1E4976] rounded w-1/4 mb-2" />
        <div className="h-5 bg-[#1E4976] rounded w-1/2 mb-4" />
        <div className="h-12 bg-[#1E4976] rounded w-1/3" />
      </div>
    );
  }

  if (state.tomorrowAvg === null) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Morgondagen
        </p>
        <h3 className="text-base font-bold text-white mt-1 mb-3">
          Imorgon i {area}
        </h3>
        <p className="text-sm text-slate-300">
          Morgondagens priser publiceras runt kl 13:15
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Kom tillbaka senare för planering
        </p>
      </div>
    );
  }

  const tomorrowAvg = state.tomorrowAvg;
  const todayAvg = state.todayAvg;

  let diffNode: React.ReactNode = null;
  if (todayAvg !== null && todayAvg > 0) {
    const pct = ((tomorrowAvg - todayAvg) / todayAvg) * 100;
    const absPct = Math.abs(pct);
    const rounded = Math.round(absPct);

    if (absPct < 2) {
      diffNode = (
        <span className="text-sm text-[#00E5FF] font-semibold">
          <span aria-hidden="true">−</span> Ungefär samma som idag
        </span>
      );
    } else if (pct > 0) {
      diffNode = (
        <span className="text-sm text-[#EF4444] font-semibold">
          <span aria-hidden="true">↑</span> {rounded}% högre än idag
        </span>
      );
    } else {
      diffNode = (
        <span className="text-sm text-[#22C55E] font-semibold">
          <span aria-hidden="true">↓</span> {rounded}% lägre än idag
        </span>
      );
    }
  }

  return (
    <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
        Morgondagen
      </p>
      <h3 className="text-base font-bold text-white mt-1 mb-4">
        Imorgon i {area}
      </h3>

      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={`text-5xl font-bold ${priceColor(tomorrowAvg)}`}
          aria-label="Snittpris för imorgon"
        >
          {tomorrowAvg.toFixed(1)}
        </span>
        <span className="text-base text-slate-400 font-medium">öre/kWh</span>
      </div>

      {diffNode}
    </div>
  );
}
