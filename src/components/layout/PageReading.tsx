// Smal sidbehållare för löptext: max-w-3xl, centrerad, samma sidmarginal (px-6)
// som PageWide. Används för guider, stadssidor, Om oss och integritetspolicyn.

import type { ElementType, ReactNode } from "react";

export default function PageReading({
  as: Tag = "div",
  className = "",
  children,
}: {
  /** Elementtyp, t.ex. "main" eller "article". Standard: div. */
  as?: ElementType;
  /** Extra klasser för vertikal luft och layout (py, flex, gap …) — inte bredd eller sidmarginal. */
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`max-w-3xl mx-auto px-6 ${className}`.trim()}>{children}</Tag>;
}
