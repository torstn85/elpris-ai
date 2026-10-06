/**
 * Elduellen – aktivitetsbibliotek (utkast v0.1, 6 okt 2026)
 *
 * Princip: varje kWh-värde är ett RÄKNEEXEMPEL med synliga antaganden
 * (effekt × tid, eller vattenmängd × temperaturhöjning × 1,163 Wh), inte ett
 * påstående om "din" förbrukning. `assumption` visas för spelaren i facit.
 *
 * Kostnad i spelet = kWh × (spotpris + energiskatt + moms) i vald stad/tid,
 * märkt "exkl. nätavgift och påslag". Energiskatt enligt elpris-facts
 * (normalnivå resp. nedsatt nivå i norr).
 *
 * priceMode:
 *   'tidpunkt'   – snitt av kvartspriserna från starttid och `durationMin` framåt
 *   'dygnssnitt' – aktiviteten pågår över dygn/år; använd stadens dygnssnitt
 *
 * hours: tillåtna STARTtimmar [från, till) i svensk tid. Om från > till går
 *        intervallet över midnatt (t.ex. [21, 2]). Ignoreras för 'dygnssnitt'.
 *
 * confidence: hur säkert antagandet är. 'låg' = granska innan lansering.
 *
 * months: valfritt. Månader (1–12) då aktiviteten får förekomma. Styr säsong i
 *         stället för säsongsord i `label`. Saknas fältet gäller hela året.
 */

export type PriceMode = 'tidpunkt' | 'dygnssnitt';
export type Category =
  | 'kok' | 'tvatt' | 'vatten' | 'varme' | 'fordon' | 'noje' | 'hem' | 'ar';

export interface Activity {
  id: string;
  /** Formulerad för duellfrågan: "Vad kostar mest: <label> …" */
  label: string;
  emoji: string;
  kWh: number;
  durationMin: number;
  priceMode: PriceMode;
  hours: [number, number];
  assumption: string;
  category: Category;
  confidence: 'hög' | 'medel' | 'låg';
  /** Månader 1–12 då aktiviteten får förekomma. Saknas = hela året. */
  months?: number[];
}

const ANY: [number, number] = [0, 24];

