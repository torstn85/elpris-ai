import { NextResponse } from "next/server";
import { loadTomorrowPrices, tomorrowISODate, type TomorrowData } from "@/lib/prices/tomorrow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

interface TomorrowResponse extends TomorrowData {
  fetched_at: string;
}

interface TomorrowUnavailableResponse {
  available: false;
  message: string;
  date: string;
}

export async function GET() {
  try {
    const data = await loadTomorrowPrices();

    if (!data) {
      const body: TomorrowUnavailableResponse = {
        available: false,
        message: "Morgondagens priser publiceras klockan 13:15",
        date: tomorrowISODate(),
      };
      return NextResponse.json(body, { headers: NO_STORE_HEADERS });
    }

    const body: TomorrowResponse = {
      ...data,
      fetched_at: new Date().toISOString(),
    };
    return NextResponse.json(body, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
