"use client";

// Renderar om en serverrenderad sida (router.refresh) när svenskt datum byts
// medan den står öppen: 0–30 s efter midnatt, eller direkt när fliken visas
// igen efter dygnsbytet. `date` är dygnet sidan renderades för (YYYY-MM-DD).

import { useRouter } from "next/navigation";
import { useSwedishDayChange } from "@/lib/prices/useLiveClock";

export default function RefreshOnDayChange({ date }: { date: string }) {
  const router = useRouter();
  useSwedishDayChange(() => router.refresh(), date);
  return null;
}