export const ACTIVITIES: Activity[] = [
  // ── Kök ──────────────────────────────────────────────────────────────
  { id: 'ugn-lasagne', label: 'laga en lasagne i ugnen', emoji: '🍝', kWh: 1.5, durationMin: 60, priceMode: 'tidpunkt', hours: [16, 20], category: 'kok', confidence: 'medel',
    assumption: 'Ugn på 200 °C: förvärmning 15 min och 45 min tillagning, termostaten slår av och på. Ca 1,5 kWh.' },
  { id: 'ugn-pizza', label: 'baka en pizza i ugnen', emoji: '🍕', kWh: 1.1, durationMin: 30, priceMode: 'tidpunkt', hours: [17, 21], category: 'kok', confidence: 'medel',
    assumption: 'Ugn på 250 °C: förvärmning 15 min och 12 min gräddning. Ca 1,1 kWh.' },
  { id: 'ugn-sockerkaka', label: 'baka en sockerkaka', emoji: '🍰', kWh: 1.1, durationMin: 55, priceMode: 'tidpunkt', hours: [10, 20], category: 'kok', confidence: 'medel',
    assumption: 'Ugn på 175 °C: förvärmning 15 min och 40 min gräddning. Ca 1,1 kWh.' },
  { id: 'ugn-bullar', label: 'baka två plåtar kanelbullar', emoji: '🥐', kWh: 1.0, durationMin: 40, priceMode: 'tidpunkt', hours: [9, 20], category: 'kok', confidence: 'medel',
    assumption: 'Ugn på 225 °C: förvärmning 15 min och två plåtar à ca 8 min. Ca 1 kWh.' },
  { id: 'ugn-julskinka', label: 'griljera en julskinka från rå', emoji: '🍖', kWh: 2.5, durationMin: 240, priceMode: 'tidpunkt', hours: [8, 16], category: 'kok', confidence: 'låg',
    assumption: 'Ugn på låg värme i ca 4 timmar, termostaten håller värmen. Ca 2,5 kWh.' },
  { id: 'airfryer', label: 'köra airfryern i 20 minuter', emoji: '🍟', kWh: 0.4, durationMin: 20, priceMode: 'tidpunkt', hours: [16, 20], category: 'kok', confidence: 'medel',
    assumption: '1,5 kW i 20 minuter, termostaten slår av och på. Ca 0,4 kWh.' },
  { id: 'mikro', label: 'värma lunchlådan i mikron', emoji: '🍱', kWh: 0.06, durationMin: 3, priceMode: 'tidpunkt', hours: [11, 14], category: 'kok', confidence: 'hög',
    assumption: 'Mikrovågsugn som drar ca 1,2 kW i 3 minuter. Ca 0,06 kWh.' },
  { id: 'popcorn', label: 'poppa popcorn i mikron', emoji: '🍿', kWh: 0.08, durationMin: 4, priceMode: 'tidpunkt', hours: [18, 23], category: 'kok', confidence: 'hög',
    assumption: 'Mikrovågsugn som drar ca 1,2 kW i 4 minuter. Ca 0,08 kWh.' },
  { id: 'vattenkokare', label: 'koka en liter vatten i vattenkokaren', emoji: '🫖', kWh: 0.12, durationMin: 3, priceMode: 'tidpunkt', hours: [6, 22], category: 'kok', confidence: 'hög',
    assumption: '1 liter som värms ca 90 grader: 1 × 90 × 1,163 Wh ≈ 0,1 kWh, plus lite förluster. Ca 0,12 kWh.' },
  { id: 'kaffe', label: 'brygga en hel kanna kaffe', emoji: '☕', kWh: 0.15, durationMin: 15, priceMode: 'tidpunkt', hours: [6, 10], category: 'kok', confidence: 'medel',
    assumption: '1,2 liter vatten som värms ca 80 grader (≈ 0,11 kWh) och värmeplattan en kvart. Ca 0,15 kWh.' },
  { id: 'pasta', label: 'koka pasta på spisen', emoji: '🍜', kWh: 0.6, durationMin: 20, priceMode: 'tidpunkt', hours: [11, 20], category: 'kok', confidence: 'medel',
    assumption: '3 liter vatten till kokning (≈ 0,3 kWh) och 10 minuters kokning. Ca 0,6 kWh.' },
  { id: 'pannkakor', label: 'steka pannkakor till hela familjen', emoji: '🥞', kWh: 0.5, durationMin: 25, priceMode: 'tidpunkt', hours: [7, 19], category: 'kok', confidence: 'medel',
    assumption: 'Spisplatta på 1,5 kW i 25 minuter, i snitt ca 80 % effekt. Ca 0,5 kWh.' },
  { id: 'brodrost', label: 'rosta två skivor bröd', emoji: '🍞', kWh: 0.05, durationMin: 3, priceMode: 'tidpunkt', hours: [6, 10], category: 'kok', confidence: 'hög',
    assumption: 'Brödrost på ca 900 W i 3 minuter. Ca 0,05 kWh.' },
  { id: 'vafflor', label: 'grädda våfflor en halvtimme', emoji: '🧇', kWh: 0.5, durationMin: 30, priceMode: 'tidpunkt', hours: [13, 19], category: 'kok', confidence: 'medel',
    assumption: 'Våffeljärn på 1,2 kW i 30 minuter, termostaten slår av och på. Ca 0,5 kWh.' },
  { id: 'raclette', label: 'ha raclettekväll i två timmar', emoji: '🧀', kWh: 1.4, durationMin: 120, priceMode: 'tidpunkt', hours: [18, 21], category: 'kok', confidence: 'medel',
    assumption: 'Raclettegrill på 1,2 kW i 2 timmar, i snitt ca 60 % effekt. Ca 1,4 kWh.' },
  { id: 'slowcooker', label: 'låta grytan puttra i slow cookern hela dagen', emoji: '🍲', kWh: 1.3, durationMin: 480, priceMode: 'tidpunkt', hours: [7, 11], category: 'kok', confidence: 'medel',
    assumption: 'Ca 160 W i snitt under 8 timmar. Ca 1,3 kWh.' },
  { id: 'sousvide', label: 'tillaga en stek sous vide i tre timmar', emoji: '🥩', kWh: 0.6, durationMin: 180, priceMode: 'tidpunkt', hours: [13, 18], category: 'kok', confidence: 'låg',
    assumption: '5 liter vatten värms till ca 57 °C (≈ 0,3 kWh) och hålls varmt i 3 timmar. Ca 0,6 kWh.' },
  { id: 'bakmaskin', label: 'baka ett bröd i bakmaskinen', emoji: '🍞', kWh: 0.4, durationMin: 210, priceMode: 'tidpunkt', hours: [6, 22], category: 'kok', confidence: 'medel',
    assumption: 'Ett vanligt program på ca 3,5 timmar, mest knådning och gräddning. Ca 0,4 kWh.' },
  { id: 'elgrill', label: 'grilla på elgrillen en timme', emoji: '🔥', kWh: 1.5, durationMin: 60, priceMode: 'tidpunkt', hours: [16, 21], category: 'kok', confidence: 'medel',
    assumption: 'Elgrill på 2 kW i en timme, i snitt ca 75 % effekt. Ca 1,5 kWh.' },

  // ── Tvätt & städ ─────────────────────────────────────────────────────
  { id: 'disk-maskin', label: 'köra diskmaskinen på eco', emoji: '🍽️', kWh: 0.9, durationMin: 210, priceMode: 'tidpunkt', hours: [6, 23], category: 'tvatt', confidence: 'hög',
    assumption: 'Ett eco-program använder typiskt runt 0,9 kWh. Programmet är långt men drar lite.' },
  { id: 'disk-hand', label: 'diska för hand med varmvatten', emoji: '🧽', kWh: 1.0, durationMin: 20, priceMode: 'tidpunkt', hours: [17, 21], category: 'tvatt', confidence: 'medel',
    assumption: '20 liter vatten på ca 50 °C: 20 × 42 grader × 1,163 Wh ≈ 1 kWh. Gäller om varmvattnet värms med el.' },
  { id: 'tvatt-60', label: 'tvätta en maskin på 60 grader', emoji: '🧺', kWh: 1.0, durationMin: 150, priceMode: 'tidpunkt', hours: [6, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'Ett 60-gradersprogram använder runt 1 kWh, mest för att värma vattnet.' },
  { id: 'tvatt-40', label: 'tvätta en maskin på 40 grader', emoji: '🧺', kWh: 0.6, durationMin: 120, priceMode: 'tidpunkt', hours: [6, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'Ett 40-gradersprogram använder runt 0,6 kWh.' },
  { id: 'tvatt-30-snabb', label: 'köra en snabbtvätt på 30 grader', emoji: '👕', kWh: 0.3, durationMin: 30, priceMode: 'tidpunkt', hours: [6, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'Kort program med lite uppvärmning. Ca 0,3 kWh.' },
  { id: 'tork-kondens', label: 'torktumla en maskin (kondenstork)', emoji: '🌀', kWh: 2.5, durationMin: 120, priceMode: 'tidpunkt', hours: [6, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'En kondenstorktumlare använder runt 2,5 kWh för en full maskin.' },
  { id: 'tork-vp', label: 'torktumla en maskin (värmepumpstork)', emoji: '🌀', kWh: 1.2, durationMin: 150, priceMode: 'tidpunkt', hours: [6, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'En värmepumpstorktumlare använder ungefär hälften så mycket som en kondenstork. Ca 1,2 kWh.' },
  { id: 'strykning', label: 'stryka skjortor en halvtimme', emoji: '👔', kWh: 0.5, durationMin: 30, priceMode: 'tidpunkt', hours: [7, 22], category: 'tvatt', confidence: 'medel',
    assumption: 'Strykjärn på 2 kW i 30 minuter, termostaten slår av och på ungefär halva tiden. Ca 0,5 kWh.' },
  { id: 'dammsuga', label: 'dammsuga hela huset', emoji: '🧹', kWh: 0.4, durationMin: 30, priceMode: 'tidpunkt', hours: [8, 20], category: 'tvatt', confidence: 'medel',
    assumption: 'Dammsugare på ca 800 W i 30 minuter. Ca 0,4 kWh.' },
  { id: 'hogtryck', label: 'högtryckstvätta altanen en timme', emoji: '💦', kWh: 2.0, durationMin: 60, priceMode: 'tidpunkt', hours: [9, 19], category: 'tvatt', confidence: 'medel',
    assumption: 'Högtryckstvätt på ca 2 kW i en timme. Ca 2 kWh.' },

  // ── Varmvatten ───────────────────────────────────────────────────────
  { id: 'dusch-10', label: 'ta en 10 minuters dusch', emoji: '🚿', kWh: 3.5, durationMin: 10, priceMode: 'tidpunkt', hours: [6, 23], category: 'vatten', confidence: 'medel',
    assumption: '90 liter vatten (9 l/min) som värms ca 30 grader: 90 × 30 × 1,163 Wh ≈ 3,1 kWh, plus förluster i beredaren. Ca 3,5 kWh. Gäller om varmvattnet värms med el.' },
  { id: 'dusch-5', label: 'ta en snabbdusch på 5 minuter', emoji: '🚿', kWh: 1.8, durationMin: 5, priceMode: 'tidpunkt', hours: [6, 23], category: 'vatten', confidence: 'medel',
    assumption: 'Halva duschen: 45 liter som värms ca 30 grader, plus förluster. Ca 1,8 kWh. Gäller om varmvattnet värms med el.' },
  { id: 'badkar', label: 'ta ett fullt bad i badkaret', emoji: '🛁', kWh: 6, durationMin: 20, priceMode: 'tidpunkt', hours: [17, 23], category: 'vatten', confidence: 'medel',
    assumption: '150 liter vatten på 40 °C: 150 × 32 grader × 1,163 Wh ≈ 5,6 kWh, plus förluster. Ca 6 kWh. Gäller om varmvattnet värms med el.' },

  // ── Värme & kyla ─────────────────────────────────────────────────────
  { id: 'bastu', label: 'basta en kväll', emoji: '🧖', kWh: 10, durationMin: 105, priceMode: 'tidpunkt', hours: [17, 22], category: 'varme', confidence: 'medel',
    assumption: '8 kW-aggregat: 45 min uppvärmning för fullt (6 kWh) och en timmes bad på ungefär halv effekt (4 kWh). Ca 10 kWh.' },
  { id: 'infravarmare', label: 'sitta ute med infravärmaren i två timmar', emoji: '🔆', kWh: 4, durationMin: 120, priceMode: 'tidpunkt', hours: [18, 23], category: 'varme', confidence: 'hög',
    assumption: 'Infravärmare på 2 kW i 2 timmar. 4 kWh.' },
  { id: 'element-natt', label: 'låta ett 1000 W-element gå för fullt hela natten', emoji: '♨️', kWh: 8, durationMin: 480, priceMode: 'tidpunkt', hours: [21, 24], category: 'varme', confidence: 'hög',
    assumption: '1 000 W i 8 timmar = 8 kWh.' },
  { id: 'motorvarmare', label: 'köra motorvärmaren en morgon', emoji: '🚗', kWh: 1.6, durationMin: 120, priceMode: 'tidpunkt', hours: [4, 7], category: 'varme', confidence: 'medel', months: [10, 11, 12, 1, 2, 3, 4],
    assumption: 'Motorvärmare på ca 800 W i 2 timmar. Ca 1,6 kWh.' },
  { id: 'elfilt', label: 'sova med elfilt hela natten', emoji: '🛏️', kWh: 0.4, durationMin: 480, priceMode: 'tidpunkt', hours: [21, 24], category: 'varme', confidence: 'medel',
    assumption: 'Elfilt på ca 50 W i 8 timmar. Ca 0,4 kWh.' },
  { id: 'flakt', label: 'sova med fläkten på en sommarnatt', emoji: '🌬️', kWh: 0.3, durationMin: 480, priceMode: 'tidpunkt', hours: [21, 24], category: 'varme', confidence: 'medel',
    assumption: 'Golvfläkt på ca 40 W i 8 timmar. Ca 0,3 kWh.' },
  { id: 'ac-portabel', label: 'köra en portabel AC en eftermiddag', emoji: '❄️', kWh: 4, durationMin: 240, priceMode: 'tidpunkt', hours: [12, 18], category: 'varme', confidence: 'medel', months: [6, 7, 8],
    assumption: 'Portabel luftkonditionering på ca 1 kW i 4 timmar. Ca 4 kWh.' },
  { id: 'villa-bergvarme-kall', label: 'värma en villa med bergvärme ett iskallt dygn', emoji: '🏠', kWh: 40, durationMin: 1440, priceMode: 'dygnssnitt', hours: ANY, category: 'varme', confidence: 'låg',
    assumption: 'Räkneexempel: villan behöver 100 kWh värme en riktigt kall dag, och värmepumpen ger ca 2,5 kWh värme per kWh el. Ca 40 kWh.' },
  { id: 'villa-direktel-kall', label: 'värma en villa med direktverkande el ett iskallt dygn', emoji: '🏚️', kWh: 100, durationMin: 1440, priceMode: 'dygnssnitt', hours: ANY, category: 'varme', confidence: 'låg',
    assumption: 'Räkneexempel: samma värmebehov på 100 kWh, men med direktverkande el blir varje kWh värme en kWh el. Ca 100 kWh.' },
  { id: 'golvvarme-dygn', label: 'ha golvvärmen på i badrummet ett dygn', emoji: '🦶', kWh: 3.6, durationMin: 1440, priceMode: 'dygnssnitt', hours: ANY, category: 'varme', confidence: 'låg',
    assumption: 'Räkneexempel: 5 m² med 60 W/m² som är igång ungefär halva tiden. Ca 3,6 kWh per dygn.' },
  { id: 'handdukstork-dygn', label: 'ha handdukstorken på ett dygn', emoji: '🧻', kWh: 1.4, durationMin: 1440, priceMode: 'dygnssnitt', hours: ANY, category: 'varme', confidence: 'medel',
    assumption: 'Handdukstork på ca 60 W dygnet runt. Ca 1,4 kWh.' },
  { id: 'avfuktare-dygn', label: 'köra avfuktaren i källaren ett dygn', emoji: '💧', kWh: 3, durationMin: 1440, priceMode: 'dygnssnitt', hours: ANY, category: 'varme', confidence: 'låg',
    assumption: 'Avfuktare på ca 250 W som går ungefär halva dygnet. Ca 3 kWh.' },

  // ── Fordon ───────────────────────────────────────────────────────────
  { id: 'elbil-10mil', label: 'ladda elbilen för 10 mil', emoji: '🔌', kWh: 20, durationMin: 110, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'medel',
    assumption: 'Ca 2 kWh per mil inklusive laddförluster: 10 × 2 = 20 kWh. Laddbox på 11 kW tar knappt 2 timmar.' },
  { id: 'elbil-pendling', label: 'ladda elbilen för en dags pendling (4 mil)', emoji: '🚘', kWh: 8, durationMin: 45, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'medel',
    assumption: '4 mil × ca 2 kWh per mil inklusive laddförluster = 8 kWh.' },
  { id: 'elbil-full', label: 'ladda elbilen från 10 till 80 procent', emoji: '🔋', kWh: 46, durationMin: 250, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'medel',
    assumption: '60 kWh-batteri: 70 % = 42 kWh, plus ca 10 % laddförluster. Ca 46 kWh. Ca 4 timmar på en 11 kW-laddbox.' },
  { id: 'laddhybrid', label: 'fulladda en laddhybrid', emoji: '🚙', kWh: 13, durationMin: 210, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'medel',
    assumption: '12 kWh-batteri plus ca 10 % laddförluster. Ca 13 kWh.' },
  { id: 'elcykel', label: 'ladda elcykeln full', emoji: '🚲', kWh: 0.55, durationMin: 300, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'hög',
    assumption: '500 Wh-batteri plus ca 10 % laddförluster. Ca 0,55 kWh.' },
  { id: 'elsparkcykel', label: 'ladda elsparkcykeln full', emoji: '🛴', kWh: 0.45, durationMin: 300, priceMode: 'tidpunkt', hours: ANY, category: 'fordon', confidence: 'medel',
    assumption: 'Ca 400 Wh-batteri plus laddförluster. Ca 0,45 kWh.' },

  // ── Nöje & teknik ────────────────────────────────────────────────────
  { id: 'gaming-pc', label: 'spela på gaming-datorn i tre timmar', emoji: '🎮', kWh: 1.2, durationMin: 180, priceMode: 'tidpunkt', hours: [16, 23], category: 'noje', confidence: 'medel',
    assumption: 'Gaming-dator med skärm på ca 400 W i 3 timmar. Ca 1,2 kWh.' },
  { id: 'konsol', label: 'spela tv-spel i tre timmar', emoji: '🕹️', kWh: 0.6, durationMin: 180, priceMode: 'tidpunkt', hours: [15, 23], category: 'noje', confidence: 'medel',
    assumption: 'Spelkonsol på ca 200 W i 3 timmar. Ca 0,6 kWh.' },
  { id: 'tv-film', label: 'se två filmer på storbilds-tv', emoji: '📺', kWh: 0.4, durationMin: 180, priceMode: 'tidpunkt', hours: [18, 22], category: 'noje', confidence: 'medel',
    assumption: '65-tums tv på ca 130 W i 3 timmar. Ca 0,4 kWh.' },
  { id: 'laptop', label: 'jobba hemma på laptopen en halv dag', emoji: '💻', kWh: 0.2, durationMin: 240, priceMode: 'tidpunkt', hours: [8, 13], category: 'noje', confidence: 'medel',
    assumption: 'Laptop på ca 50 W i 4 timmar. Ca 0,2 kWh.' },
  { id: '3d-skrivare', label: 'skriva ut något på 3D-skrivaren i fem timmar', emoji: '🖨️', kWh: 0.6, durationMin: 300, priceMode: 'tidpunkt', hours: [8, 20], category: 'noje', confidence: 'medel',
    assumption: '3D-skrivare på ca 120 W i 5 timmar. Ca 0,6 kWh.' },
  { id: 'lopband', label: 'springa 30 minuter på löpbandet', emoji: '🏃', kWh: 0.5, durationMin: 30, priceMode: 'tidpunkt', hours: [6, 21], category: 'noje', confidence: 'låg',
    assumption: 'Löpband på ca 1 kW i snitt i 30 minuter. Ca 0,5 kWh.' },
  { id: 'hartork', label: 'föna håret i tio minuter', emoji: '💇', kWh: 0.3, durationMin: 10, priceMode: 'tidpunkt', hours: [6, 23], category: 'noje', confidence: 'hög',
    assumption: 'Hårfön på 1,8 kW i 10 minuter. Ca 0,3 kWh.' },

  // ── Över tid (dygnssnitt) ─────────────────────────────────────────────
  { id: 'mobil-ar', label: 'ladda mobilen varje dag i ett helt år', emoji: '📱', kWh: 5.5, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'ar', confidence: 'medel',
    assumption: 'Ca 15 Wh per laddning inklusive förluster, en gång per dygn i 365 dagar. Ca 5,5 kWh.' },
  { id: 'router-ar', label: 'ha wifi-routern på dygnet runt i ett år', emoji: '📶', kWh: 88, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'ar', confidence: 'medel',
    assumption: 'Router på ca 10 W i 8 760 timmar. Ca 88 kWh.' },
  { id: 'tv-standby-ar', label: 'låta tv:n stå i standby ett helt år', emoji: '💤', kWh: 4.4, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'ar', confidence: 'medel',
    assumption: 'Ca 0,5 W standby i 8 760 timmar. Ca 4,4 kWh.' },
  { id: 'kylskap-dygn', label: 'ha kylskåpet igång ett dygn', emoji: '🧊', kWh: 0.4, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'hem', confidence: 'medel',
    assumption: 'Ett modernt kylskåp drar ca 150 kWh per år, alltså ca 0,4 kWh per dygn.' },
  { id: 'frys-dygn', label: 'ha frysen igång ett dygn', emoji: '🥶', kWh: 0.6, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'hem', confidence: 'medel',
    assumption: 'En modern frys drar ca 220 kWh per år, alltså ca 0,6 kWh per dygn.' },
  { id: 'julbelysning', label: 'ha julbelysningen tänd hela december', emoji: '🎄', kWh: 5, durationMin: 0, priceMode: 'dygnssnitt', hours: ANY, category: 'ar', confidence: 'medel', months: [11, 12, 1],
    assumption: 'LED-slingor på totalt 20 W, 8 timmar per dygn i 31 dygn. Ca 5 kWh.' },
];
