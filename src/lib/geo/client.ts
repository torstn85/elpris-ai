// Klientsidan av elområdesförvalet: hämtar /api/geo (Vercels geo-headers).
// null vid fel — anroparen behåller då SE3 eller användarens eget val.

import type { Area } from "./area";

export async function fetchGeoArea(): Promise<Area | null> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { area?: Area };
    return data.area ?? null;
  } catch {
    return null;
  }
}
