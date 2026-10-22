// src/components/dynamic/mdxComponents.tsx
//
// Centralt komponentregister för MDX-filer.
// Alla dynamiska komponenter måste registreras här för att vara tillgängliga.

import LivePriceWidget from './LivePriceWidget';
import PriceGraph from './PriceGraph';
import CheapestHoursToday from './CheapestHoursToday';
import MostExpensiveHoursToday from './MostExpensiveHoursToday';
import PriceComparisonByArea from './PriceComparisonByArea';
import AdSlot from './AdSlot';
import SevenDayPriceTrend from './SevenDayPriceTrend';
import FaqAccordion from './FaqAccordion';
import TomorrowPriceTeaser from './TomorrowPriceTeaser';
import CheapestWindowToday from '@/components/prices/CheapestWindowToday';
import ActivitySavings from '@/components/prices/ActivitySavings';
import type { ComponentProps } from 'react';

// Markdown-tabeller i en behållare som kan scrollas i sidled, så att breda tabeller
// inte klipps på mobil. Behållaren tar över tabellens marginal (2em vid text-sm =
// 28px, samma som prose) så att avstånden på desktop är oförändrade – och liksom
// prose ingen övre marginal direkt efter en rubrik eller linje.
function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="my-7 overflow-x-auto [h2+&]:mt-0 [h3+&]:mt-0 [h4+&]:mt-0 [hr+&]:mt-0" tabIndex={0} role="region" aria-label="Tabell">
      <table {...props} className={`!my-0 ${className ?? ''}`} />
    </div>
  );
}

export const mdxComponents = {
  table: Table,
  LivePriceWidget,
  PriceGraph,
  CheapestHoursToday,
  MostExpensiveHoursToday,
  PriceComparisonByArea,
  AdSlot,
  SevenDayPriceTrend,
  FaqAccordion,
  TomorrowPriceTeaser,
  CheapestWindowToday,
  ActivitySavings,
  // Lägg till nya komponenter här när de skapas:
  // NegativePriceAlert,
};

export type MDXComponents = typeof mdxComponents;
