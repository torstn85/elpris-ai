---
name: elpris-content-writing
description: "Använd denna skill när du skriver eller uppdaterar elpris.ai-artiklar (guideartiklar, pillar pages, FAQ-sektioner, meta-texter, intro-stycken). Triggers: 'skriv artikel', 'ny guide', 'pillar page', 'uppdatera artikel', 'utöka', 'omformulera', 'FAQ', 'meta description', 'meta title', 'frontmatter'. Använd elpris-facts.skill PARALLELLT för fakta-verifiering."
---

# Skrivregler för elpris.ai-innehåll

Etablerad redaktionell identitet sedan v1.9-v1.14. Konsekvent tonalitet är vår SEO-fördel och differentiator från konkurrenter (Vattenfall, Tibber, Compricer).

## Kärnvärden i tonen

| Vad vi ÄR | Vad vi INTE är |
|---|---|
| Pedagogiska | Säljiga |
| Ärliga om osäkerheter | Tvärsäkra |
| Funktionsbaserade | Produktrekommenderande |
| Konkreta | Vaga generaliseringar |
| Substantiella | Tunna SEO-magnets |

## Inga varumärken eller produktrekommendationer

**Princip (etablerad v1.13):** Inga varumärken eller produktrekommendationer i artiklar — undantag endast vid formaliserade affiliate-avtal.

✅ KORREKT: "luft/vatten-värmepump med hög årsvärmefaktor"
❌ FEL: "NIBE F2120"

✅ KORREKT: "värmestyrning som svarar på spotpris"
❌ FEL: "Ngenic Tune"

✅ KORREKT: "smart laddbox med dynamisk lastbalansering"
❌ FEL: "Easee Home"

**Skäl:** Funktionsbaserat innehåll åldras inte. Produktnamn kräver underhåll och kan vilseleda när modeller byts ut.

## Öppen formulering för aktörer

När vi pratar om olika aktörer (nätbolag, elavtals-jämförare, mätare):

✅ KORREKT: "Bland de större nätbolagen finns X och Y..."
❌ FEL: "X är det dominerande nätbolaget..."

✅ KORREKT: "Flera elavtals-jämförare visar aktuella priser..."
❌ FEL: "Compricer är den ledande jämförelse-tjänsten..."

## Faktabasering — alltid med kontext

**Procentsiffror om elräkningen är pedagogiskt fel som "fakta".** Procentsatserna varierar med spotpriset.

✅ KORREKT: "Vid ett spotpris på 80 öre/kWh utgör elhandelsdelen omkring 40 % av räkningen."
❌ FEL: "40 % av räkningen är elhandel."

**Skattefakta måste verifieras mot Skatteverket** (se elpris-facts.skill).

**Tekniska fakta måste verifieras mot officiella källor** (SVK för stödtjänster, elomraden.se för elområden, etc).

## Längd-mål per innehållstyp

| Typ | Mål-längd |
|---|---|
| FAQ-svar | 50-150 ord |
| H2-stycke i guideartikel | 150-400 ord |
| Vanlig guideartikel | 1500-2500 ord (kropp + FAQ) |
| Pillar page | 2500-3500 ord |
| Meta description | Max 160 tecken (mål: 140-150) |
| Meta title | Max 60 tecken (mål: 50-58) |
| Stadssida intro | ~110 ord |

## SEO-strukturella krav

Alla guideartiklar måste ha:
- **Meta title** med målfras först
- **Meta description** med målfras inom första 100 tecken
- **H1** (genereras från title — inte explicit)
- **H2-sektioner** i logisk progression
- **FAQ-block** i frontmatter (`faqs:` array) — auto-renderas till FaqAccordion + FAQPage JSON-LD
- **Internlänkar** ut till relaterade artiklar (3-7 stycken)
- **updatedAt-datum** uppdateras vid större ändringar

## Pillar page-specifika krav

Pillar pages (typ "Energieffektivisera villan") följer dessa extra regler:

- Minst 2500 ord
- 8-12 H2-sektioner
- Inbäddade dynamic-komponenter (LivePriceWidget + minst 1 till)
- ROI- eller jämförelse-tabell där relevant
- 5+ backlänkar IN från relaterade artiklar (kritiskt för topical authority)
- 7+ internlänkar UT till djupguider
- Indexering-begäran samma dag som publicering

## Iterativ kvalitetspolering

Etablerad lärdom (v1.14, pillar page): Iterera utkast snarare än sträva efter perfekt första försök.

**Process:**
1. Första utkast — fokus på struktur och koppling
2. Bjud in feedback från Torsten ("är detta okej?")
3. Iterera 2-5 gånger på specifika delar
4. Backlänkar och meta-optimering sist

## FAQ-utformning — målfras-strategi

Bra FAQ-frågor speglar verkliga sökord:

✅ KORREKT (matchar sökord): "När är det billigast att tvätta?"
❌ FEL (för formell): "Vilka tider på dygnet rekommenderas för tvätt?"

✅ KORREKT: "Får jag tvätta nattetid?"
❌ FEL: "Är det tillåtet att använda tvättmaskin under nattetid?"

**Svaret ska:**
- Svara direkt i första meningen (snippet-vänligt)
- Vara 50-150 ord
- Bygga på faktagrund (med kontext, inte gissning)
- Länka vidare om relevant (max 1 länk per FAQ-svar)

