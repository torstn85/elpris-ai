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
import ShouldIChargeNow from './ShouldIChargeNow';
import SavingsCalculator from './SavingsCalculator';
import SevenDayPriceTrend from './SevenDayPriceTrend';
import FaqAccordion from './FaqAccordion';
import TomorrowPriceTeaser from './TomorrowPriceTeaser';

export const mdxComponents = {
  LivePriceWidget,
  PriceGraph,
  CheapestHoursToday,
  MostExpensiveHoursToday,
  PriceComparisonByArea,
  AdSlot,
  ShouldIWashNow,
  ShouldIChargeNow,
  SavingsCalculator,
  SevenDayPriceTrend,
  FaqAccordion,
  TomorrowPriceTeaser,
  // Lägg till nya komponenter här när de skapas:
  // NegativePriceAlert,
};

export type MDXComponents = typeof mdxComponents;
