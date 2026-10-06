// Skriver ut de kommande 7 dagarnas Elduellen-pussel för granskning.
// Dagens priser används som stand-in för alla dagar (framtida priser finns inte),
// så kostnaderna är illustrativa — urvalet av aktiviteter, städer, klockslag och
// duelltyper är däremot exakt det som genereras för respektive datum.
//
// Användning:
//   npx tsx scripts/elduellen-preview.ts            # 7 dagar från idag
//   npx tsx scripts/elduellen-preview.ts 14         # antal dagar
//   npx tsx scripts/elduellen-preview.ts 7 --stats  # bara sammanställning

import { readFileSync } from "node:fs";
import { stockholmISODate } from "../src/lib/time";
import { loadDayPrices } from "../src/lib/elduellen/prices";
import { generatePuzzle, addDays } from "../src/lib/elduellen/generate";
import { formatCost, COST_FOOTNOTE } from "../src/lib/elduellen/cost";
import type { Option } from "../src/lib/elduellen/types";
import {
  ACTIVITY_REPEAT_WINDOW_DAYS,
  MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY,
  MIN_DIFF_KR,
  MIN_EXPENSIVE_KR,
} from "../src/lib/elduellen/config";

// Env loader (tsx läser inte .env.local automatiskt). Supabase-klienten skapas
// lazy, så det räcker att env finns innan första anropet.

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const args = process.argv.slice(2);
const days = Number(args.find((a) => /^\d+$/.test(a)) ?? 7);
const statsOnly = args.includes("--stats");

