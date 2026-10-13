"use client";

// Sjudagarstrenden för valt område (SE3 i server-HTML, sedan geo/eget val).

import SevenDayPriceTrend from "@/components/dynamic/SevenDayPriceTrend";
import { useArea } from "@/components/elpris-idag/AreaSelect";

export default function AreaSevenDayTrend() {
  return <SevenDayPriceTrend area={useArea()} />;
}
