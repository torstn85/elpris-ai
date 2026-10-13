// Bred sidbehållare (samma som startsidan): max-w-6xl, centrerad, px-6.
// Används för sidor med tabeller, kort och rutnät. Se även PageReading.

import type { ElementType, ReactNode } from "react";

export default function PageWide({
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
  return <Tag className={`max-w-6xl mx-auto px-6 ${className}`.trim()}>{children}</Tag>;
}
