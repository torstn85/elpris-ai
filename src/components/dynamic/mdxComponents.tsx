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
import ShouldIWashNow from './ShouldIWashNow';

export const mdxComponents = {
  LivePriceWidget,
  PriceGraph,
  CheapestHoursToday,
  MostExpensiveHoursToday,
  PriceComparisonByArea,
  AdSlot,
  ShouldIWashNow,
  // Lägg till nya komponenter här när de skapas:
  // SevenDayPriceTrend,
  // TomorrowPriceTeaser,
  // SavingsCalculator,
  // NegativePriceAlert,
};

export type MDXComponents = typeof mdxComponents;
