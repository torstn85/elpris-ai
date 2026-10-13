// Påminnelsen om att flytt av förbrukning kräver kvarts-/timprisavtal, och
// länkarna till spara-el-guiderna (/elpris-idag, /elpris-imorgon).

import Link from "next/link";

const LINK = "font-semibold text-[#00E5FF] hover:text-white hover:underline transition-colors duration-150";

export default function ShiftUsageLinks() {
  return (
    <>
      <p className="text-base text-[#8fafc9] leading-relaxed mb-4">
        Att flytta förbrukning lönar sig bara med kvarts- eller timprisavtal – med rörligt
        månadspris betalar du samma snittpris oavsett när.
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
        <li><Link href="/guider/spara-el/tvatta-billigt" className={LINK}>Så tvättar du billigt</Link></li>
        <li><Link href="/guider/spara-el/ladda-elbil-billigt" className={LINK}>Ladda elbilen billigt</Link></li>
        <li><Link href="/guider/spara-el/varmepump-elpris" className={LINK}>Värmepump och spotpris</Link></li>
      </ul>
    </>
  );
}
