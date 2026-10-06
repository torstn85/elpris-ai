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
- Isolering, fönster, värmepump och FTX ger ROT-avdrag, inte Grön teknik. Payback-formel: offert efter avdrag (ROT eller Grön teknik) ÷ årligt mervärde.

**KRITISK regel — exakta belopp:**

Skriv ALDRIG exakta kr-belopp för Grön teknik-besparing. Installatörens offert innehåller ofta projektering/frakt som inte är avdragsgill, så "50 % rabatt på 100 000 kr = 50 000 kr sparat" är missvisande.

✅ KORREKT: "Avdraget täcker en betydande del av installationskostnaden, men gäller bara arbete och material."
❌ FEL: "På en 100 000 kr installation sparar du 50 000 kr."

## Energiskatt 2026

- **36 öre/kWh exkl moms** (45 öre/kWh inkl moms)
- Skatten sänktes **1 januari 2026**. Jämförelsenivå 2025: **43,9 öre/kWh exkl. moms (54,9 öre inkl. moms)**. 2024 var 42,8 / 53,5 — använd 2025 som jämförelse när sänkningen 2026 beskrivs. Källa: Skatteverket.
- Vissa kommuner och industri kan ha reducerad nivå — hänvisa till Skatteverket för exakt nivå
- **Nedsatt energiskatt 2026:** avdrag 9,6 öre/kWh → **26,4 öre/kWh exkl. moms (33 öre inkl. moms)** för hushåll i: samtliga kommuner i Norrbottens, Västerbottens och Jämtlands län; Västernorrlands län: Sollefteå, Ånge, Örnsköldsvik; Gävleborgs län: Ljusdal; Värmlands län: Torsby; Dalarnas län: Malung-Sälen, Mora, Orsa, Älvdalen. Gäller inte industri, jord- och skogsbruk. Källor: Skatteverket och Energimarknadsbyrån.
- **Totalpris i räkneexempel:** Räkneexempel ska använda totalt inköpspris (spot + påslag + energiskatt + rörlig nätavgift + moms). Energiskatten ensam är 45 öre/kWh inkl. moms (33 öre i kommuner med nedsatt energiskatt) — ett totalpris runt 0,50 kr/kWh är därför orimligt även i norr, eftersom nätavgift och påslag tillkommer.

## Skattereduktion för mikroproduktion (såld solel)

- Skattereduktionen på **60 öre/kWh** för såld solel är **slopad från 1 januari 2026** (riksdagsbeslut)
- Källa: Skatteverket, "Mikroproduktion av förnybar el"

## Effekttariffer — status

- Ei:s krav på effekttariff senast 1 januari 2027 är **stoppat av regeringen**. Ei har fått i uppdrag att upphäva föreskrifterna och ta fram en ny modell.
- Fram till dess väljer **varje elnätsbolag själv** om det tar ut effektavgift.
- Skriv ALDRIG "brett införda", "de flesta elnätsbolag" eller "obligatoriskt" om effekttariffer.
- Källa: Energimarknadsbyrån, "Effekttariffer"

## Batterilager — Boverkets 20 kWh-regel

- Stationära batterilager **över 20 kWh** som installeras **inomhus** ska placeras i **egen brandcell**.
- Utomhusbatterier godkända för utomhusbruk är undantagna.
- I kraft **1 juli 2025**, övergångsperioden slut **30 juni 2026**.
- Skriv inte "enkelt" om batterier under 20 kWh. Korrekt formulering: "kräver ingen egen brandcell".
- Behörig elinstallatör krävs oavsett storlek.
- Källa: Boverkets byggregler

## Nord Pool och prisbildning (kritisk — orsakade fel i två guideartiklar)

Spotpriset **sätts en gång per dygn** i day-ahead-auktionen på Nord Pool — inte löpande under dagen.

- Buden stänger **12:00**, priserna publiceras runt **13:15** (INTE 13:00)
- Sedan **oktober 2025** anges priset i **15-minutersintervall** — 96 nivåer per dygn i stället för 24

**KRITISK distinktion:** 15 minuter är prisets **upplösning**, inte hur ofta priset räknas om. Hela nästa dygn fastställs i en enda auktion.

❌ FEL: "priset sätts / bestäms / uppdateras var 15:e minut på Nord Pool"
✅ KORREKT (prisbildning): "priset sätts en gång per dygn i day-ahead-auktionen och anges i 15-minutersintervall"
✅ KORREKT (data): "priserna på sajten uppdateras var 15:e minut" — beskriver datahämtning/visning, inte prisbildning

**Modelltext för distinktionen:** `src/content/guider/elavtal/kvartspris-vs-timpris.mdx` och `src/content/guider/forsta-elpriset/nord-pool-forklarat.mdx` formulerar skillnaden korrekt — följ dem.

## Avtalstyp och flytt av förbrukning

- Att flytta förbrukning till billiga timmar/kvartar ger besparing bara med **kvarts- eller timprisavtal**.
- Med **rörligt månadspris** betalar du ett snittpris oavsett när du förbrukar.
- Skriv ALDRIG "rörligt elavtal" som förutsättning för att flytta förbrukning eller för batteri-arbitrage.

## SE3/SE4-gränsen genom Halland (kritisk lokal geografi)

Sveriges tydligaste exempel på elprisgeografi som INTE följer länsgränserna.

| Stad | Elområde | Notering |
|---|---|---|
| **Kungsbacka** | SE3 | Nordligaste Halland — tillhör SE3 (samma elområde som Göteborg), norr om SE3/SE4-gränsen |
| **Varberg** | SE3 | Mellersta Halland — SE3:s sydligaste utpost |
| **Falkenberg** | SE4 | SE3/SE4-gränsen går norr om Falkenberg |
| **Halmstad** | SE4 | Mellersta södra Halland |
| **Laholm** | SE4 | Sydligaste Halland |
| **Båstad** | SE4 | Skåne län, men sammanhängande med södra Halland |

**Tonalitet i text:** "Halland är delat mellan SE3 och SE4 — gränsen går mellan Varberg och Falkenberg. Det är ett av Sveriges tydligaste exempel på elprisgeografi som inte följer länsgränser."

**Prisskillnad SE3 vs SE4:** SE4 har ofta högre spotpris än SE3. Skillnaden är störst när överföringen söderut är fullt belastad; när nätet inte är trångt kan priset vara detsamma. Skriv ALDRIG "konsekvent" eller fasta procentintervall som "20–40 %" utan källa och räknesätt. Skäl till skillnaden: begränsad överföringskapacitet från norr, koppling till europeiska elnätet via Tyskland och Polen.

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
| "Priset sätts/bestäms/uppdateras var 15:e minut på Nord Pool" | Fel — priset sätts EN gång/dygn i day-ahead. 15 min = upplösning. Se "Nord Pool och prisbildning" |
| Publiceringstid för day-ahead-priser | Runt **13:15** (inte 13:00); buden stänger 12:00 |
