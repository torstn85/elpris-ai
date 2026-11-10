'use client';

// "Spotpris just nu" för stadssidor och guider (MDX: <LivePriceWidget />).
// Priset hämtas via useCurrentPrices: strax efter varje kvartsbyte och när
// fliken visas igen. "Uppdaterad HH:MM" är kvarten som svaret gäller
// (slot_start), inte webbläsarens klocka. Före första svaret visas serverns
// värden (initialPrice/initialSlotStart: pågående kvart), så att HTML och
// hydrering stämmer.

import { useState } from 'react';
import { ore1 } from '@/lib/format/ore';
import { formatClock } from '@/lib/prices/quarterTicks';
import { useCurrentPrices } from '@/lib/prices/useCurrentPrices';

type Area = 'SE1' | 'SE2' | 'SE3' | 'SE4';

interface Props {
  area?: Area;
  showAreaSelector?: boolean;
  /** Serverns startvärde: pågående kvarts pris (öre/kWh) för `area`, i HTML före hydrering. */
  initialPrice?: number | null;
  /** Serverns startvärde: pågående kvarts start (ISO), visas som "Uppdaterad HH:MM". */
  initialSlotStart?: string;
}

interface PriceData {
  price_ore_kwh: number;
  price_with_vat: number;
}

function toPriceData(price: number): PriceData {
  return { price_ore_kwh: price, price_with_vat: Math.round(price * 1.25 * 10) / 10 };
}

export default function LivePriceWidget({
  area: initialArea = 'SE3',
  showAreaSelector = true,
  initialPrice = null,
  initialSlotStart,
}: Props) {
  const [area, setArea] = useState<Area>(initialArea);
  const current = useCurrentPrices();

  // Hämtat svar i första hand; serverns seed tills dess (bara för förvalt område).
  const live = current.data?.[area];
  const seeded = area === initialArea ? initialPrice : null;
  const price = typeof live === 'number' ? live : seeded;
  const data = price != null ? toPriceData(price) : null;
  const slotStart = typeof live === 'number' && current.data ? current.data.slot_start : seeded != null ? initialSlotStart : undefined;
  const updatedLabel = slotStart ? formatClock(slotStart) : undefined;
  const loading = current.loading;
  const error = current.error ? 'Pris kunde inte hämtas just nu' : null;

  const getPriceColor = (price: number): string => {
    if (price <= 50) return 'text-green-400';
    if (price < 100) return 'text-[#00E5FF]';
    return 'text-red-400';
  };

  const getPriceLabel = (price: number): string => {
    if (price <= 0) return '⚡ Negativt — du får betalt';
    if (price <= 50) return 'Billigt';
    if (price < 100) return 'Normalt';
    return 'Dyrt';
  };

  return (
    <div className="my-8 rounded-2xl bg-[#0F3460] p-6 ring-1 ring-[#1E4976] shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
            ⚡ Spotpris just nu
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Aktuellt 15-minuterspris i {area}
          </p>
        </div>

        {showAreaSelector && (
          <div className="flex gap-1">
            {(['SE1', 'SE2', 'SE3', 'SE4'] as Area[]).map((a) => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  area === a
                    ? 'bg-cyan-500 text-slate-900'
                    : 'bg-[#1E4976] text-[#8fafc9] hover:bg-[#1E4976]/80'
                }`}
                aria-label={`Välj elområde ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="animate-pulse">
          <div className="h-16 bg-[#1E4976] rounded w-2/3 mb-3" />
          <div className="h-4 bg-[#1E4976] rounded w-1/3" />
        </div>
      )}

      {error && !data && (
        <p className="text-amber-400 text-sm">{error}. Försök igen om en stund.</p>
      )}

      {data && (
        <>
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl font-bold ${getPriceColor(data.price_ore_kwh)}`}>
              {ore1(data.price_ore_kwh)}
            </span>
            <span className="text-xl text-slate-400 font-medium">öre/kWh</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className={`font-semibold ${getPriceColor(data.price_ore_kwh)}`}>
              {getPriceLabel(data.price_ore_kwh)}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Inkl. moms: {ore1(data.price_with_vat)} öre
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Spotpris exkl. nätavgift och skatt
            </span>
          </div>

          {updatedLabel && (
            <p className="mt-3 text-xs text-slate-500">
              Uppdaterad {updatedLabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}
