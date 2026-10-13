// "Elpris i din stad": alla städer i CITIES grupperade per elområde, med en
// länk till elområdets sida per grupp. Gruppetiketten är fet text, inte rubrik.

import Link from "next/link";
import { CITIES } from "@/lib/cities";
import { AREAS } from "@/lib/prices/today";

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";

export default function CityLinksByArea() {
  const groups = AREAS.map((area) => ({
    area,
    cities: Object.values(CITIES)
      .filter((c) => c.area === area)
      .sort((a, b) => a.name.localeCompare(b.name, "sv")),
  }));
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {groups.map(({ area, cities }) => (
        <div key={area}>
          <p className="font-bold text-white mb-2">{area}</p>
          <ul className="space-y-1.5 text-sm">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link href={`/elpris-idag/${c.slug}`} className="text-[#8fafc9] hover:text-[#00E5FF] transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link href={`/elomrade/${area.toLowerCase()}`} className={LINK}>
                Om {area}
              </Link>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
