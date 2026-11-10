"use client";

// Timtabellen för dagens priser med pågående timme markerad efter klockan.
// Första renderingen markerar efter serverns tid (serverNow), sedan följer den
// webbläsarens klocka (useNow).

import HourTable from "./HourTable";
import type { HourEntry } from "@/lib/prices/hourly";
import { useNow } from "@/lib/prices/useLiveClock";

export default function LiveHourTable({
  hours,
  caption,
  serverNow,
}: {
  hours: HourEntry[];
  caption: string;
  serverNow: number;
}) {
  return <HourTable hours={hours} caption={caption} nowMs={useNow(serverNow)} />;
}
