'use client';

import { useEffect, useRef } from 'react';

type AdFormat = 'in-article' | 'sticky-mobile' | 'display';

interface Props {
  slot: string;
  format?: AdFormat;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: { [key: string]: unknown }[];
  }
}

const PUBLISHER_ID = 'ca-pub-7126610035053617';

export default function AdSlot({ slot, format = 'in-article', className = '' }: Props) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // Initiera bara om DOM-elementet finns och inte redan är aktiverat
      if (insRef.current && !insRef.current.getAttribute('data-adsbygoogle-status')) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      // Tysta fel — AdBlock eller liknande är OK
      console.warn('AdSense load failed:', err);
    }
  }, [slot]);

  // Sticky mobile har specifik styling — bara synlig på mobil, fixerad i botten
  if (format === 'sticky-mobile') {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800 md:hidden ${className}`}
        aria-label="Annons"
      >
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // In-article (default) — passar in mellan textstycken
  if (format === 'in-article') {
    return (
      <div className={`my-8 text-center ${className}`} aria-label="Annons">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Annons</p>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={slot}
        />
      </div>
    );
  }

  // Display — generell responsive annons
  return (
    <div className={`my-8 ${className}`} aria-label="Annons">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 text-center">Annons</p>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
