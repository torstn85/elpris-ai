// Länkar till /elomrade/se1–se4 ("Elområde 1 · Luleå"). 2×2 på mobil med staden
// på egen rad, en rad från sm. current markerar sidans eget område.

import Link from "next/link";
import { ELOMRADEN, ELOMRADE_KEYS } from "@/content/elomrade";

export default function AreaLinks({ current, className = "" }: { current?: string; className?: string }) {
  return (
    <nav aria-label="Välj elområde" className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap ${className}`}>
      {ELOMRADE_KEYS.map((key) => {
        const o = ELOMRADEN[key];
        return (
          <Link
            key={key}
            href={`/elomrade/${key}`}
            aria-current={key === current ? "page" : undefined}
            className={`px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm text-center leading-snug transition-all duration-150 ${
              key === current
                ? "bg-[#00E5FF] text-[#0A2540] shadow-lg shadow-[#00E5FF]/20"
                : "bg-[#0F3460] border border-[#1E4976] text-[#8fafc9] hover:border-[#00E5FF]/40 hover:text-white"
            }`}
          >
            <span>Elområde {o.number}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">{o.selectorCity}</span>
          </Link>
        );
      })}
    </nav>
  );
}
