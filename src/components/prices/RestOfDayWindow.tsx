"use client";

// "Billigast resten av dagen i X: 22:00–01:00, snitt N öre/kWh." Räknas om
// efter klockan; första renderingen använder serverns tid (serverNow).

import { cheapestWindow } from "@/lib/prices/todaySummary";
import type { HourEntry } from "@/lib/prices/hourly";
import { ore1 } from "@/lib/format/ore";
import { useNow } from "@/lib/prices/useLiveClock";

export default function RestOfDayWindow({
  hours,
  place,
  serverNow,
  className,
  markRestOfDay = false,
}: {
  hours: HourEntry[];
  /** Område eller ort, t.ex. "SE3" eller "Göteborg". */
  place: string;
  serverNow: number;
  className?: string;
  /** Skriv "Resten av dagen i X" när färre än tre timmar återstår. */
  markRestOfDay?: boolean;
}) {
  const w = cheapestWindow(hours, useNow(serverNow));
  if (!w) return null;
  return (
    <p className={className}>
      {markRestOfDay && w.restOfDay ? `Resten av dagen i ${place}` : `Billigast resten av dagen i ${place}`}:{" "}
      <strong>
        {w.start}–{w.end}
      </strong>
      , snitt {ore1(w.avg)} öre/kWh.
    </p>
  );
}
