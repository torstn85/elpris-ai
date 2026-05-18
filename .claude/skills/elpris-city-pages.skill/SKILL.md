---
name: elpris-city-pages
description: "Använd denna skill när elpris.ai-arbete involverar stadssidor (ny stadssida, uppdatera befintlig, lägga till stad i ett område). Triggers: 'stadssida', 'ny stad', 'lägg till X (stadnamn)', 'city page', 'elpris-idag/[stad]', 'cities.ts', 'Halland-klustret', 'utöka kluster', 'Varberg' (eller annan stad). Denna skill täcker tekniskt workflow + innehållsmall. Använd elpris-facts.skill PARALLELLT för fakta-verifiering."
---

# Stadssidor på elpris.ai — workflow och mall

Stadssidor är vår starkaste återkommande tillväxtmekanism. Halland-klustret (Kungsbacka, Halmstad, Falkenberg, Laholm, Båstad) bevisade modellen i v1.14. Nästa steg är att skala till fler regioner i veckotakt.

## Arkitektur — config-driven (KRITISKT)

| Komponent | Sökväg | Roll |
|---|---|---|
| Data (single source of truth) | `src/lib/cities.ts` | Innehåller alla städer som CITIES-objekt |
| Dynamic route | `src/app/elpris-idag/[stad]/page.tsx` | Auto-genererar sida per stad |
| Sitemap-integration | `src/app/sitemap.ts` | Auto-inkluderar via `getCityEntries()` |
| Internlänkning | `src/app/elomrade/[area]/page.tsx` | "Städer i {meta.name}"-sektion auto-renderar från CITIES |
| "Andra städer i samma område" | `src/app/elpris-idag/[stad]/page.tsx` | `EXAMPLE_CITIES_BY_AREA`-konstant |

**REGEL: Lägg ALDRIG till en ny stadssida som ny fil.** Allt sker via redigering av `cities.ts`.

## Workflow för ny stad — exakta steg

### Steg 1: Verifiera elområde (OBLIGATORISKT)

Verifiera staden mot **elomraden.se**. Sök på en gatuadress i staden. Kontrollera:
- Vilket elområde (SE1/SE2/SE3/SE4)?
- Vilka nätbolag (vi använder dem öppet, inte exklusivt — se elpris-facts.skill)?

**Vid osäkerhet om lokal geografi (särskilt Halland-området):** be Torsten verifiera. Vi hade en SE3/SE4-faktabugg på Kungsbacka som upptäcktes manuellt — sådana fel kan inte upprepas.

### Steg 2: Skriv innehåll enligt mall

Varje stad behöver dessa fält:

```typescript
{
  slug: 'stadnamn',           // utan å/ä/ö (ex: 'bastad' inte 'båstad')
  name: 'Stadnamn',           // visningsnamn med svenska tecken
  area: 'SE3' | 'SE4',        // verifierat mot elomraden.se
  region: 'Halland',          // län eller landskap
  uniqueIntro: '...',         // ~100-120 ord stadsspecifik intro
  commonGridCompanies: '...', // text om nätbolag (öppen formulering)
  uniqueFaqs: [               // 2 unika FAQ-frågor minimum
    { question: '...', answer: '...' },
    { question: '...', answer: '...' },
  ],
}
```

### Steg 3: Skicka Claude Code-prompt enligt format (se elpris-claude-code-prompting-pattern nedan)

### Steg 4: Verifiera lokalt + pusha

- `npm run build` (verifiera att TS-typer matchar)
- Testa lokalt: `localhost:3000/elpris-idag/[slug]`
- Verifiera att stadssidan dyker upp i `/elomrade/[area]` under "Städer i..."-sektion
- Pusha till GitHub → Vercel auto-deploy
- Begär manuell indexering i Search Console (max 10 URL:er/dag)

## Innehållsmall — uniqueIntro (~110 ord)

**Struktur:**
1. Stad + geografi + region (1 mening)
2. Elområde-tillhörighet + prisjämförelse mot andra elområden (1-2 meningar)
3. Lokal förbrukningsprofil (eluppvärmda villor, kustkommun, säsongsvariation etc) (1-2 meningar)
4. SEO-vinkel: smart styrning extra värdefull HÄR pga prisspridning/SE4-premium (1 mening)

