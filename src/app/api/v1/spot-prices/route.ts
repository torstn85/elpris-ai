// GET /api/v1/spot-prices — se docs/api-v1.md. Logiken finns i
// src/lib/api/v1/spotPrices.ts, beroendena i src/lib/api/v1/data.ts.
//
// Inga ISR- eller Data Cache-skrivningar: alltid dynamisk, ingen revalidate,
// all fetch (även Supabase-klientens) utan cache. Svaret cachas bara privat
// hos klienten via Cache-Control.

import { createSpotPricesHandler } from "@/lib/api/v1/spotPrices";
import { spotPricesDeps } from "@/lib/api/v1/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const GET = createSpotPricesHandler(spotPricesDeps);
