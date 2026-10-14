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

export const mdxComponents = {
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
