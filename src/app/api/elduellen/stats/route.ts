import { NextResponse } from "next/server";
import { isValidDate, statsFor } from "@/lib/elduellen/results";
import { stockholmISODate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Supabase-klienten använder fetch — utan detta kan Next.js datacache servera
// gamla svar (statistiken uppdaterades inte i produktion).
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NEXT_PUBLIC_GAMES_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const param = new URL(request.url).searchParams.get("date");
  const date = param ?? stockholmISODate();
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Ogiltigt datum." }, { status: 400 });
  }
  try {
    const stats = await statsFor(date);
    return NextResponse.json(stats, {
      // Kort CDN-cache: statistiken behöver inte vara sekundfärsk.
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error(
      "[elduellen/stats]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Kunde inte hämta statistik." },
      { status: 500 },
    );
  }
}
