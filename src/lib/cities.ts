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
          'Kungsbacka tillhör SE3 (Mellansverige). Gränsen mellan SE3 och SE4 går söder om Halland, så även om Kungsbacka geografiskt ligger ganska långt söderut räknas det till SE3.',
      },
      {
        question: 'Kan elpriset i Kungsbacka skilja sig från elpriset i Göteborg?',
        answer:
          'Nej, spotpriset är identiskt. Båda städerna tillhör SE3 och får samma timpris från Nord Pool. Det som kan skilja sig är nätavgiften (sätts av lokalt nätbolag) och eventuella påslag från elhandelsbolaget.',
      },
    ],
  },
};
