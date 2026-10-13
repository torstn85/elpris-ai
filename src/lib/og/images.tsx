// OG-bilderna per sidtyp, och adresserna sidorna pekar ut i og:image.
//
// Prisbilderna har datumet i adressen (/og/elpris-idag/2026-10-13). Bilden för
// ett datum ändras inte när dygnets priser väl finns, så den kan cachas hårt —
// och delningstjänsterna, som cachar per adress, får en ny bild varje dygn.

import { formatSwedishDay } from "@/lib/format/date";
import { ore1 } from "@/lib/format/ore";
import { daysBetween } from "@/lib/dates";
import { CITIES } from "@/lib/cities";
import { PRICE_LEVEL_COLORS, priceLevel } from "@/lib/prices/priceLevel";
import { AREAS, loadTodayPrices, type Area } from "@/lib/prices/today";
import { loadTomorrowPrices } from "@/lib/prices/tomorrow";
import { cheapestHour, quarterAverage } from "@/lib/prices/todaySummary";
import type { QuarterPoint } from "@/lib/prices/quarters";
import { stockholmISODate } from "@/lib/time";
import { absoluteUrl } from "@/lib/seo";
import { PRICE_NOTE, renderOgImage, type OgTile } from "./render";

/** Oföränderlig bild (dygnets priser finns): ett år på CDN:en. */
export const CACHE_LONG = "public, max-age=3600, s-maxage=31536000, immutable";
/** Bild som kan ändras (inga priser än): fem minuter. */
export const CACHE_SHORT = "public, max-age=60, s-maxage=300";

/** Källraden på bilder utan priser (standard, före publicering, reservbilder). */
const SOURCE_NOTE = "Spotpris från elprisetjustnu.se · SE1–SE4";

const dayLabel = (iso: string) => formatSwedishDay(new Date(`${iso}T12:00:00Z`));

/** Datum i adressen: YYYY-MM-DD, högst 30 dagar bakåt och ett dygn framåt. */
export function validDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const diff = daysBetween(stockholmISODate(), iso);
  return diff >= -30 && diff <= 1;
}

function areaTiles(quarters: Record<Area, QuarterPoint[]>): OgTile[] {
  return AREAS.map((area) => {
    const avg = quarterAverage(quarters[area]);
    return { label: area, value: ore1(avg), color: PRICE_LEVEL_COLORS[priceLevel(avg)] };
  });
}

// ─── Adresser ────────────────────────────────────────────────────────────────

export const OG_STANDARD_URL = absoluteUrl("/og/standard");

export const ogGuideUrl = (kategori: string, slug: string) => absoluteUrl(`/og/guide/${kategori}/${slug}`);

export const ogTodayUrl = (iso: string = stockholmISODate()) => absoluteUrl(`/og/elpris-idag/${iso}`);

/** Före publiceringen en egen adress med kort cache, efter en oföränderlig. */
export const ogTomorrowUrl = (iso: string, published: boolean) =>
  absoluteUrl(`/og/elpris-imorgon/${iso}${published ? "" : "-vantar"}`);

export const ogCityUrl = (slug: string, iso: string = stockholmISODate()) => absoluteUrl(`/og/stad/${slug}/${iso}`);

// ─── Bilder ──────────────────────────────────────────────────────────────────

export function renderStandardOg() {
  return renderOgImage(
    {
      heading: "Elpriset per kvart – idag, imorgon och i din stad",
      sub: "Spotpriset för SE1–SE4 timme för timme och per kvart, guider om elavtal och tips för att spara.",
      footer: SOURCE_NOTE,
    },
    CACHE_LONG,
  );
}

export function renderGuideOg(title: string, category: string) {
  return renderOgImage({ heading: title, kicker: category, footer: "Guide på elpris.ai" }, CACHE_LONG);
}

export async function renderTodayOg(iso: string) {
  const data = await loadTodayPrices(iso);
  if (!data) {
    return renderOgImage(
      { heading: "Elpriset idag", kicker: dayLabel(iso), sub: "Snittpris per elområde, timme för timme och per kvart.", footer: SOURCE_NOTE },
      CACHE_SHORT,
    );
  }
  return renderOgImage(
    { heading: "Elpriset idag", kicker: `${dayLabel(iso)} · snitt i öre/kWh`, tiles: areaTiles(data.quarters), footer: PRICE_NOTE },
    CACHE_LONG,
  );
}

export async function renderTomorrowOg(iso: string, pending: boolean) {
  const data = pending ? null : await loadTomorrowPrices(iso);
  if (!data) {
    return renderOgImage(
      {
        heading: "Elpriset imorgon",
        kicker: dayLabel(iso),
        big: "Runt kl 13:15",
        bigColor: "#00E5FF",
        sub: "Då publiceras morgondagens elpris för SE1–SE4.",
        // Bilden visar inget pris — samma källrad som standardbilden.
        footer: SOURCE_NOTE,
      },
      CACHE_SHORT,
    );
  }
  return renderOgImage(
    { heading: "Elpriset imorgon", kicker: `${dayLabel(iso)} · snitt i öre/kWh`, tiles: areaTiles(data.quarters), footer: PRICE_NOTE },
    CACHE_LONG,
  );
}

export async function renderCityOg(slug: string, iso: string) {
  const city = CITIES[slug];
  const data = await loadTodayPrices(iso);
  if (!data) {
    return renderOgImage(
      { heading: `Elpris ${city.name} idag`, kicker: `${dayLabel(iso)} · ${city.area}`, sub: "Spotpriset timme för timme och per kvart.", footer: SOURCE_NOTE },
      CACHE_SHORT,
    );
  }
  const avg = quarterAverage(data.quarters[city.area]);
  const cheap = cheapestHour(data.areas[city.area]);
  return renderOgImage(
    {
      heading: `Elpris ${city.name} idag`,
      kicker: `${dayLabel(iso)} · ${city.area}`,
      big: `${ore1(avg)} öre/kWh`,
      bigColor: PRICE_LEVEL_COLORS[priceLevel(avg)],
      sub: `Snitt idag · billigast kl ${cheap.label}`,
      footer: PRICE_NOTE,
    },
    CACHE_LONG,
  );
}

