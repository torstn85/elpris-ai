// FAQ för /elduellen. Delas av den synliga sektionen och FAQPage-JSON-LD så
// att texterna inte glider isär.

export const ELDUELLEN_FAQS = [
  {
    question: "Vad är Elduellen?",
    answer:
      "Elduellen är ett dagligt spel på elpris.ai. Du får fem dueller där du väljer vilket av två alternativ som kostar mest i el — till exempel samma aktivitet vid två olika klockslag eller i två olika städer. Allt räknas på dagens riktiga spotpriser, alla spelar samma dueller och nya dueller kommer vid midnatt. När morgondagens priser har publicerats, efter kl 13:15, öppnar en bonusduell som inte räknas in i resultatet.",
  },
  {
    question: "Hur räknas kostnaden?",
    answer:
      'Kostnaden är aktivitetens energiåtgång i kWh gånger spotpriset plus energiskatt, och sedan 25 % moms. Spotpriset är det som gäller i stadens elområde under de kvartar aktiviteten pågår. Energiskatten är 36 öre/kWh exkl. moms 2026, och 26,4 öre/kWh i kommuner med nedsatt energiskatt, till exempel i Norrbottens, Västerbottens och Jämtlands län. Nätavgift och elhandlarens påslag ingår inte, eftersom de skiljer sig mellan nätbolag och elavtal. Energiåtgången är ett antagande per aktivitet som du ser under "Så har vi räknat" i facit.',
  },
  {
    question: "Varför skiljer sig priset mellan städer?",
    answer:
      "Sverige är indelat i fyra elområden, SE1–SE4, och spotpriset sätts för varje område och kvart. När överföringen av el från norr till söder är fullt belastad blir priset ofta högre i södra Sverige, särskilt i SE4. När nätet inte är trångt kan priset vara detsamma i flera områden. Utöver spotpriset betalar hushåll i vissa kommuner i norra Sverige lägre energiskatt, vilket också påverkar kostnaden.",
  },
];
