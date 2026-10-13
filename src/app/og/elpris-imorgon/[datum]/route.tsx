// OG-bild för /elpris-imorgon. "2026-10-14-vantar" = före publiceringen (~13:15).
import { renderTomorrowOg, validDate } from "@/lib/og/images";

export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { datum: string } }) {
  const pending = params.datum.endsWith("-vantar");
  const iso = pending ? params.datum.slice(0, -"-vantar".length) : params.datum;
  if (!validDate(iso)) return new Response("Not found", { status: 404 });
  return renderTomorrowOg(iso, pending);
}
