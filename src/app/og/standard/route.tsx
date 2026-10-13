// Standardbilden för sidor utan egna tal (startsidan, elområden, guidelistor, Om oss …).
import { renderStandardOg } from "@/lib/og/images";

export const dynamic = "force-static";

export function GET() {
  return renderStandardOg();
}
