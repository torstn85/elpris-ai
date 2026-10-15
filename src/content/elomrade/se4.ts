import type { ElomradeContent } from "./types";

const se4: ElomradeContent = {
  number: 4,
  area: "SE4",
  region: "Södra Sverige",
  regionInSentence: "södra Sverige",
  selectorCity: "Malmö",
  h1: "Elpriset idag i elområde 4 (SE4)",
  about: [
    "Elområde 4 är Sveriges sydligaste elområde. Här ligger bland annat Malmö, Helsingborg, Halmstad, Falkenberg, Laholm och Båstad.",
    "SE4 har ofta högre spotpris än SE3. Skillnaden är störst när överföringen söderut är fullt belastad; när elnätet inte är trångt kan priset vara detsamma. Under april–oktober 2026 hade SE4 högre dygnssnitt än SE3 176 av 182 dygn, och dygnssnittet var i median 99,5 öre/kWh, mot 69,0 i SE3 (elpris.ai:s egen prisdata).",
    "Skillnaden mellan dygnets billigaste och dyraste kvartar är oftast störst i SE4. Det gör att den som flyttar förbrukning till billiga timmar – med kvarts- eller timprisavtal – oftast har mest att vinna i södra Sverige.",
  ],
  faq: [
    {
      question: "Vad är elområde 4?",
      answer:
        "Elområde 4 (SE4) är det sydligaste av Sveriges fyra elområden. Spotpriset sätts för varje elområde i den gemensamma europeiska day-ahead-auktionen och är detsamma i hela elområdet.",
    },
    {
      question: "Vilka städer ligger i elområde 4?",
      answer:
        "Bland annat Malmö, Helsingborg, Halmstad, Falkenberg, Laholm och Båstad. Varberg och Kungsbacka ligger däremot i elområde 3 – gränsen går genom Halland mellan Varberg och Falkenberg. Elområdena följer inte länsgränserna – är du osäker kan ditt nätbolag eller din elhandlare tala om vilket elområde du tillhör.",
    },
    {
      question: "Varför är elpriset ofta högst i SE4?",
      answer:
        "SE4 har ofta högre spotpris än SE3, särskilt när överföringen söderut är fullt belastad. Under april–oktober 2026 hade SE4 högre dygnssnitt än SE3 176 av 182 dygn (elpris.ai:s egen prisdata). När elnätet inte är trångt kan priset vara detsamma.",
    },
  ],
};

export default se4;
