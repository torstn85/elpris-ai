// Förval av elområde från Vercels geo-headers (x-vercel-ip-country,
// x-vercel-ip-country-region, x-vercel-ip-city). Ren funktion — ingen IP-adress
// hanteras här. Ordning: stad i CITIES → län (ISO 3166-2:SE) → SE3.

import { CITIES } from "@/lib/cities";

export type Area = "SE1" | "SE2" | "SE3" | "SE4";
export type GeoSource = "city" | "region" | "default";

export interface GeoInput {
  country?: string | null;
  /** ISO 3166-2-underkod utan landsprefix, t.ex. "M" för Skåne. */
  region?: string | null;
  /** URL-kodat stadsnamn som Vercel skickar det, t.ex. "Malm%C3%B6". */
  city?: string | null;
}

/** "Malmö" / "MALMO" / "malmo" → "malmo". */
const normalize = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Engelska namn som geodatabaser kan använda i stället för de svenska. */
const CITY_ALIASES: Record<string, string> = {
  gothenburg: "goteborg",
};

/**
 * Län (ISO 3166-2:SE-kod) → elområde, bara för län som ligger helt i ett
 * område. Delade eller ej verifierade län saknas med flit och faller till SE3:
 * Hallands (N, delat SE3/SE4 enligt elpris-facts), Gävleborgs (X), Dalarnas (W),
 * Värmlands (S), Jönköpings (F) och Kalmar (H) län — tills de verifierats mot
 * Svenska kraftnäts karta. Västerbotten (AC) är delat SE1/SE2 men mappas till
 * SE2 (Umeå); Skellefteå fångas ändå av stadssteget (SE1).
 */
const COUNTY_AREA: Record<string, Area> = {
  BD: "SE1", // Norrbotten
  AC: "SE2", // Västerbotten (delat — se ovan)
  Z: "SE2", // Jämtland
  Y: "SE2", // Västernorrland
  AB: "SE3", // Stockholm
  C: "SE3", // Uppsala
  D: "SE3", // Södermanland
  E: "SE3", // Östergötland
  I: "SE3", // Gotland
  O: "SE3", // Västra Götaland
  T: "SE3", // Örebro
  U: "SE3", // Västmanland
  M: "SE4", // Skåne
  K: "SE4", // Blekinge
  G: "SE4", // Kronoberg
};

/** "M" eller "SE-M" → "M". */
function countyArea(raw: string): Area | null {
  const code = raw.trim().toUpperCase().replace(/^SE-/, "");
  return COUNTY_AREA[code] ?? null;
}

function decodeCity(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function cityArea(raw: string): Area | null {
  const key = normalize(decodeCity(raw));
  const slug = CITY_ALIASES[key] ?? key;
  const city = Object.values(CITIES).find(
    (c) => normalize(c.slug) === slug || normalize(c.name) === slug,
  );
  return city ? city.area : null;
}

export function areaFromGeo(input: GeoInput): { area: Area; source: GeoSource } {
  if (input.country?.toUpperCase() !== "SE") return { area: "SE3", source: "default" };
  if (input.city) {
    const area = cityArea(input.city);
    if (area) return { area, source: "city" };
  }
  if (input.region) {
    const area = countyArea(input.region);
    if (area) return { area, source: "region" };
  }
  return { area: "SE3", source: "default" };
}
