// Kvartsladdaren ligger i src/lib/prices/quarters.ts och delas med resten av
// sajten. Re-exporteras här så att Elduellens importer är oförändrade.

export {
  AREAS,
  loadDayPrices,
  type Area,
  type DayPrices,
  type Quarter,
} from "@/lib/prices/quarters";
