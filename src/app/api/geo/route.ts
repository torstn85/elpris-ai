import { NextResponse } from "next/server";
import { areaFromGeo } from "@/lib/geo/area";

// Förval av elområde från Vercels geo-headers. Returnerar bara elområde och
// källa — aldrig IP-adress. Varken IP eller headers loggas.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: Request) {
  const h = request.headers;
  const result = areaFromGeo({
    country: h.get("x-vercel-ip-country"),
    region: h.get("x-vercel-ip-country-region"),
    city: h.get("x-vercel-ip-city"),
  });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, private" },
  });
}
