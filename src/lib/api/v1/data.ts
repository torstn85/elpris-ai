// Riktiga beroenden för /api/v1/spot-prices: Supabase (spot_prices och vyn
// spot_prices_daily) och Upstash Ratelimit per API-nyckel.
//
// Ingen cache här: routen sätter fetchCache = "force-no-store", så att
// Supabase-klientens fetch aldrig skriver till Next.js Data Cache.

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabasePaging";
import { stockholmISODate } from "@/lib/time";
import {
  parseApiKeys,
  RATE_LIMIT_PER_MINUTE,
  type ApiArea,
  type DayRow,
  type PriceRow,
  type RowQuery,
  type SpotPricesDeps,
} from "./spotPrices";

async function loadRows(q: RowQuery): Promise<PriceRow[]> {
  return fetchAllPages<PriceRow>((a, b) => {
    let query = supabase
      .from("spot_prices")
      .select("delivery_period_start, delivery_period_end, resolution_minutes, ore_per_kwh")
      .eq("area", q.area)
      .gte("delivery_period_start", q.fromUTC)
      .lte("delivery_period_start", q.toUTC);
    if (q.quartersOnly) query = query.eq("resolution_minutes", 15);
    return query.order("delivery_period_start").order("id").range(a, b);
  });
}

async function loadDays(area: ApiArea): Promise<DayRow[]> {
  return fetchAllPages<DayRow>((a, b) =>
    supabase
      .from("spot_prices_daily")
      .select("delivery_date, complete")
      .eq("area", area)
      .order("delivery_date")
      .range(a, b),
  );
}

/** Längsta väntan på Upstash innan anropet släpps igenom. */
const UPSTASH_TIMEOUT_MS = 500;

// Lazy så att saknade env-variabler inte kraschar bygget.
// Ett Upstash-avbrott får inte fördröja svaren: inga omförsök, varje Redis-anrop
// avbryts efter UPSTASH_TIMEOUT_MS, och Ratelimit släpper igenom efter samma tid.
let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        retry: { retries: 0 },
        signal: () => AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      }),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_MINUTE, "1 m"),
      prefix: "rl:api-v1",
      timeout: UPSTASH_TIMEOUT_MS,
    });
  }
  return limiter;
}

export const spotPricesDeps: SpotPricesDeps = {
  apiKeys: () => parseApiKeys(process.env.API_KEYS),
  limit: async (keyName) => {
    const { success, limit, remaining, reset, reason } = await getLimiter().limit(keyName);
    if (reason === "timeout") {
      console.log(
        `[api/v1/spot-prices] client=${keyName} rate limit timeout (${UPSTASH_TIMEOUT_MS} ms) — släpper igenom`,
      );
    }
    return { success, limit, remaining, reset };
  },
  loadRows,
  loadDays,
  today: stockholmISODate,
  log: (line) => console.log(line),
};
