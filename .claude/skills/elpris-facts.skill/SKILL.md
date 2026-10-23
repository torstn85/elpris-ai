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
- **Undantag — Elduellen och chatbotens kostnadsverktyg:** Elduellen och chatbotens `calculate_cost` (src/lib/costTool.ts) räknar kostnad som kWh × (dagens spot + energiskatt) × 1,25, med nedsatt energiskatt för städer med `reducedEnergyTax` i cities.ts, märkt "exkl. nätavgift och elhandlarens påslag". Inga påhittade belopp för nätavgift eller påslag — chatten säger att de tillkommer och varierar mellan bolag. Gäller bara dessa två — övriga räkneexempel använder totalt inköpspris.

## Skattereduktion för mikroproduktion (såld solel)

- Skattereduktionen på **60 öre/kWh** för såld solel är **slopad från 1 januari 2026** (riksdagsbeslut)
- Källa: Skatteverket, "Mikroproduktion av förnybar el"

## Effekttariffer — status

- Ei:s krav på effekttariff senast 1 januari 2027 är **stoppat av regeringen**. Ei har fått i uppdrag att upphäva föreskrifterna och ta fram en ny modell.
- Fram till dess väljer **varje elnätsbolag själv** om det tar ut effektavgift.
- Skriv ALDRIG "brett införda", "de flesta elnätsbolag" eller "obligatoriskt" om effekttariffer.
- Källa: Energimarknadsbyrån, "Effekttariffer"
- Godkänd formulering: "Allt fler nätbolag tar ut en effektavgift – kolla din nätfaktura." Effekttoppen mäts av nätbolaget, ofta per timme.

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
- "Priset sätts per kvart" är korrekt (varje pris gäller i 15 minuter). Förbjudet är "uppdateras var 15:e minut" och "sätts var 15:e minut".
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

## Dygnsspridning per elområde (egen data)

- Dygnsspridning = dygnets dyraste kvart minus billigaste kvart (spotpris, öre/kWh exkl. moms).
- Källa: elpris.ai:s egen prisdata (tabellen spot_prices), 14 april–12 oktober 2026, 182 dygn per område. Räknas fram med npx tsx scripts/analysis/daily-spread.ts.
- Median för dygnsspridningen: SE1 57 öre, SE2 62 öre, SE3 112 öre, SE4 160 öre.
- SE4 hade större spridning än SE3 172 av 182 dygn och högre dygnssnitt 176 av 182 dygn.
- Datan täcker bara sommarhalvåret 2026 – dra inga slutsatser om vintern utifrån just dessa siffror. Historik och vinterjämförelser: se avsnittet "Prishistorik 1 november 2021 och framåt".
- Standardformulering: "Skillnaden mellan dygnets billigaste och dyraste kvartar är oftast störst i SE4 och minst i SE1 och SE2." Med källa: "Under april–oktober 2026 var skillnaden större i SE4 än i SE3 nästan varje dygn (elpris.ai:s egen prisdata)."
- Skriv inte "volatil" eller "volatilitet". Skriv "skillnaden mellan billiga och dyra kvartar" eller "prisspridningen över dygnet".
- Spridningen spelar bara roll för den som flyttar förbrukning med kvarts- eller timprisavtal. Ett högre snittpris i ett elområde gör inte i sig flytt av förbrukning mer lönsam – det är spridningen som avgör.
- För energieffektivisering (tätning, isolering, fönster, FTX) avgörs värdet i första hand av prisnivån under de timmar huset förbrukar, inte av spridningen.
- Skriv inga fasta öreintervall för spridningen (t.ex. "ofta 30–60 öre"). Beskriv mekanismen och hänvisa till dagens diagram.
- "Arbitrage" är ett etablerat branschord och får användas, men ska förklaras i förbigående första gången det används i en text (t.ex. "arbitrage – att ladda batteriet när elen är billig och använda strömmen när den är dyr"). Det är inte en anglicism i samma mening som "spread".

## Billigaste och dyraste tider per elområde (egen data)

