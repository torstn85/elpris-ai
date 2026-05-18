export type City = {
  slug: string;
  name: string;
  area: 'SE1' | 'SE2' | 'SE3' | 'SE4';
  region: string;
  uniqueIntro: string;
  commonGridCompanies: string;
  uniqueFaqs: { question: string; answer: string }[];
};

export const CITIES: Record<string, City> = {
  bastad: {
    slug: 'bastad',
    name: 'Båstad',
    area: 'SE4',
    region: 'Skåne',
    uniqueIntro:
      'Båstad ligger på Bjärehalvön i nordvästra Skåne och tillhör elområde SE4 — samma område som södra Halland, övriga Skåne och Blekinge. Med cirka 16 000 invånare som ökar dramatiskt under sommarmånaderna är staden känd för tennistraditionen och kustnära livsstil. SE4 har konsekvent högre spotpris än Stockholm och Göteborg (SE3) — typiskt 20–40 % mer för samma timme. Skillnaden beror på begränsad överföringskapacitet från norr och påverkan från det europeiska elnätet via Tyskland och Polen. För Båstad-bor blir smart styrning av värmepump, tvätt och elbilsladdning extra värdefull — varje öre i prisspridning över dygnet ger mer tillbaka här än längre norrut.',
    commonGridCompanies:
      'Bland de större nätbolagen i Båstad finns Södra Hallands Kraft och E.ON Energidistribution, beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Båstad?',
        answer:
          'Båstad tillhör elområde SE4, Sveriges sydligaste och dyraste elprisområde. SE4 omfattar Skåne, södra Halland och Blekinge. Trots att Båstad geografiskt och kulturellt har stark anknytning till Bjäre och södra Halland, så är det SE4-priser som gäller här — vilket är märkbart högre än norra Hallands (Kungsbacka, Varberg) SE3-priser.',
      },
      {
        question: 'Varför är elen dyrare i Båstad än i Kungsbacka?',
        answer:
          'Båstad tillhör SE4 medan Kungsbacka tillhör SE3 — och SE4 har historiskt 20–40 % högre spotpris än SE3. Skillnaden beror på två faktorer: begränsad kapacitet i stamnätet som ska transportera billig norrländsk vattenkraft söderut, och att SE4 är mer kopplat till det europeiska elnätet där gas- och kolkraft ofta sätter marginalpriset. Trots att städerna ligger relativt nära varandra i samma region går elprisgränsen mellan dem.',
      },
    ],
  },
  falkenberg: {
    slug: 'falkenberg',
    name: 'Falkenberg',
    area: 'SE4',
    region: 'Halland',
    uniqueIntro:
      'Falkenberg ligger vid Atterhusån längs Hallandskusten och har cirka 48 000 invånare. Staden tillhör elområde SE4 — samma som södra Halland, Skåne och Blekinge. Med växande befolkning, många villaområden som Stafsinge och Skrea, samt aktiv industri har Falkenberg en blandad förbrukningsprofil. Eluppvärmda hus är vanliga, vilket gör vintermånaderna kostsamma — men också skapar stor potential för besparing genom smart styrning. SE4 har konsekvent högre spotpris än Stockholm och Göteborg (SE3) — typiskt 20–40 % mer för samma timme. Falkenberg-bor med rörligt avtal eller kvartspris kan sänka räkningen markant genom att flytta tvätt och elbilsladdning till lågpristimmar.',
    commonGridCompanies:
      'Bland de större nätbolagen i Falkenberg finns Falkenberg Energi och Vattenfall Eldistribution, beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Falkenberg?',
        answer:
          'Falkenberg tillhör elområde SE4 — Sveriges sydligaste elprisområde. Intressant nog går elprisgränsen mellan SE3 och SE4 just genom Halland: Kungsbacka och Varberg norrut är SE3, medan Falkenberg, Halmstad och Laholm söderut är SE4. Det innebär att grannstäder kan ha 20–40 % skillnad i spotpris för samma timme — en av Sveriges tydligaste exempel på elprisgeografi.',
      },
      {
        question: 'Hur mycket kan jag spara genom att flytta elförbrukning?',
        answer:
          'I SE4, där Falkenberg ligger, varierar spotpriset typiskt 60–180 öre/kWh över ett dygn — större spridning än norrut. Genom att flytta tvätt, disk och elbilsladdning från dyra timmar (kvällar 17–20) till lågpristimmar (nätter 02–05 eller mitt på dagen) kan ett hushåll spara 800–3 000 kr per år beroende på förbrukning. Mest sparar villaägare med värmepump och elbil — i SE4 är besparingen ofta 30–50 % större än för en motsvarande villa i Stockholm.',
      },
    ],
  },
  halmstad: {
    slug: 'halmstad',
    name: 'Halmstad',
    area: 'SE4',
    region: 'Halland',
    uniqueIntro:
      'Halmstad är Hallands största stad med drygt 108 000 invånare och fungerar som regionens centrala knutpunkt. Staden tillhör elområde SE4, Sveriges sydligaste elprisområde. Halmstad har en blandad förbrukningsprofil: tät stadsbebyggelse med fjärrvärme i centrum, eluppvärmda villor i förorter som Söndrum, Vallås och Frösakull, samt industri som bidrar till hög dagtidsförbrukning. SE4 har konsekvent högre spotpris än Stockholm och Göteborg — typiskt 20–40 % mer för samma timme. Det innebär att smart styrning av värmepump, tvätt och elbilsladdning är extra värdefull i Halmstad. Kvällarna kl 17–20 är ofta upp till tre gånger dyrare än nätter kl 02–05 — och i SE4 svider den skillnaden mer än norrut.',
    commonGridCompanies:
      'Bland de större nätbolagen i Halmstad finns Halmstads Energi och Miljö Nät (HEM) och Vattenfall Eldistribution, beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Halmstad?',
        answer:
          'Halmstad tillhör elområde SE4, Sveriges sydligaste elprisområde. SE4 omfattar södra Halland, Skåne och Blekinge. Området har historiskt 20–40 % högre snittpris än SE3 (Stockholm, Göteborg) på grund av flaskhalsar i stamnätet och påverkan från det europeiska elnätet. SE3/SE4-gränsen går faktiskt genom Halland — Kungsbacka och Varberg är SE3 medan Falkenberg och Halmstad är SE4.',
      },
      {
        question: 'När är elen billigast i Halmstad?',
        answer:
          'I Halmstad, liksom resten av SE4, är elen typiskt billigast nattetid mellan 02:00 och 05:00 samt mitt på dagen mellan 12:00 och 14:00 när solkraften producerar mycket. Dyrast är vardagskvällar mellan 17:00 och 20:00 när hushållens samtidiga matlagning, värme och belysning skapar efterfrågetoppar. Prisspridningen är ofta större i SE4 än norrut, vilket gör att smart styrning ger extra mycket tillbaka här.',
      },
    ],
  },
  kungsbacka: {
    slug: 'kungsbacka',
    name: 'Kungsbacka',
    area: 'SE3',
    region: 'Halland',
    uniqueIntro:
      'Kungsbacka ligger i norra Halland och tillhör elområde SE3, samma område som Stockholm och Göteborg. Trots det geografiska avståndet betalar du som Kungsbackabo exakt samma spotpris som någon i Stockholm — det är hur den svenska elmarknaden är uppdelad. Däremot kan din slutliga elräkning skilja sig markant beroende på vilket nätbolag som driver elnätet i ditt område och vilket elavtal du har.',
    commonGridCompanies:
      'Vanliga nätbolag i Kungsbacka-området inkluderar Kungsbacka Energi och E.ON. Vilket nätbolag du har bestäms av var du bor — du kan inte välja det själv, till skillnad från elhandelsbolaget.',
    uniqueFaqs: [
      {
        question: 'Tillhör Kungsbacka SE3 eller SE4?',
        answer:
          'Kungsbacka tillhör elområde SE3 (Mellansverige). Elprisgränsen mellan SE3 och SE4 går faktiskt genom Halland — Kungsbacka och Varberg ligger i SE3, medan Falkenberg, Halmstad och Laholm söderut tillhör SE4. Det innebär att Kungsbacka har lägre spotpris än grannstäderna i södra Halland — typiskt 20–40 % billigare för samma timme. Frågan är vanlig eftersom Halland uppfattas som en sammanhängande region, men elprisgeografin följer stamnätets flaskhalsar snarare än länsgränserna.',
      },
      {
        question: 'Kan elpriset i Kungsbacka skilja sig från elpriset i Göteborg?',
        answer:
          'Nej, spotpriset är identiskt. Båda städerna tillhör SE3 och får samma timpris från Nord Pool. Det som kan skilja sig är nätavgiften (sätts av lokalt nätbolag) och eventuella påslag från elhandelsbolaget.',
      },
    ],
  },
  laholm: {
    slug: 'laholm',
    name: 'Laholm',
    area: 'SE4',
    region: 'Halland',
    uniqueIntro:
      'Laholm ligger i södra Halland och tillhör elområde SE4 — Sveriges sydligaste och dyraste elprisområde. Med cirka 26 000 invånare är staden känd för sin närhet till både kust och inland, vilket påverkar elförbrukningen säsongsmässigt. Många laholmsbor har eluppvärmda villor och högt varmvattenbehov, särskilt under sommarmånaderna när befolkningen mångdubblas i kustnära områden som Mellbystrand. SE4 har konsekvent högre spotpris än Stockholm och Göteborg (SE3) — typiskt 20–40 % mer för samma timme. Det gör att smart styrning av tvätt, laddning och värmepump är extra värdefull här: varje sparad kWh är värd mer i Laholm än längre norrut.',
    commonGridCompanies:
      'Bland de större nätbolagen i Laholm finns Södra Hallands Kraft och Vattenfall Eldistribution, beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser på den här sidan.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Laholm?',
        answer:
          'Laholm tillhör elområde SE4, som omfattar södra Sverige inklusive Malmö, Helsingborg och hela södra Halland. SE4 har historiskt 20–40 % högre snittpris än Stockholm och Göteborg (SE3), främst på grund av begränsad överföringskapacitet från norra Sveriges vattenkraft och koppling till det europeiska elnätet via Tyskland och Polen.',
      },
      {
        question: 'Är elen dyrare i Laholm än i Halmstad?',
        answer:
          'Nej, spotpriset är identiskt i Laholm och Halmstad eftersom båda ligger i SE4. Det som kan skilja är nätavgiften, som varierar mellan elnätsbolag och kommun. För att jämföra din totala kostnad behöver du titta på både spotpris och din specifika nätavgift — spotpriset är dock samma öre per kWh i hela elområdet.',
      },
    ],
  },
};
