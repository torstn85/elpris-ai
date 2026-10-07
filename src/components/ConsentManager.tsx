'use client';

// Laddar Google-taggarna först efter samtycke i Cookiebot:
//   - GA4 (gtag.js) när Cookiebot.consent.statistics === true
//   - AdSense när Cookiebot.consent.marketing === true
// Consent Mode v2 är satt till "denied" som standard i layout.tsx innan något
// annat körs. Här skickas gtag('consent', 'update', …) vid varje ändring.
//
// window.gtag finns bara medan statistiksamtycke gäller — egna events
// (src/lib/elduellen/analytics.ts) blir då tysta no-ops utan samtycke och köas
// inte för senare utskick. Skripten injiceras med createElement (inte
// next/script, som lägger in <link rel="preload"> i <head> och därmed hämtar
// filerna från Google redan vid sidladdning).

import { useEffect } from 'react';

const GA_ID = 'G-CY788GRNLW';
const ADSENSE_CLIENT = 'ca-pub-7126610035053617';

interface CookiebotConsent {
  statistics: boolean;
  marketing: boolean;
}

/** Cookiebot och dataLayer utan att krocka med andra globala deklarationer. */
const w = () =>
  window as unknown as {
    dataLayer?: unknown[];
    Cookiebot?: { consent?: CookiebotConsent; hasResponse?: boolean };
  } & Record<string, unknown>;

/** Lägger ett kommando i dataLayer utan att exponera window.gtag. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function push(..._args: unknown[]): void {
  const win = w();
  win.dataLayer = win.dataLayer || [];
  // gtag.js kräver ett arguments-objekt, inte en array.
  // eslint-disable-next-line prefer-rest-params
  win.dataLayer.push(arguments);
}

function injectScript(src: string, attrs: Record<string, string> = {}): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  // Cookiebot ska inte röra skript som vi själva laddar efter samtycke.
  s.setAttribute('data-cookieconsent', 'ignore');
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

let gaConfigured = false;

function apply(consent: CookiebotConsent | undefined): void {
  const statistics = consent?.statistics === true;
  const marketing = consent?.marketing === true;

  push('consent', 'update', {
    analytics_storage: statistics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });

  if (statistics) {
    w()[`ga-disable-${GA_ID}`] = false;
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w().dataLayer!.push(arguments);
    } as Window['gtag'];
    if (!gaConfigured) {
      gaConfigured = true;
      push('js', new Date());
      // page_view skickas av config; vid klientnavigering av GA4:s utökade
      // mätning (historikändringar) — därför ingen manuell page_view.
      push('config', GA_ID);
      injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    }
  } else {
    // Återkallat eller nekat: stoppa alla GA4-träffar (även cookiefria) och
    // gör egna events till no-ops.
    w()[`ga-disable-${GA_ID}`] = true;
    window.gtag = undefined;
  }

  if (marketing) {
    injectScript(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
      { crossorigin: 'anonymous' },
    );
  }
}

export default function ConsentManager() {
  useEffect(() => {
    const onChange = () => apply(w().Cookiebot?.consent);
    // Samtycket kan redan vara känt (återkommande besökare) när komponenten monteras.
    if (w().Cookiebot?.hasResponse) onChange();
    window.addEventListener('CookiebotOnConsentReady', onChange);
    window.addEventListener('CookiebotOnAccept', onChange);
    window.addEventListener('CookiebotOnDecline', onChange);
    return () => {
      window.removeEventListener('CookiebotOnConsentReady', onChange);
      window.removeEventListener('CookiebotOnAccept', onChange);
      window.removeEventListener('CookiebotOnDecline', onChange);
    };
  }, []);
  return null;
}