**Exempel (Halmstad):**
> "Halmstad är Hallands största stad med drygt 108 000 invånare och fungerar som regionens centrala knutpunkt. Staden tillhör elområde SE4, Sveriges sydligaste elprisområde. Halmstad har en blandad förbrukningsprofil: tät stadsbebyggelse med fjärrvärme i centrum, eluppvärmda villor i förorter som Söndrum, Vallås och Frösakull, samt industri som bidrar till hög dagtidsförbrukning. SE4 har konsekvent högre spotpris än Stockholm och Göteborg — typiskt 20–40 % mer för samma timme. Det innebär att smart styrning av värmepump, tvätt och elbilsladdning är extra värdefull i Halmstad. Kvällarna kl 17–20 är ofta upp till tre gånger dyrare än nätter kl 02–05 — och i SE4 svider den skillnaden mer än norrut."

## Innehållsmall — commonGridCompanies

**Format:**
> "Bland de större nätbolagen i [stad] finns [bolag A] och [bolag B], beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här."

**REGEL:** Alltid "bland de större... finns" — aldrig "X är det dominerande". Nätmarknaden förändras.

## Innehållsmall — uniqueFaqs

Minst 2 frågor per stad. Bra mönster:

**Fråga 1 (alltid):** "Vilket elområde tillhör [stad]?"
- Svar förklarar elområdet + närliggande städer i samma område + om-relevant prisskillnad mot andra elområden

**Fråga 2 (variera per stad):** Lokalt relevant fråga, t.ex.:
- "Är elen dyrare i [stad] än i [grannstad]?" (om elområdesskillnad)
- "När är elen billigast i [stad]?" (generella tider för dygnsmönster)
- "Varför är elen dyrare i [stad] än i [nordligare stad]?" (om SE4)
- "Hur mycket kan jag spara genom att flytta elförbrukning?" (besparingsmotivation)

## Auto-genererat per stad (inga manuella ändringar krävs)

✅ URL `/elpris-idag/{slug}`
✅ Metadata (title, description, canonical)
✅ JSON-LD Article + Breadcrumb + FAQPage
✅ Sitemap-entry med priority 0.9
✅ FAQ-accordion via FaqAccordion-komponenten
✅ Listning på `/elomrade/[area]` i "Städer i SE3/SE4"-sektion
✅ Pre-rendering vid build

## EXAMPLE_CITIES_BY_AREA — utöka, ej ersätta

Filen: `src/app/elpris-idag/[stad]/page.tsx`

När ny stad läggs till:
- **Lägg till** stadens namn i rätt elområdes-array
- **Behåll** befintliga stora referensstäder (Stockholm, Göteborg, Malmö, Helsingborg etc)
- Detta visar "andra städer i samma elområde" på stadssidan

## Claude Code-prompt-format för ny stad

```
Lägg till stadssida för [stad] i src/lib/cities.ts.

Verifiering klar:
- Elområde: [SE3/SE4]
- Nätbolag (öppen formulering): [bolag A], [bolag B]
- Slug: [slug utan å/ä/ö]

Lägg till följande objekt i CITIES (alfabetisk ordning):

[stad_slug]: {
  slug: '[slug]',
  name: '[Namn]',
  area: '[SE3/SE4]',
  region: '[Region]',
  uniqueIntro: '[~110 ord]',
  commonGridCompanies: 'Bland de större nätbolagen i [stad] finns [A] och [B], beroende på var i kommunen du bor. Nätavgiften du betalar bestäms av ditt nätbolag och kommer utöver spotpriset du ser här.',
  uniqueFaqs: [
    {
      question: '[Q1]',
      answer: '[A1]',
    },
    {
      question: '[Q2]',
      answer: '[A2]',
    },
  ],
},

OCKSÅ: Utöka EXAMPLE_CITIES_BY_AREA i src/app/elpris-idag/[stad]/page.tsx genom att lägga till '[stadnamn]' i rätt area-array. Ta INTE bort befintliga städer.

VERIFIERING:
1. Kör npm run build
2. Verifiera att stadssidan pre-renderas
3. Visa det relevanta kod-blocket i terminalen

GÖR INTE:
- Ändra route-logik
- Ändra sitemap.ts (auto-uppdateras)
- Pusha till GitHub — vi testar lokalt först
```

## Nästa städer i prioriteringsordning

Baserat på Search Console-data + arkitektur-balans:

1. **Varberg** (SE3, Halland) — sista större Halland-staden, naturlig SE3-utbyggnad
2. **Helsingborg** (SE4, Skåne) — stor SE4-stad, hög sökvolym
3. **Malmö** (SE4, Skåne) — Sveriges 3:e största stad
4. **Lund** (SE4, Skåne) — studentstad, hög elförbrukning per capita
5. **Göteborg** (SE3, Västra Götaland) — Sveriges 2:a största, naturlig SE3-utbyggnad

3-5 städer per vecka är hållbar takt.
