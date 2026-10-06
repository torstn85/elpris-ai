// Kvartspriser för ett svenskt kalenderdygn, per elområde.
//
// Tidszonsfallgropen: filtrera alltid på exakt svenskt datum (Europe/Stockholm)
// och indexera på lokal klocktid — aldrig på UTC eller på "minuter sedan midnatt".
// Dygnen med sommar-/vintertidsomställning har 92 resp. 100 kvartar, och 02:xx
// finns två gånger i oktober. Vi behåller därför listan i tidsordning och söker
// fram startkvarten via lokal timme.

import { supabase } from "@/lib/supabase";
import { stockholmDayUTCRange } from "@/lib/time";

export const AREAS = ["SE1", "SE2", "SE3", "SE4"] as const;
export type Area = (typeof AREAS)[number];

export interface Quarter {
  /** Starttid i UTC (ISO). */
  startUTC: string;
  /** Lokal timme 0–23 i Europe/Stockholm. */
  hour: number;
  /** Lokal minut 0, 15, 30 eller 45. */
  minute: number;
  /** Spotpris, öre/kWh exkl. moms. */
  ore: number;
}

export type DayPrices = Record<Area, Quarter[]>;

const TZ = "Europe/Stockholm";

function localParts(iso: string): {
  date: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

function toQuarters(
  isoDate: string,
  rows: { start: string; ore: number }[],
): Quarter[] {
  return rows
    .map((r) => ({
      ...localParts(r.start),
      startUTC: new Date(r.start).toISOString(),
      ore: r.ore,
    }))
    .filter((q) => q.date === isoDate)
    .sort((a, b) => a.startUTC.localeCompare(b.startUTC))
    .map(({ startUTC, hour, minute, ore }) => ({
      startUTC,
      hour,
      minute,
      ore,
    }));
}

async function fromSupabase(isoDate: string): Promise<DayPrices | null> {
  const { from, to } = stockholmDayUTCRange(isoDate);
  const { data, error } = await supabase
    .from("spot_prices")
    .select("area, delivery_period_start, ore_per_kwh")
    .gte("delivery_period_start", from)
    .lte("delivery_period_start", to)
    .order("delivery_period_start");
  if (error || !data || data.length === 0) return null;

  const out = {} as DayPrices;
  for (const area of AREAS) {
    out[area] = toQuarters(
      isoDate,
      data
        .filter((r) => r.area === area)
        .map((r) => ({ start: r.delivery_period_start, ore: r.ore_per_kwh })),
    );
    if (out[area].length === 0) return null;
  }
  return out;
}

async function fromElprisetjustnu(isoDate: string): Promise<DayPrices | null> {
  const [y, m, d] = isoDate.split("-");
  try {
    const entries = await Promise.all(
      AREAS.map(async (area) => {
        const res = await fetch(
          `https://www.elprisetjustnu.se/api/v1/prices/${y}/${m}-${d}_${area}.json`,
          {
            next: { revalidate: 900 },
          },
        );
        if (!res.ok) throw new Error(`${area}: ${res.status}`);
        const raw: { SEK_per_kWh: number; time_start: string }[] =
          await res.json();
        return [
          area,
          toQuarters(
            isoDate,
            raw.map((e) => ({
              start: e.time_start,
              ore: Math.round(e.SEK_per_kWh * 10000) / 100,
            })),
          ),
        ] as const;
      }),
    );
    return Object.fromEntries(entries) as DayPrices;
  } catch {
    return null;
  }
}

/** Dygnets kvartspriser för alla fyra elområden. `null` om data saknas. */
export async function loadDayPrices(
  isoDate: string,
): Promise<DayPrices | null> {
  return (await fromSupabase(isoDate)) ?? (await fromElprisetjustnu(isoDate));
}
