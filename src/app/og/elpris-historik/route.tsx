// OG-bild för /elpris-historik. Statisk, utan siffror, cachas som guidebilderna.
import { renderHistoryOg } from "@/lib/og/images";

export const dynamic = "force-static";

export function GET() {
  return renderHistoryOg();
}
