// Klientkrokar som håller "just nu" och dagens data aktuella när en sida står
// öppen. Gemensam klocka för alla: tick strax efter varje kvartsbyte, en
// reservkontroll var 60:e sekund (strax efter varje helt minutbyte, så att
// minutvisningar som "Nästa om X min" stämmer, och om webbläsaren fördröjer
// kvartstimern) och direkt när fliken visas igen (visibilitychange/pageshow).

import { useEffect, useRef, useState } from "react";
import { msToNextQuarter, swedishDate } from "./liveClock";

/** Marginal efter kvartsbytet så att tick:et säkert hamnar i den nya kvarten. */
const AFTER_BOUNDARY_MS = 1000;
const MINUTE_MS = 60_000;
/** Övre gräns för den slumpade fördröjningen innan omhämtning vid midnatt. */
const DAY_CHANGE_MAX_DELAY_MS = 30_000;

type TickReason = "tick" | "visible";

/** Anropar cb vid kvartsbyte (+~1 s), varje minutbyte (+~1 s) och när fliken visas igen. Returnerar avregistrering. */
function subscribeClock(cb: (reason: TickReason) => void): () => void {
  let timeout: number | undefined;
  let fallback: number | undefined;
  const schedule = () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      cb("tick");
      schedule();
    }, msToNextQuarter(Date.now()) + AFTER_BOUNDARY_MS);
  };
  // Reservkontrollen räknas om från aktuell tid varje gång, så den glider inte.
  const scheduleFallback = () => {
    fallback = window.setTimeout(() => {
      cb("tick");
      schedule(); // en fördröjd eller strypt kvartstimer läggs om från aktuell tid
      scheduleFallback();
    }, MINUTE_MS - (Date.now() % MINUTE_MS) + AFTER_BOUNDARY_MS);
  };
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    cb("visible");
    schedule();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);
  schedule();
  scheduleFallback();
  return () => {
    window.clearTimeout(timeout);
    window.clearTimeout(fallback);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onVisible);
  };
}

/**
 * Aktuell tid (ms). Första renderingen använder `serverNow` — samma värde som
 * servern renderade med — så att hydreringen stämmer; webbläsarens klocka tar
 * över först efter mount. Uppdateras strax efter varje kvartsbyte, strax
 * efter varje minutbyte och direkt när fliken visas igen. `null` = ingen
 * servertid (komponenten renderar då sitt "utan klocka"-läge tills mount).
 */
export function useNow(serverNow: number): number;
export function useNow(serverNow: number | null): number | null;
export function useNow(serverNow: number | null): number | null {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    return subscribeClock(() => setNow(Date.now()));
  }, []);
  return now;
}

/**
 * Anropar `onNewDay` när svenskt datum har bytts sedan `date` (YYYY-MM-DD;
 * utelämnat = datumet vid mount). Upptäcks bytet av timern sker anropet efter
 * en slumpad fördröjning på 0–30 s, så att alla öppna flikar inte hämtar
 * samtidigt vid midnatt. Upptäcks det när fliken visas igen sker det direkt.
 * Högst ett anrop per nytt datum.
 */
export function useSwedishDayChange(onNewDay: () => void, date?: string): void {
  const callback = useRef(onNewDay);
  useEffect(() => {
    callback.current = onNewDay;
  }, [onNewDay]);

  useEffect(() => {
    let day = date ?? swedishDate(Date.now());
    let delayed: number | undefined;
    const fire = () => {
      window.clearTimeout(delayed);
      delayed = undefined;
      day = swedishDate(Date.now());
      callback.current();
    };
    const check = (reason: TickReason) => {
      if (swedishDate(Date.now()) === day) return;
      if (reason === "visible") fire();
      else if (delayed === undefined) delayed = window.setTimeout(fire, Math.random() * DAY_CHANGE_MAX_DELAY_MS);
    };
    check("tick"); // serverns datum kan redan vara inaktuellt (renderad strax före midnatt)
    const unsubscribe = subscribeClock(check);
    return () => {
      unsubscribe();
      window.clearTimeout(delayed);
    };
  }, [date]);
}
