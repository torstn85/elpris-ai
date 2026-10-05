export type City = {
  slug: string;
  name: string;
  area: 'SE1' | 'SE2' | 'SE3' | 'SE4';
  region: string;
  uniqueIntro: string;
  commonGridCompanies: string;
  uniqueFaqs: { question: string; answer: string }[];
  /**
   * Datum (YYYY-MM-DD) då DENNA stadssida publicerades. Valfritt — saknas det
   * faller sidan tillbaka på PUBLISHED_AT (mallens gemensamma datum). Sätts
   * automatiskt av pre-commit-hooken när en ny stad läggs till.
   */
  publishedAt?: string;
  /**
   * Datum (YYYY-MM-DD) för senaste ändring av DENNA stads specifika text
   * (uniqueIntro, uniqueFaqs, commonGridCompanies). Valfritt — saknas det
   * faller sidan tillbaka på MODIFIED_AT (mallens gemensamma text).
   */
  updatedAt?: string;
};

export const CITIES: Record<string, City> = {
  bastad: {
    slug: 'bastad',
    publishedAt: '2026-05-18',
    updatedAt: '2026-08-27',
    name: 'Båstad',
    area: 'SE4',
    region: 'Skåne län',
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
    publishedAt: '2026-05-18',
    updatedAt: '2026-10-01',
    name: 'Falkenberg',
    area: 'SE4',
    region: 'Hallands län',
    uniqueIntro:
      'Falkenberg ligger vid Atterhusån längs Hallandskusten och har cirka 48 000 invånare. Staden tillhör elområde SE4 — samma som södra Halland, Skåne och Blekinge. Med växande befolkning, många villaområden som Stafsinge och Skrea, samt aktiv industri har Falkenberg en blandad förbrukningsprofil. Eluppvärmda hus är vanliga, vilket gör vintermånaderna kostsamma — men också skapar stor potential för besparing genom smart styrning. SE4 har konsekvent högre spotpris än Stockholm och Göteborg (SE3) — typiskt 20–40 % mer för samma timme. Falkenberg-bor med kvarts- eller timpris kan sänka räkningen markant genom att flytta tvätt och elbilsladdning till lågpristimmar.',
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
          'I SE4, där Falkenberg ligger, varierar spotpriset typiskt 60–180 öre/kWh över ett dygn — större spridning än norrut. Genom att flytta tvätt, disk och elbilsladdning från dyra timmar (kvällar 17–20) till lågpristimmar (nätter 02–05 eller mitt på dagen) kan ett hushåll sänka sin elkostnad märkbart över året beroende på förbrukning. Mest sparar villaägare med värmepump och elbil — i SE4 är besparingen ofta 30–50 % större än för en motsvarande villa i Stockholm.',
      },
    ],
  },
  goteborg: {
    slug: 'goteborg',
    publishedAt: '2026-08-27',
    updatedAt: '2026-09-30',
    name: 'Göteborg',
    area: 'SE3',
    region: 'Västra Götalands län',
    uniqueIntro:
      'Göteborg är Sveriges näst största stad med runt 600 000 invånare, belägen vid Göta älvs mynning på västkusten. Staden tillhör elområde SE3 — samma område som Stockholm och Uppsala, trots att det är över 40 mil emellan. Det förvånar många som tror att elpriset följer geografisk närhet: en göteborgare betalar samma spotpris per kilowattimme som en stockholmare samma timme, men konsekvent lägre än Malmö och Helsingborg i SE4 strax söderut. Göteborg har en blandad förbrukningsprofil med tät stadsbebyggelse och utbredd fjärrvärme i centrum, eluppvärmda villor i ytterområden som Torslanda, Askim och Säve, samt hamn- och industriverksamhet med hög dagtidsförbrukning. Även om SE3 i snitt är billigare än SE4 varierar priset kraftigt över dygnet, så smart styrning av värmepump, tvätt och elbilsladdning lönar sig även här.',
    commonGridCompanies:
      'I Göteborg är Göteborg Energi Nät det största nätbolaget — det ägs av Göteborgs stad och driver elnätet i kommunen. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Göteborg?',
        answer:
          'Göteborg tillhör elområde SE3, samma område som Stockholm, Uppsala och Örebro. SE3 täcker södra Mellansverige, från västkusten till ostkusten. Spotpriset är detsamma för alla i SE3 samma timme — en göteborgare och en stockholmare betalar exakt samma pris per kilowattimme, trots avståndet. Det som skiljer din slutfaktura från en annan SE3-stads är nätavgift, påslag och elavtal, inte själva spotpriset. Jämfört med SE4 i söder (Malmö, Helsingborg) ligger SE3 typiskt lägre, eftersom mer elproduktion finns tillgänglig norrut och överföringen söderut är begränsad.',
      },
      {
        question: 'Varför är elen billigare i Göteborg än i Malmö?',
        answer:
          'Göteborg ligger i SE3 och Malmö i SE4. Gränsen mellan elområdena går genom Halland, mellan Varberg och Falkenberg — så redan Falkenberg, Halmstad och Laholm hamnar på den dyrare sidan. SE4 har konsekvent 20–40 % högre spotpris än SE3 för samma timme. Orsaken är att större delen av Sveriges elproduktion — vattenkraft i norr och kärnkraft i Mellansverige — ligger i eller norr om SE3, medan överföringskapaciteten söderut till SE4 är begränsad. När efterfrågan är hög räcker kapaciteten inte för att pressa ner priset i söder, och SE4 är dessutom tätare kopplat till den dyrare kontinentala elmarknaden. Göteborg hamnar på den billigare sidan av flaskhalsen, medan Malmö och Helsingborg hamnar på den dyrare.',
      },
    ],
  },
  halmstad: {
    slug: 'halmstad',
    publishedAt: '2026-05-18',
    updatedAt: '2026-08-27',
    name: 'Halmstad',
    area: 'SE4',
    region: 'Hallands län',
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
  helsingborg: {
    slug: 'helsingborg',
    publishedAt: '2026-08-27',
    name: 'Helsingborg',
    area: 'SE4',
    region: 'Skåne län',
    uniqueIntro:
      'Helsingborg ligger vid Öresund i nordvästra Skåne, med Danmark synligt på andra sidan sundet, och är med runt 115 000 invånare en av Sveriges tio största städer. Staden tillhör elområde SE4 — Sveriges sydligaste och dyraste elprisområde — där spotpriset konsekvent ligger 20–40 % högre än i SE3 (Stockholm och Göteborg) för samma timme. Helsingborg har en blandad förbrukningsprofil: tät stadsbebyggelse med fjärrvärme i centrum, eluppvärmda villor i områden som Ödåkra, Ramlösa och Mörarp, samt hamn- och industriverksamhet med hög dagtidsförbrukning. Eftersom SE4 har både högre prisnivå och större prisspridning över dygnet blir smart styrning av värmepump, tvätt och elbilsladdning extra värdefull här — varje flyttad kilowattimme är värd mer i Helsingborg än längre norrut.',
    commonGridCompanies:
      'I Helsingborg är Öresundskraft Elnät det största nätbolaget — det ägs av Helsingborgs stad och driver elnätet i staden med omnejd. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Helsingborg?',
        answer:
          'Helsingborg tillhör elområde SE4, Sveriges sydligaste och dyraste elprisområde. SE4 täcker södra Sverige — hela Skåne, Blekinge, södra Halland och delar av Småland — och här ligger även Malmö, Lund och Landskrona. Spotpriset är detsamma för alla i SE4 samma timme och ligger typiskt 20–40 % högre än i SE3 (Stockholm och Göteborg). Skillnaden beror på begränsad överföringskapacitet från de elrika norra elområdena och på att SE4 är tätt sammankopplat med det europeiska elnätet, vilket drar upp priset när kontinenten har hög efterfrågan.',
      },
      {
        question: 'Hur påverkar närheten till Danmark elpriset i Helsingborg?',
        answer:
          'Helsingborg ligger vid Öresund, bara några kilometer från Danmark, och elområde SE4 är tätt sammankopplat med kontinenten via kraftförbindelser söderut — bland annat till Själland över Öresund och vidare till Tyskland och Polen. Det gör att priset i SE4, och därmed i Helsingborg, påverkas mer av den europeiska elmarknaden än vad norra Sverige gör: när efterfrågan och priserna är höga på kontinenten kan svenska producenter hellre exportera dyrt än sälja billigt hemma, vilket pressar upp spotpriset. Förbindelserna gäller hela SE4 — inte Helsingborgs lokala elnät specifikt — men de är en huvudorsak till att södra Sverige ofta har landets högsta elpriser.',
      },
    ],
  },
  kungsbacka: {
    slug: 'kungsbacka',
    updatedAt: '2026-08-27',
    name: 'Kungsbacka',
    area: 'SE3',
    region: 'Hallands län',
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
    publishedAt: '2026-05-18',
    updatedAt: '2026-08-27',
    name: 'Laholm',
    area: 'SE4',
    region: 'Hallands län',
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
  lulea: {
    slug: 'lulea',
    publishedAt: '2026-10-01',
    name: 'Luleå',
    area: 'SE1',
    region: 'Norrbottens län',
    uniqueIntro:
      'Luleå är Norrbottens största stad och tillhör elområde SE1, Sveriges nordligaste elområde. SE1 kallas ibland "elområde Luleå" efter staden. Här finns mycket mer elproduktion än förbrukning, främst vattenkraft från de stora norrlandsälvarna, och eftersom överföringen söderut har begränsad kapacitet hör spotpriset i SE1 ofta till de lägsta i landet. Det betyder inte att priset alltid är lågt. Under kalla perioder, när efterfrågan är hög i hela Norden, kan det stiga även här. Luleå och Norrbotten är också mitt i en omfattande industrietablering, och regionnätet runt Luleå byggs ut för att klara energikrävande industrier och elektrifieringen. Hur det påverkar priset på sikt beror på hur snabbt produktion och överföring byggs ut i takt med efterfrågan. Förbrukningen i Luleå präglas av långa, kalla vintrar. Stora delar av staden har fjärrvärme, medan villor i ytterområden och i tätorter som Gammelstad och Råneå ofta värms med el. Där gör det störst skillnad att följa priset under vinterhalvåret.',
    commonGridCompanies:
      'I Luleå ansvarar det kommunägda Luleå Energi Elnät för elnätet i centralorten och stora delar av kommunen. I vissa ytterområden kan ett annat nätbolag ansvara — vilket du tillhör framgår av din nätfaktura. Nätbolaget bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Varför är elen ofta billigast i Luleå?',
        answer:
          'Luleå ligger i SE1, där produktionen av el, främst vattenkraft, är mycket större än förbrukningen. Elen behöver transporteras söderut till de stora förbrukningscentrumen, men överföringskapaciteten är begränsad. När ledningarna är fullt belastade blir det ett överskott kvar i norr, och då pressas priset i SE1 ned. När nätet inte är trångt jämnas priserna ut och kan vara nästan desamma i hela landet. SE1 har därför ofta, men inte alltid, landets lägsta spotpris.',
      },
      {
        question: 'Varför byggs elnätet runt Luleå ut?',
        answer:
          'Efterfrågan på el ökar kraftigt i regionen. Nya energikrävande industrier etableras i och omkring Luleå, och elektrifieringen av transporter och industri kräver mer kapacitet. Vattenfall Eldistribution, som driver regionnätet i området, förstärker det för att möjliggöra tillväxten och samtidigt säkra en stabil elleverans. Regionnätet är det överliggande nätet som för elen vidare till de lokala elnäten — i Luleå till största delen Luleå Energi Elnät. För dig som hushåll påverkar utbyggnaden inte spotpriset direkt, eftersom det sätts per elområde. Nätavgiften sätts däremot av ditt nätbolag och kan förändras över tid.',
      },
    ],
  },
  malmo: {
    slug: 'malmo',
    publishedAt: '2026-09-29',
    name: 'Malmö',
    area: 'SE4',
    region: 'Skåne län',
    uniqueIntro:
      'Malmö är Sveriges tredje största stad med drygt 350 000 invånare i kommunen, och den överlägset största staden i elområde SE4. Här bor alltså fler människor med Sveriges högsta spotpriser än i någon annan kommun. Malmö ligger längst ned i Skåne, närmast den punkt där SE4 kopplas ihop med Danmark, Tyskland och Polen — och den kopplingen är en av huvudorsakerna till att södra Sverige betalar mer för elen än resten av landet. Förbrukningsprofilen skiljer sig från de mindre SE4-städerna: andelen lägenheter är hög och fjärrvärmen utbredd, så mindre av elen går till uppvärmning och mer till hushållsel, vitvaror och elbilsladdning. Det gör timingen viktigare än värmestyrningen — det är tvätt, disk och laddning som går att flytta här.',
    commonGridCompanies:
      'I Malmö är det E.ON Energidistribution som ansvarar för elnätet i huvuddelen av kommunen. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften bestäms av ditt nätbolag och kommer utöver spotpriset du ser på den här sidan.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Malmö?',
        answer:
          'Malmö tillhör elområde SE4, Sveriges sydligaste och dyraste elprisområde. SE4 täcker södra Sverige — hela Skåne, Blekinge, södra Halland och delar av Småland — och här ligger även Lund, Helsingborg och Landskrona. Spotpriset är detsamma för alla i SE4 under samma timme och ligger typiskt 20–40 % högre än i SE3, där Stockholm och Göteborg ligger. Som SE4:s största stad är Malmö den kommun där flest hushåll berörs av den prisskillnaden.',
      },
      {
        question: 'Varför är elen dyrare i Malmö än i Stockholm?',
        answer:
          'Skillnaden handlar inte om städerna utan om elområdena. Malmö ligger i SE4 och Stockholm i SE3, och spotpriset sätts per elområde — inte per kommun. Två strukturella orsaker driver skillnaden. Dels är överföringskapaciteten från de elrika norra elområdena begränsad: all den el som produceras i norr kan inte transporteras söderut, så SE4 måste täcka en del av sin efterfrågan med import. Dels är SE4 tätt sammankopplat med det europeiska elnätet via förbindelser till Danmark, Tyskland och Polen, vilket gör att priset följer med uppåt när efterfrågan är hög på kontinenten. Resultatet är typiskt 20–40 % högre pris för samma timme. Det går inte att påverka genom att byta elhandelsbolag — men det gör varje flyttad kilowattimme värd mer i Malmö än i Stockholm.',
      },
    ],
  },
  stockholm: {
    slug: 'stockholm',
    publishedAt: '2026-09-30',
    name: 'Stockholm',
    area: 'SE3',
    region: 'Stockholms län',
    uniqueIntro:
      'Stockholm är Sveriges största stad med runt en miljon invånare i kommunen och tillhör elområde SE3 — samma område som Göteborg, Uppsala och Örebro. Spotpriset är därför detsamma i Stockholm som i Göteborg vid samma tidpunkt, trots att det skiljer över 40 mil. Stockholm ligger på förbrukarsidan av det svenska elsystemet: mycket av vattenkraften produceras i norr, och överföringen söderut till SE3 har begränsad kapacitet. Samtidigt ligger kärnkraften i Forsmark, norr om Stockholm, i SE3, och när reaktorer står still för revision kan det märkas i priset. Förbrukningen i Stockholm är blandad. Innerstaden och stora delar av förorterna värms med fjärrvärme, medan villaområden som Bromma, Hässelby och Enskede ofta har värmepump eller direktverkande el. För lägenhetshushåll är elräkningen oftast liten. För villor med elvärme och för den som laddar elbil hemma gör det däremot skillnad att flytta förbrukningen till dygnets billigaste kvartar.',
    commonGridCompanies:
      'I Stockholms stad är det Ellevio som ansvarar för elnätet i huvuddelen av kommunen. Bor du i någon av kranskommunerna kan det se annorlunda ut — där finns bland andra Vattenfall Eldistribution och flera kommunägda nätbolag. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Varför är elen dyrare i Stockholm än i Norrland?',
        answer:
          'Stockholm ligger i SE3 och Norrland i SE1 och SE2. I norr finns stora mängder vattenkraft och relativt låg förbrukning, medan södra Mellansverige har de stora förbrukningscentrumen. Överföringskapaciteten från norr till söder är begränsad. När efterfrågan är hög kan inte tillräckligt mycket billig el flyttas söderut, och då blir priset högre i SE3. Vid andra tillfällen, när nätet inte är trångt, kan priset vara nästan detsamma i hela landet. Skillnaden är alltså inte konstant. Den beror på hur hårt belastade förbindelserna söderut är just då.',
      },
      {
        question: 'Lönar det sig att följa elpriset om jag bor i lägenhet i Stockholm?',
        answer:
          'Det beror på vad du förbrukar. I en lägenhet med fjärrvärme går elen mest till belysning, vitvaror och elektronik, och då blir vinsten av att flytta förbrukningen begränsad i kronor. Har du timavtal eller kvartsavtal kan det ändå vara värt att köra tvätt och disk när priset är lågt, eftersom priset ofta skiljer sig mycket över dygnet. Laddar du elbil hemma, eller har tillgång till laddplats i föreningen, blir skillnaden betydligt större. Laddningen är en av de största förbrukningarna ett hushåll har och är lätt att schemalägga.',
      },
    ],
  },
  sundsvall: {
    slug: 'sundsvall',
    publishedAt: '2026-10-05',
    name: 'Sundsvall',
    area: 'SE2',
    region: 'Västernorrlands län',
    uniqueIntro:
      'Sundsvall är Västernorrlands största stad och tillhör elområde SE2 — det område som ibland kallas "elområde Sundsvall" efter staden. SE2 omfattar stora delar av Norrland, med mycket vattenkraft från älvar som Indalsälven och Ljungan. Produktionen i området är större än förbrukningen, och eftersom överföringen söderut har begränsad kapacitet blir spotpriset i SE2 ofta lägre än i södra Sverige. Det är inte alltid så: när nätet inte är trångt jämnas priserna ut, och under kalla vinterdagar med hög efterfrågan i hela Norden kan priset stiga även här. Förbrukningen i Sundsvall är blandad. Stora delar av centralorten har fjärrvärme. Bor du i villa utanför fjärrvärmenätet värms huset ofta med värmepump eller direktverkande el — då påverkar spotpriset dig mer, och det gör störst skillnad att flytta tung förbrukning till dygnets billigaste kvartar under vinterhalvåret.',
    commonGridCompanies:
      'I Sundsvall är det Sundsvall Elnät som ansvarar för elnätet i centralorten och på Alnö. I andra delar av kommunen ansvarar främst E.ON eller Härjeåns Nät. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Sundsvall?',
        answer:
          'Sundsvall tillhör elområde SE2, samma område som Umeå och Östersund. Spotpriset är detsamma för alla i SE2 vid samma tidpunkt. SE2 ligger mellan SE1 i norr och SE3 i söder, och priset ligger ofta nära SE1:s och lägre än i SE3 och SE4 — men skillnaden varierar med hur belastade förbindelserna söderut är. Det som skiljer din slutfaktura från en annan SE2-stads är nätavgift, påslag och elavtal, inte spotpriset.',
      },
      {
        question: 'Lönar det sig att flytta förbrukning i Sundsvall när elen ofta är billig?',
        answer:
          'Ofta ja, men det beror på avtal och säsong. Även när snittpriset är lågt varierar priset över dygnet, och under vintern kan skillnaden mellan dygnets billigaste och dyraste kvartar bli stor. Med kvarts- eller timpris sänker du kostnaden genom att lägga elbilsladdning, tvätt och disk när priset är lågt. Med rörligt månadspris betalar du ett snittpris oavsett när du förbrukar, och då ger flytten ingen direkt besparing. Har ditt nätbolag effektavgift kan det dessutom löna sig att undvika att flera tunga apparater går samtidigt.',
      },
    ],
  },
  umea: {
    slug: 'umea',
    publishedAt: '2026-10-01',
    name: 'Umeå',
    area: 'SE2',
    region: 'Västerbottens län',
    uniqueIntro:
      'Umeå är Norrlands största stad och tillhör elområde SE2 — inte SE1 som många tror, och inte SE3 som Stockholm. SE2 är ett av Sveriges elproducerande områden: här finns stora mängder vattenkraft, bland annat Stornorrfors vid Umeälven i Umeå kommun, ett av Sveriges större vattenkraftverk. Produktionen i norr är större än förbrukningen, och eftersom överföringen söderut har begränsad kapacitet blir spotpriset i SE2 ofta lägre än i södra Sverige. Ofta ligger det på samma nivå som i SE1. Under kalla vinterdagar, när efterfrågan är hög i hela Norden, kan priset ändå stiga kraftigt även här. Förbrukningen i Umeå präglas av långa, kalla vintrar. Stora delar av staden har fjärrvärme, medan villor i ytterområden och i tätorter som Holmsund och Sävar ofta värms med värmepump eller direktverkande el. Där blir det extra värdefullt att flytta förbrukningen till dygnets billigaste kvartar under vinterhalvåret.',
    commonGridCompanies:
      'I Umeå är det Umeå Energi Elnät som ansvarar för elnätet i centralorten och stora delar av kommunen. I vissa ytterområden kan ett annat nätbolag ansvara — vilket du tillhör framgår av din nätfaktura. Nätbolaget bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Varför är elen ofta billigare i Umeå än i Stockholm?',
        answer:
          'Umeå ligger i SE2 och Stockholm i SE3. I norra Sverige produceras mer el än som förbrukas, främst vattenkraft, medan södra Mellansverige har de stora förbrukningscentrumen. Överföringskapaciteten söderut är begränsad. När ledningarna är fullt belastade stannar den billiga elen i norr, och då blir priset lägre i SE2 än i SE3. När nätet inte är trångt kan priserna i stället vara nästan desamma. Skillnaden varierar alltså från dag till dag och från timme till timme.',
      },
      {
        question: 'Kan elpriset i Umeå bli högt?',
        answer:
          'Ja. SE2 har ofta låga priser, men inte alltid. Under kalla vinterperioder ökar efterfrågan i hela Norden samtidigt, och då kan priset stiga även i norr, särskilt om tillgången på vattenkraft är begränsad efter en torr period. Elvärmda villor förbrukar mest just när det är kallast. Därför gör det störst skillnad för dem att följa priset och flytta tung förbrukning till billigare kvartar under vintern.',
      },
    ],
  },
  uppsala: {
    slug: 'uppsala',
    publishedAt: '2026-10-01',
    name: 'Uppsala',
    area: 'SE3',
    region: 'Uppsala län',
    uniqueIntro:
      'Uppsala är Sveriges fjärde största kommun och tillhör elområde SE3 — samma område som Stockholm och Göteborg. Spotpriset i Uppsala är därför detsamma som i Stockholm vid samma tidpunkt. Uppsala har däremot blivit känt för en annan elfråga: brist på kapacitet i elnätet. Elnätets utbyggnad har inte hållit takt med den ökade elanvändningen, främst i transmissionsnätet som är stommen för alla elnät. Kommunen, regionen och nätbolaget samarbetar därför kring lösningar som batterilager och flexibel elanvändning, under namnet Uppsalaeffekten. Bristen handlar om hur mycket effekt nätet klarar att leverera samtidigt, inte om priset per kilowattimme. Förbrukningen i Uppsala är blandad. Stora delar av staden värms med fjärrvärme, och den stora studentbefolkningen bor ofta i mindre lägenheter med låg elförbrukning. I villaområden och i tätorter som Storvreta och Björklinge är värmepumpar och elvärme vanligare. Där gör det skillnad att flytta tung förbrukning till dygnets billigaste kvartar.',
    commonGridCompanies:
      'I Uppsala är det Vattenfall Eldistribution som ansvarar för elnätet i huvuddelen av kommunen. Vilket nätbolag du tillhör bestäms av var du bor och går inte att välja själv, till skillnad från elhandelsbolaget. Nätavgiften bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Gör elnätsbristen i Uppsala elen dyrare?',
        answer:
          'Nej, inte spotpriset. Spotpriset sätts per elområde, och Uppsala har samma spotpris som Stockholm och resten av SE3 vid samma tidpunkt. Kapacitetsbristen handlar om hur mycket effekt elnätet klarar att leverera samtidigt. Den påverkar framför allt möjligheten att ansluta nya stora förbrukare, som industrier, fastigheter och laddinfrastruktur. Det är därför kommunen och nätbolaget satsar på batterilager och på att få stora förbrukare att flytta sin förbrukning när nätet är som mest belastat. Din elräkning består dessutom av nätavgift, som sätts av nätbolaget, och den kan förändras över tid oberoende av spotpriset.',
      },
      {
        question: 'Kan jag som hushåll i Uppsala hjälpa elnätet?',
        answer:
          'Ja, och ofta tjänar du på det själv. Elnätet är som mest belastat när många förbrukar samtidigt, typiskt vardagskvällar under vintern. Det är också då spotpriset ofta är som högst. Om du flyttar tung förbrukning som elbilsladdning, tvätt och disk till natten eller mitt på dagen avlastar du nätet. Har du kvarts- eller timpris sänker du samtidigt din egen kostnad. Med rörligt månadspris betalar du ett snittpris oavsett när du förbrukar, men belastningen på nätet minskar ändå.',
      },
    ],
  },
  varberg: {
    slug: 'varberg',
    publishedAt: '2026-05-20',
    updatedAt: '2026-08-27',
    name: 'Varberg',
    area: 'SE3',
    region: 'Hallands län',
    uniqueIntro:
      'Varberg är Hallands tredje största kommun med drygt 65 000 invånare och en av västkustens viktigaste hamnstäder. Staden tillhör elområde SE3 — samma område som Stockholm och Göteborg — och är den sydligaste SE3-staden i Halland innan elprisgränsen till SE4 vid Falkenberg. Det innebär att Varberg ofta har 20–40 % lägre spotpris än Halmstad bara 50 kilometer söderut. Varberg har en blandad förbrukningsprofil: tät stadsbebyggelse med fjärrvärme i centrum, eluppvärmda villor i kustområden som Apelviken och Träslövsläge, samt industri och hamnverksamhet. SE3-tillhörigheten gör smart styrning av värmepump, tvätt och elbilsladdning extra värdefull — du kan utnyttja både dygnsmönster och regionala prisskillnader.',
    commonGridCompanies:
      'Bland de större nätbolagen i Varberg finns Varberg Energi och Varbergsortens Elkraft, beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
    uniqueFaqs: [
      {
        question: 'Vilket elområde tillhör Varberg?',
        answer:
          'Varberg tillhör elområde SE3, samma område som Göteborg och Stockholm. Det är den sydligaste SE3-staden i Halland — Falkenberg och Halmstad strax söderut tillhör SE4. Halland är ett av Sveriges tydligaste exempel på att elprisområden inte följer länsgränser.',
      },
      {
        question: 'Är elen billigare i Varberg än i Falkenberg?',
        answer:
          'Ja, ofta. Varberg tillhör SE3 och Falkenberg tillhör SE4, trots att städerna ligger knappt 30 kilometer ifrån varandra. SE4 har konsekvent högre spotpris än SE3 — typiskt 20–40 % mer för samma timme. Skillnaden beror på begränsad överföringskapacitet i elnätet och kopplingen till europeiska elnätet via Tyskland och Polen.',
      },
    ],
  },
};
