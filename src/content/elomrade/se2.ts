import type { ElomradeContent } from "./types";

const se2: ElomradeContent = {
  number: 2,
  area: "SE2",
  region: "Norra Mellansverige",
  regionInSentence: "norra Mellansverige",
  selectorCity: "Sundsvall",
  h1: "Elpriset idag i elområde 2 (SE2)",
  about: [
    "Elområde 2 ligger i norra Mellansverige. Här ligger bland annat Sundsvall, Östersund och Umeå.",
    "Precis som i elområde 1 produceras mer el än som används, främst i vattenkraftverk, och överskottet förs söderut. Därför är elpriset i SE2 ofta lägre än i södra Sverige – särskilt när överföringen söderut är fullt belastad.",
    "Under april–oktober 2026 var dygnssnittet i elområde 2 i median 29,0 öre/kWh, mot 27,8 i SE1, 69,0 i SE3 och 99,5 i SE4 (elpris.ai:s egen prisdata).",
  ],
  faq: [
    {
      question: "Vad är elområde 2?",
      answer:
        "Elområde 2 (SE2) är ett av Sveriges fyra elområden och ligger i norra Mellansverige. Spotpriset sätts för varje elområde i den gemensamma europeiska day-ahead-auktionen och är detsamma i hela elområdet.",
    },
    {
      question: "Vilka städer ligger i elområde 2?",
      answer:
        "Bland annat Sundsvall, Östersund och Umeå. Gävle ligger däremot i elområde 3, och Skellefteå i elområde 1. Elområdena följer inte länsgränserna – är du osäker kan ditt nätbolag eller din elhandlare tala om vilket elområde du tillhör.",
    },
    {
      question: "Varför är elpriset ofta lägre i SE2 än i SE3?",
      answer:
        "I norra Sverige produceras mer el än som används, och överföringen söderut är begränsad. När ledningarna söderut är fullt belastade blir priset lägre i SE2 än i SE3. När elnätet inte är trångt kan priset vara detsamma.",
    },
  ],
};

export default se2;
