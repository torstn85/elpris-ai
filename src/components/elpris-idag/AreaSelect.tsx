"use client";

// Områdesval för /elpris-idag och /elpris-imorgon. Allt innehåll renderas på
// servern för alla fyra områden; klienten styr bara vilket som syns. Förval: SE3
// i server-HTML, sedan /api/geo. #se1–#se4 i URL:en och manuellt val har
// företräde framför geo.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchGeoArea } from "@/lib/geo/client";
import type { Area } from "@/lib/prices/today";

const AREAS: Area[] = ["SE1", "SE2", "SE3", "SE4"];

const AreaContext = createContext<{ area: Area; pick: (a: Area) => void }>({
  area: "SE3",
  pick: () => {},
});

export function AreaProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<Area>("SE3");
  const pickedManually = useRef(false);

  useEffect(() => {
    // #se1–#se4 räknas som ett eget val; panelen med samma id rullas fram.
    const fromHash = () => {
      const m = /^#se([1-4])$/i.exec(window.location.hash);
      if (!m) return;
      const a = `SE${m[1]}` as Area;
      pickedManually.current = true;
      setArea(a);
      requestAnimationFrame(() => document.getElementById(a.toLowerCase())?.scrollIntoView());
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    fetchGeoArea().then((geo) => {
      if (geo && !pickedManually.current) setArea(geo);
    });
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const pick = (a: Area) => {
    pickedManually.current = true;
    setArea(a);
  };

  return <AreaContext.Provider value={{ area, pick }}>{children}</AreaContext.Provider>;
}

export function useArea(): Area {
  return useContext(AreaContext).area;
}

/** Knapparna SE1–SE4, samma stil som startsidan. */
export function AreaSelector() {
  const { area, pick } = useContext(AreaContext);
  return (
    <div className="flex gap-2" role="group" aria-label="Välj elområde">
      {AREAS.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => pick(a)}
          aria-pressed={area === a}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
            area === a
              ? "bg-[#00E5FF] text-[#0A2540] shadow-lg shadow-[#00E5FF]/20"
              : "bg-[#0F3460] border border-[#1E4976] text-[#8fafc9] hover:border-[#00E5FF]/40 hover:text-white"
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

/** Serverrenderat innehåll för ett område — dolt (hidden) när ett annat område är valt. */
export function AreaPanel({ area, id, children }: { area: Area; id?: string; children: ReactNode }) {
  return (
    <div id={id} hidden={useArea() !== area}>
      {children}
    </div>
  );
}

/** Valt område som text, t.ex. i en rubrik. */
export function AreaName() {
  return <>{useArea()}</>;
}
