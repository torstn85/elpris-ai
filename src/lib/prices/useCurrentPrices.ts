// Pågående kvarts spotpris för alla fyra elområden (/api/prices/current).
// Hämtas när svaret inte gäller kvarten som pågår enligt klockan (useNow):
// strax efter varje kvartsbyte, när fliken visas igen och — om en hämtning
// misslyckats eller servern ännu inte har nästa kvart — vid nästa minutbyte.

import { useEffect, useRef, useState } from "react";
import type { CurrentPriceResponse } from "@/app/api/prices/current/route";
import { quarterIndex } from "./liveClock";
import { useNow } from "./useLiveClock";

export function useCurrentPrices(): {
  data: CurrentPriceResponse | null;
  loading: boolean;
  error: boolean;
} {
  const now = useNow(null);
  const [data, setData] = useState<CurrentPriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  const want = now === null ? null : quarterIndex(now);
  const have = data ? quarterIndex(Date.parse(data.slot_start)) : null;

  useEffect(() => {
    if (want === null || (have !== null && have >= want) || inFlight.current) return;
    inFlight.current = true;
    fetch("/api/prices/current", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CurrentPriceResponse>;
      })
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
      });
    // now: nytt försök vid varje tick så länge svaret inte gäller pågående kvart.
  }, [want, have, now]);

  return { data, loading, error };
}
