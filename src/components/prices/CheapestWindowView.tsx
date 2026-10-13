"use client";

// Klientdelen av CheapestWindowToday: områdesväljare (geo-förval, manuellt val
// vinner), klocka för "har redan varit"/"pågår nu", och hämtning av nya priser
// vid midnatt och när morgondagens priser publiceras (~13:15). Första
// renderingen använder serverns data och tid, så HTML och hydrering stämmer.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGeoArea } from "@/lib/geo/client";
import { decimal, kr2, ore1 } from "@/lib/format/ore";
import { formatSwedishDay } from "@/lib/format/date";
import type { HourEntry } from "@/lib/prices/hourly";
import { PRICE_LEVEL_COLORS, priceLevel } from "@/lib/prices/priceLevel";
import { cheapestWindow, dayWindow, type DayWindow } from "@/lib/prices/todaySummary";

type Area = "SE1" | "SE2" | "SE3" | "SE4";
const AREAS: Area[] = ["SE1", "SE2", "SE3", "SE4"];

export interface WindowData {
  /** Svenskt datum för dagens priser (YYYY-MM-DD). */
  todayDate: string | null;
  today: Record<Area, HourEntry[]> | null;
  tomorrowDate: string | null;
  tomorrow: Record<Area, HourEntry[]> | null;
}

const TICK_MS = 30_000;
const TOMORROW_POLL_MS = 60_000;
const PUBLISH_POLL_FROM_MIN = 13 * 60 + 10;

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const STOCKHOLM_HM = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", hour12: false });
const stockholmMinutes = (ms: number) => {
  const [h, m] = STOCKHOLM_HM.format(new Date(ms)).split(":").map(Number);
  return (h % 24) * 60 + m;
};
const dayLabel = (iso: string) => {
  const d = formatSwedishDay(new Date(`${iso}T12:00:00Z`));
  return d.charAt(0).toLowerCase() + d.slice(1);
};

function Price({ avg }: { avg: number }) {
  return (
    <span className="font-bold tabular-nums whitespace-nowrap" style={{ color: PRICE_LEVEL_COLORS[priceLevel(avg)] }}>
      {ore1(avg)} öre/kWh
    </span>
  );
}

function Row({ label, w, badge }: { label: string; w: { start: string; end: string; avg: number }; badge?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 border-b border-[#1E4976]/60 last:border-0">
      <span className="text-[#8fafc9]">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold text-white tabular-nums whitespace-nowrap">
          {w.start}–{w.end}
        </span>
        <Price avg={w.avg} />
        {badge && <span className="text-xs text-[#8fafc9] whitespace-nowrap">({badge})</span>}
      </span>
    </div>
  );
}

function status(w: DayWindow, now: number): string | undefined {
  if (Date.parse(w.endUTC) <= now) return "har redan varit";
  if (Date.parse(w.startUTC) <= now) return "pågår nu";
  return undefined;
}

export default function CheapestWindowView({
  hours: size,
  kwh,
  activity,
  initial,
  serverNow,
}: {
  hours: number;
  /** null = okänd förbrukning: ingen kWh-uppgift och ingen besparingsrad. */
  kwh: number | null;
  activity: string;
  initial: WindowData;
  serverNow: number;
}) {
  const [area, setArea] = useState<Area>("SE3");
  const [data, setData] = useState<WindowData>(initial);
  const [now, setNow] = useState(serverNow);
  const pickedManually = useRef(false);
  const lastTomorrowFetch = useRef(0);

  useEffect(() => {
    fetchGeoArea().then((geo) => {
      if (geo && !pickedManually.current) setArea(geo);
    });
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([fetch("/api/prices/today"), fetch("/api/prices/tomorrow")]);
      const tj = t.ok ? await t.json() : null;
      const mj = m.ok ? await m.json() : null;
      setData({
        todayDate: tj?.date ?? null,
        today: tj?.areas ?? null,
        tomorrowDate: mj?.available === false ? null : mj?.date ?? null,
        tomorrow: mj?.available === false ? null : mj?.areas ?? null,
      });
    } catch {
      // Behåll det vi har; nästa försök vid nästa tick.
    }
  }, []);

  const fetchTomorrow = useCallback(async () => {
    lastTomorrowFetch.current = Date.now();
    try {
      const m = await fetch("/api/prices/tomorrow");
      const mj = m.ok ? await m.json() : null;
      if (mj && mj.available !== false && mj.areas) {
        setData((d) => ({ ...d, tomorrowDate: mj.date, tomorrow: mj.areas }));
      }
    } catch {
      // Nästa försök om en minut.
    }
  }, []);

  // Klocka var 30:e sekund: nytt svenskt datum → hämta allt igen; efter 13:10
  // utan morgondagens priser → fråga en gång per minut.
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (data.todayDate !== SWEDISH_DATE.format(new Date(t))) fetchToday();
      else if (!data.tomorrow && stockholmMinutes(t) >= PUBLISH_POLL_FROM_MIN && t - lastTomorrowFetch.current >= TOMORROW_POLL_MS) fetchTomorrow();
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [data.todayDate, data.tomorrow, fetchToday, fetchTomorrow]);

  const hours = data.today?.[area] ?? [];
  const cheap = dayWindow(hours, size, "cheapest");
  const dear = dayWindow(hours, size, "dearest");
  const cheapStatus = cheap ? status(cheap, now) : undefined;
  const rest = cheap && cheapStatus === "har redan varit" ? cheapestWindow(hours, now, size) : null;
  const tomorrowHours = data.tomorrow?.[area] ?? [];
  const tomorrowCheap = dayWindow(tomorrowHours, size, "cheapest");
  const saving = cheap && dear && kwh !== null ? (kwh * (dear.avg - cheap.avg)) / 100 * 1.25 : null;

  return (
    <section className="my-8 rounded-2xl bg-[#0F3460] border border-[#1E4976] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="text-lg font-bold text-white">
          Billigast att {activity} idag i {area}
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
      <p className="text-sm text-[#8fafc9] mb-3">
        {size} timmar i följd{kwh !== null ? ` · ${decimal(kwh)} kWh per pass` : ""}
        {data.todayDate ? ` · ${dayLabel(data.todayDate)}` : ""}
      </p>

      {!cheap || !dear ? (
        <p className="text-sm text-[#8fafc9]">Dagens priser är inte tillgängliga just nu.</p>
      ) : (
        <>
          <div className="text-sm">
            <Row label="Billigaste fönstret" w={cheap} badge={cheapStatus} />
            {rest && <Row label={rest.restOfDay ? "Resten av dagen" : "Billigast resten av dagen"} w={rest} />}
            <Row label="Dyraste fönstret" w={dear} badge={status(dear, now)} />
            {tomorrowCheap && data.tomorrowDate ? (
              <Row label={`Imorgon (${dayLabel(data.tomorrowDate)})`} w={tomorrowCheap} />
            ) : null}
          </div>
          {saving !== null && (
            <p className="mt-4 text-base text-white">
              Att {activity} i det billigaste fönstret i stället för det dyraste sparar ≈ <strong>{kr2(saving)} kr</strong>
            </p>
          )}
          <p className="mt-1 text-xs text-[#8fafc9]">
            Spotpris × 1,25 (moms), exkl. nätavgift och elhandlarens påslag. Kräver kvarts- eller timprisavtal.
          </p>
          {!tomorrowCheap && <p className="mt-2 text-xs text-[#8fafc9]">Morgondagens priser publiceras runt kl 13:15.</p>}
        </>
      )}
    </section>
  );
}
