// OG-bild för /elpris-idag: snittpris per elområde för datumet i adressen.
import { renderTodayOg, validDate } from "@/lib/og/images";

export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { datum: string } }) {
  if (!validDate(params.datum)) return new Response("Not found", { status: 404 });
  return renderTodayOg(params.datum);
}
