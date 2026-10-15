// Innehåll för /elomrade (översikten). Ordagrant från innehållsfilen.
//
// Dygnssnitt (median) per område: scripts/analysis/daily-spread.ts,
// 13 april–12 oktober 2026, 182 dygn per område (spotpris exkl. moms).

import type { FaqItem } from "./types";

export const OVERSIKT = {
  title: "Elområden i Sverige – elområde 1, 2, 3 och 4 (SE1–SE4)",
  description:
    "Vilket elområde bor du i? Så fungerar Sveriges fyra elområden SE1–SE4, vilka städer som ligger var och hur elpriset skiljer sig åt.",
  h1: "Elområden i Sverige",
  intro:
    "Sverige är uppdelat i fyra elområden – elområde 1, 2, 3 och 4 (SE1–SE4). Elpriset kan skilja sig åt beroende på var i landet du bor.",

  table: {
    rows: [
      { key: "se1", exampleCities: "Luleå, Kiruna, Skellefteå", dailyMedian: "27,8 öre/kWh" },
      { key: "se2", exampleCities: "Sundsvall, Östersund, Umeå", dailyMedian: "29,0 öre/kWh" },
      { key: "se3", exampleCities: "Stockholm, Göteborg, Uppsala", dailyMedian: "69,0 öre/kWh" },
      { key: "se4", exampleCities: "Malmö, Helsingborg, Halmstad", dailyMedian: "99,5 öre/kWh" },
    ],
    footnote: "Spotpris exkl. moms, median av dygnssnittet 13 april–12 oktober 2026. Källa: elpris.ai:s egen prisdata.",
  },

  whichArea: "Det beror på var din elanläggning ligger. Här är städerna vi har egna sidor för:",

  sections: [
    {
      heading: "Varför har Sverige fyra elområden?",
      paragraphs: [
        "Sedan 1 november 2011 är Sverige uppdelat i fyra elområden. Uppdelningen visar var i landet det finns överskott och underskott av el, och var elnätet har begränsad överföringskapacitet.",
        "I norr produceras mer el än som används, medan södra Sverige använder mer än som produceras där. När ledningarna mellan norr och söder är fullt belastade får elområdena olika pris. När elnätet inte är trångt kan priset vara detsamma i flera elområden.",
      ],
    },
    {
      heading: "Hur sätts elpriset?",
      paragraphs: [
        "Spotpriset sätts en gång per dygn i den gemensamma europeiska day-ahead-auktionen (Nord Pool är elbörsen för Norden). Buden för nästa dygn stänger kl 12:00, och priserna publiceras runt kl 13:15. Sedan oktober 2025 anges priset per kvart – 96 prisnivåer per dygn – och när priset är publicerat ändras det inte.",
        "Det pris du ser på elpris.ai är spotpriset i öre/kWh exklusive moms, nätavgift och elhandlarens påslag.",
      ],
    },
    {
      heading: "Varför är el billigare i norr?",
      paragraphs: [
        "I norra Sverige (SE1 och SE2) produceras mycket mer el än som används, främst i vattenkraftverk. I södra Sverige (SE3 och SE4) bor fler och används mer el än som produceras lokalt. Elen förs söderut genom stamnätet, men kapaciteten är begränsad. När ledningarna är fullt belastade blir priset högre i söder än i norr.",
        "SE4 har också elförbindelser till grannländerna i söder, och priserna där påverkar ofta priset i SE4.",
      ],
    },
  ],

  faq: [
    {
      question: "Hur många elområden finns det i Sverige?",
      answer:
        "Sverige är uppdelat i fyra elområden: elområde 1 (SE1) i norr, elområde 2 (SE2) i norra Mellansverige, elområde 3 (SE3) i södra Mellansverige och elområde 4 (SE4) i söder. Uppdelningen gäller sedan 1 november 2011.",
    },
    {
      question: "Vilket elområde bor jag i?",
      answer:
        "Det beror på var din elanläggning ligger. Elområdena följer inte kommun- eller länsgränser. Ditt nätbolag eller din elhandlare kan tala om vilket elområde du tillhör.",
    },
    {
      question: "Varför skiljer sig elpriset mellan elområdena?",
      answer:
        "I norr produceras mer el än som används, och överföringen söderut är begränsad. När ledningarna är fullt belastade blir priset högre i söder. När elnätet inte är trångt kan priset vara detsamma i flera elområden.",
    },
  ] satisfies FaqItem[],
} as const;
