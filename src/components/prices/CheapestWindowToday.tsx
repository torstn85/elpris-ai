// Dagens billigaste (och dyraste) fönster om N timmar i följd för en aktivitet,
// t.ex. <CheapestWindowToday hours={2} kwh={2.5} activity="torktumla" /> i MDX.
//
// Serverkomponent: hämtar dagens och morgondagens timpriser så att fönstren
// finns i server-HTML (SE3 tills geo-förvalet eller ett eget val byter område).
// Klientdelen (CheapestWindowView) sköter väljaren, klockan och nya hämtningar.

import { loadTodayPrices } from "@/lib/prices/today";
import { loadTomorrowPrices } from "@/lib/prices/tomorrow";
import CheapestWindowView from "./CheapestWindowView";

export default async function CheapestWindowToday({
  hours: hoursProp = 2,
  kwh: kwhProp,
  activity,
}: {
  /** Antal timmar i följd, t.ex. 2. Tal eller text ("2"). */
  hours?: number | string;
  /** Förbrukning per pass i kWh, t.ex. 2.5. Tal eller text ("2.5"). */
  kwh?: number | string;
  /** Aktiviteten i infinitiv, t.ex. "torktumla". */
  activity: string;
}) {
  // Tål både tal och text från MDX. Ogiltigt kWh → ingen besparingsrad.
  const parsedHours = Math.round(Number(hoursProp));
  const hours = Number.isFinite(parsedHours) && parsedHours >= 1 ? parsedHours : 2;
  const parsedKwh = Number(kwhProp);
  const kwh = Number.isFinite(parsedKwh) && parsedKwh > 0 ? parsedKwh : null;
  const [today, tomorrow] = await Promise.all([loadTodayPrices(), loadTomorrowPrices()]);
  return (
    <CheapestWindowView
      hours={hours}
      kwh={kwh}
      activity={activity}
      serverNow={Date.now()}
      initial={{
        todayDate: today?.date ?? null,
        today: today?.areas ?? null,
        tomorrowDate: tomorrow?.date ?? null,
        tomorrow: tomorrow?.areas ?? null,
      }}
    />
  );
}
