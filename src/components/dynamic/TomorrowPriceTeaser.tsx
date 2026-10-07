'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchGeoArea } from '@/lib/geo/client';

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

export default function TomorrowPriceTeaser({ area }: Props) {
  const [selectedArea, setSelectedArea] = useState<Area>(area ?? 'SE3');
  const [state, setState] = useState<ViewState>({
    tomorrowAvg: null,
    todayAvg: null,
    loading: true,
  });

  // Förval via /api/geo (Vercels geo-headers) — bara när ingen area-prop är satt.
  // Ett manuellt val har alltid företräde, även om svaret kommer senare.
  const pickedManually = useRef(false);
  useEffect(() => {
    if (area !== undefined) return;
    fetchGeoArea().then((detected) => {
      if (detected && !pickedManually.current) setSelectedArea(detected);
    });
  }, [area]);

  // Fetch data when selectedArea changes (manual click eller auto-detect-uppdatering)
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    async function fetchData() {
      try {
        const [todayRes, tomorrowRes] = await Promise.all([
          fetch('/api/prices/today'),
          fetch('/api/prices/tomorrow'),
        ]);

        const todayJson = todayRes.ok ? await todayRes.json() : null;
        const tomorrowJson = tomorrowRes.ok ? await tomorrowRes.json() : null;

        if (cancelled) return;

        const todayHours: HourEntry[] = todayJson?.areas?.[selectedArea] ?? [];
        const todayAvg = todayHours.length > 0 ? average(todayHours) : null;

        const isUnavailable = tomorrowJson?.available === false;
        const tomorrowHours: HourEntry[] = isUnavailable
          ? []
          : tomorrowJson?.areas?.[selectedArea] ?? [];
        const tomorrowAvg =
          tomorrowHours.length > 0 ? average(tomorrowHours) : null;

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
  }, [selectedArea]);

  const areaButtons = (
    <div className="flex gap-1" role="group" aria-label="Välj elområde">
      {(['SE1', 'SE2', 'SE3', 'SE4'] as const).map((a) => (
        <button
          key={a}
          onClick={() => {
            pickedManually.current = true;
            setSelectedArea(a);
          }}
          aria-pressed={selectedArea === a}
          aria-label={`Välj elområde ${a}`}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F3460] ${
            selectedArea === a
              ? 'bg-[#00E5FF] text-[#0A2540] shadow-lg shadow-[#00E5FF]/20'
              : 'bg-[#1E4976] text-[#8fafc9] hover:text-white'
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );

  const header = (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Morgondagen
        </p>
        <h3 className="text-base font-bold text-white mt-1">
          Imorgon i {selectedArea}
        </h3>
      </div>
      {areaButtons}
    </div>
  );

  if (state.loading) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        {header}
        <div className="animate-pulse">
          <div className="h-12 bg-[#1E4976] rounded w-1/3 mb-2" />
          <div className="h-4 bg-[#1E4976] rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (state.tomorrowAvg === null) {
    return (
      <div className="my-6 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976]">
        {header}
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
      {header}

      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={`text-5xl font-bold ${priceColor(tomorrowAvg)}`}
          aria-label="Snittpris för imorgon"
        >
          {tomorrowAvg.toFixed(1)}
        </span>
        <span className="text-base text-slate-400 font-medium">
          öre/kWh i snitt
        </span>
      </div>

      {diffNode}
    </div>
  );
}
