"use client";

// Klientdelen av ActivitySavings: antal pass per vecka, områdesväljare med
// geo-förval (manuellt val vinner) och ny hämtning av dagens priser vid midnatt.

import { useEffect, useRef, useState } from "react";
import { fetchGeoArea } from "@/lib/geo/client";
import { decimal, kr2, krInt, ore1 } from "@/lib/format/ore";
import type { HourEntry } from "@/lib/prices/hourly";
import { dayWindow } from "@/lib/prices/todaySummary";
import { WINDOW_SPREAD_MEDIAN, WINDOW_SPREAD_PERIOD, type WindowHours } from "@/lib/prices/windowSpreadStats";

type Area = "SE1" | "SE2" | "SE3" | "SE4";
const AREAS: Area[] = ["SE1", "SE2", "SE3", "SE4"];
const MIN_PER_WEEK = 1;
const MAX_PER_WEEK = 21;
const TICK_MS = 60_000;
const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });

export default function ActivitySavingsView({
  activity,
  kwh,
  hours,
  defaultPerWeek,
  initial,
}: {
  activity: string;
  kwh: number;
  hours: WindowHours;
  defaultPerWeek: number;
  initial: { todayDate: string | null; today: Record<Area, HourEntry[]> | null };
}) {
  const [area, setArea] = useState<Area>("SE3");
  const [perWeek, setPerWeek] = useState(defaultPerWeek);
  const [data, setData] = useState(initial);
  const pickedManually = useRef(false);

  useEffect(() => {
    fetchGeoArea().then((geo) => {
      if (geo && !pickedManually.current) setArea(geo);
    });
  }, []);

  // Nytt svenskt datum → hämta dagens priser igen.
  useEffect(() => {
    const tick = async () => {
      if (data.todayDate === SWEDISH_DATE.format(new Date())) return;
      try {
        const res = await fetch("/api/prices/today");
        const j = res.ok ? await res.json() : null;
        if (j?.areas) setData({ todayDate: j.date, today: j.areas });
      } catch {
        // Nästa försök vid nästa tick.
      }
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [data.todayDate]);

  const median = WINDOW_SPREAD_MEDIAN[hours][area];
  const perPass = (kwh * median) / 100 * 1.25;
  const perYear = perPass * perWeek * 52;

  const todayHours = data.today?.[area] ?? [];
  const cheap = dayWindow(todayHours, hours, "cheapest");
  const dear = dayWindow(todayHours, hours, "dearest");
  const todaySpread = cheap && dear ? dear.avg - cheap.avg : null;
  const todayPerPass = todaySpread !== null ? (kwh * todaySpread) / 100 * 1.25 : null;

  const step = (d: number) => setPerWeek((v) => Math.min(MAX_PER_WEEK, Math.max(MIN_PER_WEEK, v + d)));

  // not-prose: guidernas typografistilar ska inte ändra komponentens rubrik och avstånd.
  return (
    <section className="not-prose my-8 rounded-2xl bg-[#0F3460] border border-[#1E4976] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="text-lg font-bold text-white">
          Vad sparar du på att {activity} billigt i {area}?
        </h3>
        <div className="flex gap-1" role="group" aria-label="Välj elområde">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={area === a}
              onClick={() => {
                pickedManually.current = true;
                setArea(a);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                area === a ? "bg-[#00E5FF] text-[#0A2540]" : "bg-[#0A2540] text-[#8fafc9] hover:text-white"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-[#8fafc9] mb-4">
        Om du flyttar passet från dygnets dyraste till billigaste fönster ({hours} timmar, {decimal(kwh)} kWh per pass)
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span id="pass-per-vecka" className="text-sm text-[#e2eaf4]">
          Pass per vecka
        </span>
        <div className="flex items-center gap-2" role="group" aria-labelledby="pass-per-vecka">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={perWeek <= MIN_PER_WEEK}
            aria-label="Färre pass"
            className="h-9 w-9 rounded-lg bg-[#0A2540] text-white font-bold disabled:opacity-40"
          >
            −
          </button>
          <output className="min-w-[2.5rem] text-center text-lg font-bold text-white tabular-nums" aria-live="polite">
            {perWeek}
          </output>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={perWeek >= MAX_PER_WEEK}
            aria-label="Fler pass"
            className="h-9 w-9 rounded-lg bg-[#0A2540] text-white font-bold disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#0A2540] px-4 py-3">
          <p className="text-xs text-[#8fafc9]">Per år</p>
          <p className="text-2xl font-extrabold text-[#22C55E] tabular-nums">≈ {krInt(perYear)} kr</p>
          <p className="mt-1 text-xs text-[#8fafc9]">
            {decimal(kwh)} kWh × {ore1(median)} öre × 1,25 × {perWeek} pass × 52 veckor
          </p>
        </div>
        <div className="rounded-xl bg-[#0A2540] px-4 py-3">
          <p className="text-xs text-[#8fafc9]">Idag, per pass</p>
          <p className="text-2xl font-extrabold text-white tabular-nums">
            {todayPerPass !== null ? `≈ ${kr2(todayPerPass)} kr` : "–"}
          </p>
          <p className="mt-1 text-xs text-[#8fafc9]">
            {todaySpread !== null
              ? `${decimal(kwh)} kWh × ${ore1(todaySpread)} öre (dagens skillnad) × 1,25`
              : "Dagens priser är inte tillgängliga just nu."}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-[#8fafc9]">
        Medianskillnad {WINDOW_SPREAD_PERIOD.label}, elpris.ai:s egen prisdata. Spotpris × 1,25 (moms), exkl.
        nätavgift och påslag. Kräver kvarts- eller timprisavtal.
      </p>
    </section>
  );
}
