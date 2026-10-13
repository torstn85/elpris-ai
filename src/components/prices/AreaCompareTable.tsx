// Jämförelsetabell med en rad per elområde (/elpris-idag, /elpris-imorgon).
// En enda <table>; på mobil visas varje rad som ett block med kolumnnamnet
// framför värdet. Första värdekolumnen är fetstilt.

import Link from "next/link";
import type { Area } from "@/lib/prices/today";

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";

export default function AreaCompareTable({
  columns,
  rows,
}: {
  /** Kolumnnamn efter "Elområde". */
  columns: string[];
  rows: { area: Area; cells: string[] }[];
}) {
  return (
    <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="hidden sm:table-header-group">
          <tr className="text-[#8fafc9] text-xs border-b border-[#1E4976] text-left">
            <th className="px-4 py-3 font-medium">Elområde</th>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ area, cells }) => (
            <tr
              key={area}
              className="block sm:table-row px-4 py-3 sm:p-0 border-b border-[#1E4976]/50 last:border-0"
            >
              <td className="block sm:table-cell sm:px-4 sm:py-3 mb-1 sm:mb-0">
                <Link href={`/elomrade/${area.toLowerCase()}`} className={LINK}>
                  {area}
                </Link>
              </td>
              {cells.map((value, i) => (
                <td
                  key={columns[i]}
                  data-label={columns[i]}
                  className={`flex justify-between gap-4 py-0.5 sm:table-cell sm:px-4 sm:py-3 whitespace-nowrap tabular-nums before:content-[attr(data-label)] before:text-[#8fafc9] sm:before:content-none ${i === 0 ? "font-semibold" : ""}`}
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
