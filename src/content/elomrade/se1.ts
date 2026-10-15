import type { ElomradeContent } from "./types";

const se1: ElomradeContent = {
  number: 1,
  area: "SE1",
  region: "Norra Sverige",
  regionInSentence: "norra Sverige",
  selectorCity: "Luleå",
  h1: "Elpriset idag i elområde 1 (SE1)",
  about: [
    "Elområde 1 är Sveriges nordligaste elområde. Här ligger bland annat Luleå, Kiruna och Skellefteå.",
    "I norra Sverige produceras mycket mer el än som används, främst i vattenkraftverk, och överskottet förs söderut. Därför är elpriset i norr ofta lägre än i söder – särskilt när överföringen söderut är fullt belastad. När elnätet inte är trångt kan priset vara detsamma i flera elområden.",
    "Under april–oktober 2026 var dygnssnittet i elområde 1 i median 27,8 öre/kWh, mot 29,0 i SE2, 69,0 i SE3 och 99,5 i SE4. Skillnaden mellan dygnets billigaste och dyraste kvartar var minst i SE1 och SE2 (elpris.ai:s egen prisdata).",
  ],
  faq: [
    {
      question: "Vad är elområde 1?",
      answer:
        "Elområde 1 (SE1) är det nordligaste av Sveriges fyra elområden. Spotpriset sätts för varje elområde i den gemensamma europeiska day-ahead-auktionen och är detsamma i hela elområdet.",
    },
    {
      question: "Vilka städer ligger i elområde 1?",
      answer:
        "Bland annat Luleå, Kiruna och Skellefteå. Umeå ligger däremot i elområde 2. Elområdena följer inte länsgränserna – är du osäker kan ditt nätbolag eller din elhandlare tala om vilket elområde du tillhör.",
    },
    {
      question: "Varför är elpriset ofta lägre i elområde 1?",
      answer:
        "I norra Sverige produceras mer el än som används, och överföringen söderut är begränsad. När ledningarna söderut är fullt belastade blir priset lägre i norr än i söder. När elnätet inte är trångt kan priset vara detsamma i flera elområden.",
    },
  ],
};

export default se1;
