// Sidmetadata med egen canonical och Open Graph för varje sida.
//
// Root-layouten sätter medvetet INGEN canonical, og:url eller beskrivning —
// annars ärver sidor utan egen metadata startsidans canonical och Google
// behandlar dem som kopior av startsidan (så hände 2026-05-20 till 2026-10).
// Varje sida anropar pageMeta() med sin egen sökväg.

import type { Metadata } from "next";

export const SITE_URL = "https://www.elpris.ai";

/** "/" → "https://www.elpris.ai/", "/om-oss" → "https://www.elpris.ai/om-oss". */
export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export interface OgImage {
  /** Absolut adress till bilden (1200×630). */
  url: string;
  alt: string;
}

/** Standardbilden (/og/standard) för sidor utan egen OG-bild. */
export const DEFAULT_OG_IMAGE: OgImage = {
  url: absoluteUrl("/og/standard"),
  alt: "elpris.ai – elpriset per kvart idag, imorgon och i din stad",
};

/** openGraph.images och twitter.images för en OG-bild. */
export function ogImageFields(image: OgImage) {
  return {
    openGraph: { images: [{ url: image.url, width: 1200, height: 630, alt: image.alt }] },
    twitter: { images: [{ url: image.url, alt: image.alt }] },
  };
}

export function pageMeta(opts: {
  /** Sidans egen sökväg, t.ex. "/elpris-imorgon". */
  path: string;
  /** Sidtitel; layoutens mall lägger till " | elpris.ai" om inte absoluteTitle. */
  title: string;
  description: string;
  /** Titel utan mall (startsidan). */
  absoluteTitle?: boolean;
  /** Avvikande titel/beskrivning för delning (OG/Twitter). Standard: sidans titel + " | elpris.ai". */
  ogTitle?: string;
  ogDescription?: string;
  twitterDescription?: string;
  type?: "website" | "article";
  /** OG-bild. Standard: /og/standard. */
  image?: OgImage;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const shareTitle = opts.ogTitle ?? (opts.absoluteTitle ? opts.title : `${opts.title} | elpris.ai`);
  const shareDescription = opts.ogDescription ?? opts.description;
  const image = ogImageFields(opts.image ?? DEFAULT_OG_IMAGE);
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      url,
      siteName: "elpris.ai",
      locale: "sv_SE",
      type: opts.type ?? "website",
      ...image.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: opts.twitterDescription ?? shareDescription,
      ...image.twitter,
    },
  };
}
