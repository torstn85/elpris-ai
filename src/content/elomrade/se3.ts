import type { ElomradeContent } from "./types";

const se3: ElomradeContent = {
  number: 3,
  area: "SE3",
  region: "Södra Mellansverige",
  regionInSentence: "södra Mellansverige",
  selectorCity: "Stockholm",
  h1: "Elpriset idag i elområde 3 (SE3)",
  about: [
    "Elområde 3 omfattar stora delar av Mellansverige. Här ligger bland annat Stockholm, Göteborg, Uppsala, Västerås och Gävle, och norra Halland med Kungsbacka och Varberg.",
    "I SE3 används mer el än som produceras i området, och el förs hit från norr. Elpriset är ofta högre än i norr – särskilt när överföringen söderut är fullt belastad – och ofta lägre än i SE4.",
    "Under april–oktober 2026 var dygnssnittet i elområde 3 i median 69,0 öre/kWh, mot 27,8 i SE1, 29,0 i SE2 och 99,5 i SE4 (elpris.ai:s egen prisdata).",
  ],
  faq: [
    {
      question: "Vad är elområde 3?",
      answer:
        "Elområde 3 (SE3) är ett av Sveriges fyra elområden och omfattar stora delar av Mellansverige. Spotpriset sätts för varje elområde i den gemensamma europeiska day-ahead-auktionen och är detsamma i hela elområdet.",
    },
    {
      question: "Vilka städer ligger i elområde 3?",
      answer:
        "Bland annat Stockholm, Göteborg, Uppsala, Västerås, Gävle, Kungsbacka och Varberg. Falkenberg och Halmstad ligger däremot i elområde 4 – gränsen går genom Halland mellan Varberg och Falkenberg. Elområdena följer inte länsgränserna – är du osäker kan ditt nätbolag eller din elhandlare tala om vilket elområde du tillhör.",
    },
    {
      question: "Varför är elpriset högre i SE3 än i norra Sverige?",
      answer:
        "I SE3 används mer el än som produceras i området, och el förs hit från norr. Överföringen söderut är begränsad, och när ledningarna är fullt belastade blir priset högre i SE3 än i norr. När elnätet inte är trångt kan priset vara detsamma.",
    },
  ],
};

export default se3;
