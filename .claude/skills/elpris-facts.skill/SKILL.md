---
name: elpris-facts
description: "Använd denna skill när elpris.ai-innehåll involverar fakta om svenska elprisområden (SE1-SE4), nätbolag, skatteregler (energiskatt, Grön teknik-avdrag, ROT), Halland-geografi, eller andra auktoritativa siffror som ofta blir fel. Triggers: 'Grön teknik', 'ROT', 'avdrag', 'skatt', 'energiskatt', 'moms', 'elområde', 'SE3', 'SE4', 'Halland', 'nätbolag', 'nätavgift', 'spotpris', 'skattenivå'. Använd INTE för generiska elpris-frågor (då räcker det med projektplan-kontext)."
---

# Auktoritativa fakta för elpris.ai

Dessa fakta måste alltid vara korrekta. Vi har historiskt gjort fel på dem flera gånger och det skadar trovärdigheten omedelbart.

## Princip: verifiera mot officiella källor

| Fakta-typ | Källa |
|---|---|
| Energiskatt, ROT, Grön teknik | Skatteverket (skatteverket.se) |
| Elområden per stad | elomraden.se |
| Stamnät, kapacitet, prisgeografi | Svenska kraftnät (svk.se) |
| Stödtjänster (FCR, aFRR, mFRR, FFR) | SVK officiella indelning |
| Lokal geografi-fakta | Lokalkunskap + flera källor |

**Vid osäkerhet: be Torsten verifiera mot en av dessa källor INNAN textförslag levereras.**

## Grön teknik-avdrag (kritisk — sprider sig snabbt om fel)

| Åtgärd | Avdrag | Notering |
|---|---|---|
| Solcellssystem | **15 %** | Av arbete + material |
| Hembatteri / lagringssystem | **50 %** | Kräver egen elproduktion (i praktiken solceller) |
| Laddningspunkter för elfordon | **50 %** | Av arbete + material |

**Regler:**
- Maxbelopp: **50 000 kr per person och år**, gemensamt med andra Grön teknik-installationer
- Avdraget gäller **arbete + material** — INTE projektering, frakt eller andra kringkostnader
- Avdrag dras direkt på fakturan av installatören (privatperson behöver inte ansöka)
- ROT-avdrag och Grön teknik kan INTE kombineras på SAMMA åtgärd

**KRITISK regel — exakta belopp:**

Skriv ALDRIG exakta kr-belopp för Grön teknik-besparing. Installatörens offert innehåller ofta projektering/frakt som inte är avdragsgill, så "50 % rabatt på 100 000 kr = 50 000 kr sparat" är missvisande.

✅ KORREKT: "Avdraget täcker en betydande del av installationskostnaden, men gäller bara arbete och material."
❌ FEL: "På en 100 000 kr installation sparar du 50 000 kr."

## Energiskatt 2026

- **36 öre/kWh exkl moms** (45 öre/kWh inkl moms)
- Skatten sänktes **1 januari 2026** från 53,5 öre/kWh
- Vissa kommuner och industri kan ha reducerad nivå — hänvisa till Skatteverket för exakt nivå

## SE3/SE4-gränsen genom Halland (kritisk lokal geografi)

Sveriges tydligaste exempel på elprisgeografi som INTE följer länsgränserna.

| Stad | Elområde | Notering |
|---|---|---|
| **Kungsbacka** | SE3 | Nordligaste Halland — gränsstad till SE3 |
| **Varberg** | SE3 | Mellersta Halland — SE3:s sydligaste utpost |
| **Falkenberg** | SE4 | SE3/SE4-gränsen går norr om Falkenberg |
| **Halmstad** | SE4 | Mellersta södra Halland |
| **Laholm** | SE4 | Sydligaste Halland |
| **Båstad** | SE4 | Skåne län, men sammanhängande med södra Halland |

**Tonalitet i text:** "Halland är delat mellan SE3 och SE4 — gränsen går mellan Varberg och Falkenberg. Det är ett av Sveriges tydligaste exempel på elprisgeografi som inte följer länsgränser."

**Prisskillnad SE3 vs SE4:** SE4 har konsekvent 20-40 % högre spotpris än SE3 för samma timme. Skäl: begränsad överföringskapacitet från norr, koppling till europeiska elnätet via Tyskland och Polen.

## Elnätsbolag — alltid öppen formulering

Vi vet INTE alltid om de nätbolag vi hittar via elomraden.se är de enda i kommunen. Nätmarknaden förändras också. Därför använder vi alltid öppen formulering:

✅ KORREKT: "Bland de större nätbolagen i [stad] finns X och Y, beroende på var i kommunen du bor."
❌ FEL: "X är det dominerande nätbolaget i [stad]."

Detta håller framtidssäkert och är ärligare.

## Inga varumärken / produktrekommendationer

Etablerad princip (v1.13): Inga varumärken eller produktrekommendationer i artiklar — undantag bara vid formaliserade affiliate-avtal.

**Skriv funktionsbaserat:**
- ✅ "Värmestyrning som svarar på spotpris"
- ❌ "Ngenic Tune"
- ✅ "Luft/vatten-värmepump med hög årsvärmefaktor"
- ❌ "NIBE F2120"

## Stödtjänster (för hembatteri-kontext)

Svenska kraftnäts officiella indelning:
- **FCR-N** (frekvenshållning normal)
- **FCR-D upp/ned** (frekvenshållning störning)
- **aFRR** (automatisk frekvensåterställning)
- **mFRR** (manuell frekvensåterställning)
- **FFR** (snabb frekvensreserv)

Använd dessa exakta termer, inte egna förenklingar.

## Vanliga fakta-fallgropar (etablerade lärdomar)

| Fall | Korrekt hantering |
|---|---|
| Skatte-procentsatser för elräkningen | Variera med spotpriset — presentera ALLTID med kontext, aldrig som konstant fakta |
| Energiskatt | Kontrollera senaste nivån mot Skatteverket vid varje större artikel-uppdatering |
| "Halland" som elprisområde | Halland är delat — fråga alltid VILKEN stad |
| Specifika nätbolag | Använd "bland de större finns..." istället för att lista som auktoritativt |
| Exakta kr-belopp i Grön teknik-räkneexempel | Använd "betydande del av kostnaden" istället |
