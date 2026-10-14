// Räknare för en aktivitet i "billigast att X"-guiderna, t.ex.
// <ActivitySavings activity="torktumla" kwh={2.5} hours={2} defaultPerWeek={3} /> i MDX.
// unit/unitPlural byter "pass" mot t.ex. unit="laddning" unitPlural="laddningar".
//
// Per år räknas på medianskillnaden mellan dygnets dyraste och billigaste fönster
// (egen prisdata, src/lib/prices/windowSpreadStats.ts). "Idag" räknas på dagens
// faktiska fönster. Serverkomponent: dagens timpriser finns i server-HTML.

import { loadTodayPrices } from "@/lib/prices/today";
import ActivitySavingsView from "./ActivitySavingsView";

export default async function ActivitySavings({
  activity,
  kwh: kwhProp,
  hours: hoursProp = 2,
  defaultPerWeek: perWeekProp = 3,
  unit = "pass",
  unitPlural,
}: {
  /** Aktiviteten i infinitiv, t.ex. "torktumla". */
  activity: string;
  /** Förbrukning per pass i kWh (Elduellens värden), t.ex. 2.5. */
  kwh: number | string;
  /** Fönsterlängd i timmar (1–4) — styr vilken median som används. */
  hours?: number | string;
  /** Startvärde för antal pass per vecka. */
  defaultPerWeek?: number | string;
  /** Vad ett tillfälle heter, singular, t.ex. "laddning". Standard "pass". */
  unit?: string;
  /** Plural av unit, t.ex. "laddningar". Standard samma som unit. */
  unitPlural?: string;
}) {
  const kwh = Number(kwhProp);
  const hours = Math.min(4, Math.max(1, Math.round(Number(hoursProp)) || 2)) as 1 | 2 | 3 | 4;
  const perWeek = Math.max(1, Math.round(Number(perWeekProp)) || 3);
  if (!Number.isFinite(kwh) || kwh <= 0) return null;
  const today = await loadTodayPrices();
  return (
    <ActivitySavingsView
      activity={activity}
      kwh={kwh}
      hours={hours}
      defaultPerWeek={perWeek}
      unit={unit}
      unitPlural={unitPlural ?? unit}
      initial={{ todayDate: today?.date ?? null, today: today?.areas ?? null }}
    />
  );
}