- Källa: elpris.ai:s egen prisdata (spot_prices), 14 april–12 oktober 2026, 182 dygn per område. Räknas fram med npx tsx scripts/analysis/cheapest-hours.ts. Fönster räknas i hela timmar på kvartspriserna och får fortsätta in i nästa dygn.
- Datan täcker bara april–oktober 2026 – inga slutsatser om vintern utifrån dessa siffror. Vinter och tidigare år: se avsnittet "Prishistorik 1 november 2021 och framåt" (före oktober 2025 finns bara timpriser, som inte jämförs med kvartspriser).
- Billigaste tvåtimmarsfönstret startade (andel dygn, natt 00–05 / mitt på dagen 10–15 / kväll 20–23): SE1 39/29/29 %, SE2 37/29/31 %, SE3 19/64/13 %, SE4 15/75/8 %.
- I SE3 och SE4 startade det billigaste fönstret mitt på dagen de allra flesta dygn i april–juni; från augusti blev natt och sen kväll allt vanligare. I SE1 och SE2 var natt och sen kväll (start runt kl 23) vanligast; mitt på dagen var vanligast bara i april.
- Dygnets dyraste timme var oftast: SE3 och SE4 kvällen kl 19–22; SE1 och SE2 morgonen kl 07–09 eller kvällen kl 18–20.
- Medianskillnad mellan dygnets dyraste och billigaste tvåtimmarsfönster, fönster får fortsätta in i nästa dygn (spotpris, öre/kWh exkl. moms): SE1 39,0, SE2 39,1, SE3 92,4, SE4 137,9. Samma värden för 1–4 timmar finns i src/lib/prices/windowSpreadStats.ts (genereras med --write). Förväxla inte med dygnsspridningen per kvart (57/62/112/160) – ange alltid vilket mått som används.
- Helg: dygnssnittet på lördagar och söndagar var ungefär hälften av vardagarnas i alla områden (SE3: ca 42 öre mot 83 öre). Skillnaden mellan billiga och dyra timmar var mindre på helger, särskilt i SE1 och SE2.
- Skriv ALDRIG fasta klockslag som regel ("billigast 00–06 och 12–14", "dyrast 07–09 och 17–20"). Använd egen data med källa och period, eller hänvisa till dagens priser.
- Elduellens kWh-antaganden (src/lib/elduellen/activities.ts) är standard för räkneexempel: kondenstork 2,5 kWh, värmepumpstork 1,2 kWh, tvätt 40 °C 0,6 kWh, tvätt 60 °C 1,0 kWh, diskmaskin eco 0,9 kWh, bastu ca 10 kWh. Avviker en guide: ange varför.

## Prishistorik 1 november 2021 och framåt (elpris.ai:s egen prisdata)

**Källa och period**
- Spotpris exkl. moms ur spot_prices (hämtat från elprisetjustnu.se, som bygger på ENTSO-E). Data från 1 november 2021.
- Upplösning: timpriser till och med 30 september 2025, kvartspriser från 1 oktober 2025.
- Saknade dygn (räknas inte i snitt): SE2 2022-09-04, 2022-09-10, 2022-09-15, 2022-10-20 · SE3 2021-11-04.
- Beräkning: scripts/analysis/history-stats.ts. Sidan läser vyerna spot_prices_daily och spot_prices_monthly.

**Mått**
- Månads-, års- och säsongssnitt är **tidsviktat medel** (timrad 60 min, kvartsrad 15 min) = vad ett jämnt förbrukande hushåll betalar i snitt i spotpris.
- Medianen av dygnssnitt (siffrorna för 14 april–12 oktober 2026) är ett annat mått och beskriver ett typiskt dygn. Blanda aldrig medel och median utan att skriva vilket mått som används.
- "Historiskt" får skrivas när period och källa anges. Fotnotsmall: "Spotpris exkl. moms, tidsviktat medel. Timpriser före oktober 2025, kvartspriser därefter. Källa: elpris.ai:s egen prisdata från 1 november 2021."

**Siffror (till och med 22 oktober 2026, öre/kWh exkl. moms)**

| År | SE1 | SE2 | SE3 | SE4 |
| --- | --- | --- | --- | --- |
| 2022 | 63,4 | 66,0 | 137,9 | 162,1 |
| 2023 | 45,6 | 45,6 | 59,0 | 74,2 |
| 2024 | 28,6 | 28,1 | 40,9 | 56,9 |
| 2025 | 18,5 | 18,3 | 51,2 | 67,0 |
| 2026 (t.o.m. 22 okt) | 47,1 | 49,1 | 77,4 | 100,0 |