## Backlänkar — naturligt inflätade

När vi länkar från artikel A till artikel B:

✅ KORREKT: "...läs mer i vår guide om hur du [energieffektiviserar villan](/guider/spara-el/energieffektivisera-villa) för konkreta åtgärder."
❌ FEL: "[Klicka här](/guider/spara-el/energieffektivisera-villa)"
❌ FEL: "Läs mer: [Energieffektivisera villan](/guider/spara-el/energieffektivisera-villa)" (för påklistrat)

**Regler:**
- Max 1 backlänk per artikel mot samma destination (vi sprider inte spam)
- Ankartext beskrivande (matchar destination-sidans content)
- Inflätat i naturlig löpande text — inte påklistrat
- Max 7 backlänkar UT per artikel totalt (annars späds länkjuice)

## Meta-text-mallar

**Meta title-mallar (utan suffix — `| elpris.ai` läggs på automatiskt via template, se sektionen "Title-arkitektur" nedan):**
- Guide: "[Mål-fras] [år] – [vinkel]"
  - Ex: "Energieffektivisera villan 2026 – spara mest"
- Stadssida: "Elpris timme för timme i [Stad]"

**Meta description-mall:**
"[Mål-fras-svar i 1 mening]. [Konkret nytta i 1 mening]. [Call-to-action eller löfte]."

Exempel: "Här ser du aktuellt elpris timme för timme i Halmstad. Spotpriset är samma i hela SE4 men de exakta priserna varierar över dygnet. Planera tvätt och elbilsladdning efter de billigaste timmarna."

## Title-arkitektur (etablerad v1.14+)

`src/app/layout.tsx` innehåller en `title.template: '%s | elpris.ai'` som automatiskt suffixar alla barnsidors metadata.title med `| elpris.ai`.

**Regler:**

- **Barnsidors `metadata.title`**: skriv BARA den unika delen — INTE med `| elpris.ai`-suffix
- **`openGraph.title` och `twitter.title`**: BEHÅLL `| elpris.ai`-suffix (sociala kort visas isolerat utan domänkontext)
- **`layout.tsx` default-title**: behåll varumärket explicit ("elpris.ai — Realtidspriser...")
- **MDX frontmatter `metaTitle`**: skriv utan suffix — det läggs på automatiskt via template

**Exempel — KORREKT:**

```typescript
// src/app/elpris-idag/page.tsx
export const metadata: Metadata = {
  title: 'Elpriset idag — Sveriges fyra elområden',  // ✅ ren — template lägger på suffix
  openGraph: {
    title: 'Elpriset idag — Sveriges fyra elområden | elpris.ai',  // ✅ behåll suffix
  },
  twitter: {
    title: 'Elpriset idag — Sveriges fyra elområden | elpris.ai',  // ✅ behåll suffix
  },
};
```

**Exempel — FEL (dubblering vid render):**

```typescript
export const metadata: Metadata = {
  title: 'Elpriset idag — Sveriges fyra elområden | elpris.ai',  // ❌ blir "... | elpris.ai | elpris.ai"
};
```

**Dynamiska titles (template literals):**

För dynamiska sidor (stadssidor, områden, guider) — samma regel:

```typescript
// Stadssida [stad]/page.tsx
title: `Elpris idag i ${name} — timme för timme`,  // ✅ ren

// Områdessida [area]/page.tsx
title: `Elpris ${meta.name} — Spotpris ${meta.city} & ${meta.region}`,  // ✅ ren

// Guidekategori [kategori]/page.tsx
title: `${label} – guider`,  // ✅ ren
```

**MDX-frontmatter:**

```yaml
---
metaTitle: 'Energieffektivisera villan 2026 – spara mest'  # ✅ ren, ingen | elpris.ai
title: '...'
---
```

**Tumregel vid varje ny sida/artikel:** Om din `title` redan slutar på `| elpris.ai` har du gjort fel — ta bort suffix.

## Frontmatter-template för ny artikel

```yaml
---
title: '[Meta title]'
description: '[Meta description]'
category: '[spara-el | elavtal | forsta-elpriset | teknik-och-trender]'
slug: '[url-slug]'
publishedAt: '2026-MM-DD'
updatedAt: '2026-MM-DD'
author: 'elpris.ai-redaktionen'
faqs:
  - question: '[Fråga 1]'
    answer: '[Svar 1]'
  - question: '[Fråga 2]'
    answer: '[Svar 2]'
---
```

## Vanliga skriv-fallgropar (etablerade lärdomar)

| Fallgrop | Korrekt hantering |
|---|---|
| Säljig ton | Skriv som om du förklarar för en intresserad granne |
| Tvärsäkra påståenden om framtiden | "Sannolikt", "tenderar att", "historiskt har..." |
| Repetition mellan intro och första H2 | Intro ger kontext, första H2 går direkt till substans |
| Lösa siffror utan kontext | Alltid "vid X spotpris..." eller "typiskt..." eller "i snitt..." |
| Påklistrade länkar i botten | Inflätade naturligt i löpande text |
| Tunna FAQ-svar (under 50 ord) | Bygg ut med kontext eller ta bort frågan |
