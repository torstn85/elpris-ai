// OG-bild för stadssidorna: stadens snittpris och billigaste timme för datumet.
import { CITIES } from "@/lib/cities";
import { renderCityOg, validDate } from "@/lib/og/images";

export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { slug: string; datum: string } }) {
  if (!CITIES[params.slug] || !validDate(params.datum)) return new Response("Not found", { status: 404 });
  return renderCityOg(params.slug, params.datum);
}