- Dyraste månad: SE1 dec 2022 205,9 · SE2 dec 2022 206,0 · SE3 dec 2022 268,9 · SE4 aug 2022 305,6.
- Billigaste månad: SE1 jun 2025 3,0 · SE2 jun 2025 5,0 · SE3 aug 2024 8,5 · SE4 okt 2024 30,2.
- Dyraste dygn: SE1 och SE2 14 dec 2022 483,2 · SE3 23 aug 2022 515,0 · SE4 22 aug 2022 577,3.
- Billigaste dygn: 16 juli 2023, −9,6 i alla fyra områden.
- Andel tid med negativt spotpris (SE1/SE2/SE3/SE4): 2022 0,3/0,3/0,3/0,3 % · 2023 4,9/4,9/4,9/4,2 % · 2024 7,1/8,2/7,4/7,2 % · 2025 5,9/7,7/3,9/4,3 % · 2026 t.o.m. 22 okt 0,9/1,4/1,1/1,2 %. Före oktober 2025 räknas timmar, därefter kvartar – skriv ut det.
- Billigaste året (helår 2022–2025): i SE3 och SE4 var 2024 det billigaste året, i SE1 och SE2 2025. Källa: elpris.ai:s egen prisdata.
- Sommaren 2022 (jun–aug) var dyrare än vintern 2021/22 (dec–feb) i SE3 och SE4, ungefär lika i SE2 (41,7 mot 41,0). Källa: elpris.ai:s egen prisdata.
- Vintern dec–feb var dyrare än sommaren jun–aug efter i alla områden 2023–2026; 2022 bara i SE1. Källa: elpris.ai:s egen prisdata.

**Regler**
- Pristoppen var augusti–december 2022: skriv "hösten och vintern 2022", inte "vintern 2022". Orsaker anges bara med primärkälla.
- Orsaker 2022 (källa: Energimyndigheten, Nuläget på elmarknaden december 2022, publicerad 10 januari 2023): högre priser på naturgas och utsläppsrätter var en viktig drivkraft till de högre elpriserna 2022 i både Tyskland och Norden. Första halvan av december 2022: kyla, svag vind och isbildning på vindkraftverk, isläggning i älvarna som begränsade vattenkraften, och Oskarshamn 3 avställd 9–17 december. Den 14 december 2022 var priset detsamma i hela Sverige under dygnets alla timmar. Skriv inte att gaskraft sätter priset i Sverige.
- Kvoten vinter/sommar varierar mellan 0,6 och 3,8 beroende på år och område. Skriv aldrig en fast faktor. I SE3 och SE4 var sommaren 2022 dyrare än vintern 2021/22.
- Skriv inte att SE1 och SE2 har samma pris i dag. Fram till augusti 2024 hade de samma pris nästan alla timmar, men från hösten 2024 har de glidit isär: sedan kvartspriserna infördes 1 oktober 2025 har de exakt samma pris i ungefär 6 % av kvartarna (7 % under 14 april–22 oktober 2026). Historiskt samma pris får nämnas med period.
- Negativa priser: andelen per år får anges. Orsaken till att andelen är lägre 2026 anges bara med primärkälla.
- Innevarande år och månad märks "hittills" eller "t.o.m. {datum}" och räknas inte som dyraste eller billigaste.
- Jämför aldrig timspridning (före oktober 2025) med kvartsspridning.

## Energieffektivisering – bidrag och tekniska fakta

- Bidrag för energieffektivisering i småhus (Villaeffekten): 30 % av materialkostnaden, högst 60 000 kr per småhus inkl. utbetalning 2023–2025. Värdeår före 1990, ej fjärrvärme, ägaren bor permanent. Omfattar bl.a. tilläggsisolering, tätning, tilläggsglasning, byte av fönster och dörrar, värmeåtervinning i ventilation, byte till vattenburet system, pelletspanna och värmepump (bergvärme och luft/vatten – inte vanlig luft/luft). Ansökan hos länsstyrelsen, i mån av medel, åtgärden påbörjad 17 oktober 2025 eller senare, utbetalning när åtgärden är klar. Kan kombineras med ROT men inte för samma kostnad. Källa: regeringen.se (frågor och svar om bidraget), Boverket.
- Varmvatten: beredaren bör hålla minst 60 °C för att undvika legionella (Boverkets byggregler BBR 6:62, Folkhälsomyndigheten).

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
