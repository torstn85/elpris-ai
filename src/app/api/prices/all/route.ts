// src/app/api/prices/all/route.ts
//
// GET /api/prices/all
// Returnerar aktuellt 15-min-pris för alla fyra elområden i ett anrop.
// Används av <PriceComparisonByArea>.
//
// Response:
// {
//   "SE1": { "area": "SE1", "price_ore_kwh": 22.3 },
//   "SE2": { ... },
//   "SE3": { ... },
//   "SE4": { ... }
// }

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AREAS = ['SE1', 'SE2', 'SE3', 'SE4'] as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Hämta alla områden i ett anrop — /api/prices/current returnerar { SE1, SE2, SE3, SE4, slot_start }
    const res = await fetch(`${baseUrl}/api/prices/current`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Kunde inte hämta prisdata' },
        { status: 502 }
      );
    }

    const current = await res.json();

    // Transformera till { SE1: { area, price_ore_kwh }, ... }
    const result: Record<string, { area: string; price_ore_kwh: number }> = {};
    for (const area of AREAS) {
      result[area] = {
        area,
        price_ore_kwh: current[area] ?? null,
      };
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Error in /api/prices/all:', err);
    return NextResponse.json(
      { error: 'Kunde inte hämta prisdata' },
      { status: 500 }
    );
  }
}
