// Timsnitt för ett område: Timme | Snittpris (öre/kWh) | Nivå. Etiketterna
// kommer från timfunktionen (23/24/25 timmar). Med nowMs markeras pågående timme.

import { isCurrentHour, type HourEntry } from "@/lib/prices/hourly";
import { PRICE_LEVEL_COLORS, PRICE_LEVEL_LABELS, priceLevel } from "@/lib/prices/priceLevel";
import { ore1 } from "@/lib/format/ore";

export default function HourTable({
  hours,
  caption,
  nowMs,
}: {
  hours: HourEntry[];
  /** Skärmläsartext, t.ex. "Snittpris per timme idag i SE3". */
  caption: string;
  /** Markera timmen som pågår vid denna tid. Utelämna för morgondagen. */
  nowMs?: number;
}) {
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden max-w-3xl">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976]">
            <th className="text-left px-3 sm:px-5 py-2 font-medium">Timme</th>
            <th className="text-right px-3 sm:px-5 py-2 font-medium">Snittpris (öre/kWh)</th>
            <th className="text-right px-3 sm:px-5 py-2 font-medium">Nivå</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => {
            const current = nowMs !== undefined && isCurrentHour(h, nowMs);
            const level = priceLevel(h.ore_per_kwh);
            const color = PRICE_LEVEL_COLORS[level];
            return (
              <tr
                key={h.startUTC}
                aria-current={current ? "time" : undefined}
                className={`border-b border-[#1E4976]/50 last:border-0 ${current ? "bg-white/10" : ""}`}
              >
                <td className="px-3 sm:px-5 py-2 font-mono text-[#e2eaf4]">
                  <span className="flex items-center gap-2">
                    {current && (
                      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E5FF]" />
                      </span>
                    )}
                    <span>
                      <span className="whitespace-nowrap">{h.label.slice(0, 11)}</span>
                      {h.label.slice(11)}
                    </span>
                    {current && <span className="sr-only">(pågår)</span>}
                  </span>
                </td>
                <td className="px-3 sm:px-5 py-2 text-right font-bold font-mono tabular-nums" style={{ color }}>
                  {ore1(h.ore_per_kwh)}
                </td>
                <td className="px-3 sm:px-5 py-2 text-right">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
                  >
                    {PRICE_LEVEL_LABELS[level]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