async function main() {
  const today = stockholmISODate();
  const prices = await loadDayPrices(today);
  if (!prices) {
    console.error(`Inga priser för ${today}.`);
    process.exit(1);
  }
  const tomorrow = await loadDayPrices(addDays(today, 1));

  const nf1 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
  const time = (o: Option) =>
    o.hour === null ? "dygnssnitt" : `kl ${String(o.hour).padStart(2, "0")}`;
  const line = (tag: string, o: Option, winner: boolean) =>
    `   ${tag} ${o.emoji} ${o.label} — ${time(o)} i ${o.cityName} (${o.area}${o.reducedEnergyTax ? ", nedsatt skatt" : ""})\n` +
    `       ${o.breakdown}  →  ${formatCost(o.costKr)}${winner ? "  ◀ DYRAST" : ""}\n` +
    `       spot ${nf1.format(o.spotOre)} + skatt ${nf1.format(o.taxOre)} öre, × 1,25${o.priceNote ? ` — ${o.priceNote}` : ""}`;

  console.log(
    `Priser: ${today} (${Object.entries(prices)
      .map(([a, q]) => `${a} ${q.length} kv`)
      .join(", ")}).`,
  );
  console.log(
    `Morgondagens priser: ${tomorrow ? "finns → bonusduell genereras" : "saknas än"}.`,
  );
  console.log(`Alla kostnader ${COST_FOOTNOTE}.\n`);

  const seenActs = new Map<string, string[]>();
  const seenCities = new Map<string, string[]>();
  const typeSwaps: string[] = [];
  const fallbackUses: string[] = [];
  const avgViolations: string[] = [];
  const sameDayDup: string[] = [];
  const emergencies: string[] = [];
  const sizeViolations: string[] = [];
  let shortDays = 0;

  for (let d = 0; d < days; d++) {
    const date = addDays(today, d);
    const puzzle = generatePuzzle({
      date,
      today: prices,
      tomorrow: d === 0 ? tomorrow : null,
    });
    if (puzzle.duels.length < 5) shortDays++;
    const acts = new Set<string>();
    const cities = new Set<string>();

    if (!statsOnly)
      console.log(
        `══ ${date}${puzzle.number ? `  #${puzzle.number}` : ""} ══════════════════════════════`,
      );
    const all = [
      ...puzzle.duels.map((x, i) => [`${i + 1}`, x] as const),
      ...(puzzle.bonus ? [["bonus", puzzle.bonus] as const] : []),
    ];
    for (const [n, duel] of all) {
      for (const o of [duel.a, duel.b]) {
        acts.add(o.activityId);
        cities.add(o.citySlug);
      }
      if (duel.emergency)
        emergencies.push(
          `${date} duell ${n}: ${duel.emergency} (${duel.a.activityId} / ${duel.b.activityId})`,
        );
      if (duel.reusesCity) fallbackUses.push(`${date} duell ${n}`);
      if (duel.type !== duel.requestedType)
        typeSwaps.push(
          `${date} duell ${n}: ${duel.requestedType} → ${duel.type}`,
        );
      if (statsOnly) continue;
      console.log(
        ` ${n}. ${duel.emergency ? `⚠ NÖDRESERV: ${duel.emergency} ` : ""}[${duel.type}${duel.type !== duel.requestedType ? ` ← bytt från ${duel.requestedType}` : ""}] kvot ${nf1.format(duel.ratio)}`,
      );
      console.log(line("A", duel.a, duel.answer === "A"));
      console.log(line("B", duel.b, duel.answer === "B"));
      console.log(`   → ${duel.link.text} (${duel.link.href})\n`);
    }
    if (!statsOnly && puzzle.duels.length < 5)
      console.log(` ⚠ bara ${puzzle.duels.length} dueller hittades\n`);
    const avgActs = new Set(
      puzzle.duels.flatMap((x) =>
        [x.a, x.b].filter((o) => o.hour === null).map((o) => o.activityId),
      ),
    );
    if (avgActs.size > MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY)
      avgViolations.push(`${date}: ${Array.from(avgActs).join(", ")}`);
    puzzle.duels.forEach((x, i) => {
      const hi = Math.max(x.a.costKr, x.b.costKr);
      const lo = Math.min(x.a.costKr, x.b.costKr);
      if (hi < MIN_EXPENSIVE_KR || hi - lo < MIN_DIFF_KR)
        sizeViolations.push(`${date} duell ${i + 1}`);
    });
    const actCount = new Map<string, number>();
    puzzle.duels.forEach((x) => {
      for (const id of Array.from(new Set([x.a.activityId, x.b.activityId])))
        actCount.set(id, (actCount.get(id) ?? 0) + 1);
    });
    const dupActs = Array.from(actCount.entries()).filter(([, n]) => n > 1);
    if (dupActs.length)
      sameDayDup.push(`${date}: ${dupActs.map(([id]) => id).join(", ")}`);
    seenActs.set(date, Array.from(acts));
    seenCities.set(date, Array.from(cities));
  }

  // Upprepningar inom ett fönster av `window` dagar (dagens inräknad)
  const repeats = (m: Map<string, string[]>, window: number) => {
    const dates = Array.from(m.keys());
    const out: string[] = [];
    for (let i = 1; i < dates.length; i++) {
      for (let j = Math.max(0, i - window + 1); j < i; j++) {
        const prev = new Set(m.get(dates[j]));
        const same = m.get(dates[i])!.filter((x) => prev.has(x));
        if (same.length)
          out.push(`${dates[j]}→${dates[i]}: ${same.join(", ")}`);
      }
    }
    return out;
  };

  console.log("══ Sammanställning ══");
  console.log(`Dagar med färre än 5 dueller: ${shortDays}`);
  console.log(
    `Nödreserv använd: ${emergencies.length}${emergencies.length ? "\n  " + emergencies.join("\n  ") : ""}`,
  );
  console.log(
    `Dueller med en stad som redan förekommit samma dag: ${fallbackUses.length}${fallbackUses.length ? "\n  " + fallbackUses.join("\n  ") : ""}`,
  );
  console.log(
    `Bytta duelltyper: ${typeSwaps.length}${typeSwaps.length ? "\n  " + typeSwaps.join("\n  ") : ""}`,
  );
  const ra = repeats(seenActs, ACTIVITY_REPEAT_WINDOW_DAYS);
  const rc = repeats(seenCities, 2);
  console.log(
    `Aktiviteter som återkommer inom ${ACTIVITY_REPEAT_WINDOW_DAYS} dagar: ${ra.length ? "\n  " + ra.join("\n  ") : "inga"}`,
  );
  console.log(
    `Aktivitet i fler än en duell samma dag: ${sameDayDup.length ? "\n  " + sameDayDup.join("\n  ") : "inga"}`,
  );
  console.log(
    `Dagar med fler än ${MAX_DAILY_AVERAGE_ACTIVITIES_PER_DAY} dygnssnitt-aktivitet: ${avgViolations.length ? "\n  " + avgViolations.join("\n  ") : "inga"}`,
  );
  console.log(
    `Dueller under gränsen (dyrast ≥ ${MIN_EXPENSIVE_KR} kr, skillnad ≥ ${MIN_DIFF_KR} kr): ${sizeViolations.length ? "\n  " + sizeViolations.join("\n  ") : "inga"}`,
  );
  console.log(
    `Städer som återkommer dagen efter: ${rc.length ? "\n  " + rc.join("\n  ") : "inga"}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
