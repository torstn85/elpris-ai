"use client";

import { useState } from "react";
import Link from "next/link";
import { COST_FOOTNOTE, formatCostShort } from "@/lib/elduellen/cost";
import { scoreComment, verdict } from "@/lib/elduellen/copy";
import {
  capitalize,
  duelQuestion,
  optionHeadline,
  optionShortName,
  summaryLine,
} from "@/lib/elduellen/present";
import type { Duel, Option, Pick, Puzzle } from "@/lib/elduellen/types";

type Phase = "start" | "duel" | "facit" | "done" | "bonus" | "bonus-facit";

const nf1 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

// ─── Delkomponenter ───────────────────────────────────────────────────────────

function Progress({ picks, duels }: { picks: Pick[]; duels: Duel[] }) {
  return (
    <ol
      className="flex items-center justify-center gap-2"
      aria-label="Dagens dueller"
    >
      {duels.map((d, i) => {
        const pick = picks[i];
        const state =
          pick === undefined
            ? i === picks.length
              ? "current"
              : "todo"
            : pick === d.answer
              ? "right"
              : "wrong";
        return (
          <li
            key={i}
            aria-label={`Duell ${i + 1}: ${
              state === "right"
                ? "rätt"
                : state === "wrong"
                  ? "fel"
                  : state === "current"
                    ? "pågår"
                    : "kvar"
            }`}
            className={`h-2.5 w-8 rounded-full ${
              state === "right"
                ? "bg-cta"
                : state === "wrong"
                  ? "bg-danger"
                  : state === "current"
                    ? "bg-accent"
                    : "bg-muted"
            }`}
          />
        );
      })}
    </ol>
  );
}

function OptionButton({
  duel,
  option,
  letter,
  onPick,
}: {
  duel: Duel;
  option: Option;
  letter: Pick;
  onPick: (p: Pick) => void;
}) {
  const h = optionHeadline(duel, option);
  return (
    <button
      type="button"
      onClick={() => onPick(letter)}
      className="group flex w-full items-center gap-4 rounded-2xl border-2 border-muted bg-surface p-4 text-left transition-colors hover:border-accent focus:outline-none focus-visible:border-accent active:scale-[0.99] sm:p-5"
    >
      {h.emoji && (
        <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
          {h.emoji}
        </span>
      )}
      <span className="flex-1">
        <span
          className={`block text-white ${h.emoji ? "font-semibold sm:text-lg" : "font-tight text-3xl font-bold"}`}
        >
          {h.main}
        </span>
        {h.sub && (
          <span className="mt-1 block text-sm text-[#8fafc9]">{h.sub}</span>
        )}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-muted font-tight font-bold text-[#8fafc9] group-hover:border-accent group-hover:text-accent"
        aria-hidden
      >
        {letter}
      </span>
    </button>
  );
}

function DuelView({
  duel,
  title,
  onPick,
}: {
  duel: Duel;
  title: string;
  onPick: (p: Pick) => void;
}) {
  const q = duelQuestion(duel);
  return (
    <section aria-labelledby="duel-title" className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          {title}
        </p>
        <h2
          id="duel-title"
          className="mt-1 text-balance font-tight text-2xl font-bold sm:text-3xl"
        >
          {q.lead ? (
            <>
              {q.lead} — {q.question}
            </>
          ) : (
            q.question
          )}
        </h2>
      </div>
      <OptionButton duel={duel} option={duel.a} letter="A" onPick={onPick} />
      <p
        className="text-center text-sm font-semibold uppercase tracking-widest text-[#8fafc9]"
        aria-hidden
      >
        eller
      </p>
      <OptionButton duel={duel} option={duel.b} letter="B" onPick={onPick} />
    </section>
  );
}

function CostCard({
  duel,
  option,
  letter,
  isAnswer,
  isPick,
}: {
  duel: Duel;
  option: Option;
  letter: Pick;
  isAnswer: boolean;
  isPick: boolean;
}) {
  const h = optionHeadline(duel, option);
  return (
    <div
      className={`rounded-2xl border-2 bg-surface p-4 sm:p-5 ${isAnswer ? "border-cta" : "border-muted"}`}
    >
      <div className="flex items-start gap-3">
        {h.emoji && (
          <span className="text-3xl leading-none" aria-hidden>
            {h.emoji}
          </span>
        )}
        <div className="flex-1">
          <p className="font-semibold text-white">
            {letter}. {h.main}
          </p>
          {h.sub && <p className="text-sm text-[#8fafc9]">{h.sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isAnswer && (
            <span className="rounded-full bg-cta/15 px-2 py-0.5 text-xs font-semibold text-cta">
              Dyrast
            </span>
          )}
          {isPick && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
              Ditt val
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 font-tight text-3xl font-bold text-white">
        {formatCostShort(option.costKr)}
      </p>
      <p className="mt-1 text-sm text-[#cfe0f0]">{option.breakdown}</p>
      <details className="group mt-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-accent [&::-webkit-details-marker]:hidden">
          Så har vi räknat
          <span
            className="transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <div className="mt-2 flex flex-col gap-2 leading-relaxed text-[#8fafc9]">
          <p>
            Spotpris {nf1.format(option.spotOre)} öre + energiskatt{" "}
            {nf1.format(option.taxOre)} öre
            {option.reducedEnergyTax ? " (nedsatt)" : ""}, plus moms 25 %
            {option.priceNote ? ` — ${option.priceNote}` : ""}.
          </p>
          <p>
            <span className="font-medium text-[#cfe0f0]">Antagande:</span>{" "}
            {option.assumption}
          </p>
        </div>
      </details>
    </div>
  );
}

function FacitView({
  duel,
  pick,
  verdictText,
  nextLabel,
  onNext,
}: {
  duel: Duel;
  pick: Pick;
  verdictText: string;
  nextLabel: string;
  onNext: () => void;
}) {
  const right = pick === duel.answer;
  const q = duelQuestion(duel);
  const answerName = optionShortName(
    duel,
    duel.answer === "A" ? duel.a : duel.b,
    duel.answer,
  );
  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <div
        className={`rounded-2xl p-4 text-center ${right ? "bg-cta/15 text-cta" : "bg-danger/15 text-danger"}`}
      >
        <p className="font-tight text-2xl font-bold">{verdictText}</p>
        <p className="mt-1 text-sm text-[#cfe0f0]">
          {answerName} kostar {nf1.format(duel.ratio)} gånger så mycket.
        </p>
      </div>
      {q.lead && (
        <p className="text-center font-semibold text-white">{q.lead}</p>
      )}
      <CostCard
        duel={duel}
        option={duel.a}
        letter="A"
        isAnswer={duel.answer === "A"}
        isPick={pick === "A"}
      />
      <CostCard
        duel={duel}
        option={duel.b}
        letter="B"
        isAnswer={duel.answer === "B"}
        isPick={pick === "B"}
      />
      <p className="text-xs text-[#8fafc9]">
        Kostnaderna är räkneexempel, {COST_FOOTNOTE}.
      </p>
      <Link
        href={duel.link.href}
        className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        {duel.link.text} →
      </Link>
      {/* Sticky längst ner på mobil så att man slipper scrolla förbi facit. */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-full bg-cta px-6 py-3.5 font-semibold text-white shadow-md shadow-cta/30 transition-colors hover:bg-[#16a34a]"
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}

// ─── Spelet ───────────────────────────────────────────────────────────────────

export default function Elduellen({ puzzle }: { puzzle: Puzzle }) {
  const { duels, bonus } = puzzle;
  const [phase, setPhase] = useState<Phase>("start");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [bonusPick, setBonusPick] = useState<Pick | null>(null);

  const index = phase === "facit" ? picks.length - 1 : picks.length;
  const score = picks.filter((p, i) => p === duels[i].answer).length;
  const heading = `Elduellen${puzzle.number ? ` #${puzzle.number}` : ""}`;

  if (phase === "start") {
    return (
      <section className="flex flex-col items-center gap-6 py-6 text-center">
        <p className="text-6xl" aria-hidden>
          ⚡
        </p>
        <div>
          <h1 className="font-tight text-4xl font-black tracking-tight sm:text-5xl">
            {heading}
          </h1>
          <p className="mt-2 text-[#8fafc9]">
            {capitalize(formatDate(puzzle.date))}
          </p>
        </div>
        <p className="max-w-sm text-lg leading-relaxed text-[#cfe0f0]">
          Fem dueller. Välj det som kostar mest i el — med dagens riktiga
          priser.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-[#8fafc9]">
          <li>Samma dueller för alla idag</li>
          <li>Facit med uträkning efter varje val</li>
        </ul>
        <button
          type="button"
          onClick={() => setPhase("duel")}
          className="w-full max-w-xs rounded-full bg-cta px-6 py-4 text-lg font-semibold text-white shadow-md shadow-cta/30 transition-colors hover:bg-[#16a34a]"
        >
          Starta dagens duell
        </button>
      </section>
    );
  }

  if (phase === "duel" || phase === "facit") {
    const duel = duels[index];
    return (
      <div className="flex flex-col gap-6">
        <Progress picks={picks} duels={duels} />
        {phase === "duel" ? (
          <DuelView
            duel={duel}
            title={`Duell ${index + 1} av ${duels.length}`}
            onPick={(p) => {
              setPicks([...picks, p]);
              setPhase("facit");
            }}
          />
        ) : (
          <FacitView
            duel={duel}
            pick={picks[index]}
            verdictText={verdict(
              puzzle.date,
              String(index),
              picks[index] === duel.answer,
            )}
            nextLabel={
              index + 1 < duels.length ? "Nästa duell" : "Se resultatet"
            }
            onNext={() => setPhase(index + 1 < duels.length ? "duel" : "done")}
          />
        )}
      </div>
    );
  }

  if (phase === "bonus" && bonus) {
    return (
      <DuelView
        duel={bonus}
        title="Bonusduell — morgondagens priser"
        onPick={(p) => {
          setBonusPick(p);
          setPhase("bonus-facit");
        }}
      />
    );
  }

  if (phase === "bonus-facit" && bonus && bonusPick) {
    return (
      <FacitView
        duel={bonus}
        pick={bonusPick}
        verdictText={verdict(puzzle.date, "bonus", bonusPick === bonus.answer)}
        nextLabel="Tillbaka till resultatet"
        onNext={() => setPhase("done")}
      />
    );
  }

  // Slutskärm
  return (
    <section className="flex flex-col items-center gap-6 py-4 text-center">
      <h1 className="font-tight text-3xl font-black sm:text-4xl">{heading}</h1>
      <p className="font-tight text-6xl font-black text-white">
        {score}/{duels.length}
      </p>
      <p
        className="text-3xl tracking-widest"
        aria-label={`${score} rätt av ${duels.length}`}
      >
        {duels.map((d, i) => (picks[i] === d.answer ? "🟩" : "🟥")).join("")}
      </p>
      <p className="max-w-sm text-[#cfe0f0]">{scoreComment(score)}</p>
      <ol className="flex w-full flex-col gap-2 text-left">
        {[
          ...duels.map((d, i) => ({ duel: d, pick: picks[i], isBonus: false })),
          ...(bonus && bonusPick
            ? [{ duel: bonus, pick: bonusPick, isBonus: true }]
            : []),
        ].map(({ duel: d, pick, isBonus }, i) => {
          const pricier = d.answer === "A" ? d.a : d.b;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${isBonus ? "border-accent/50 bg-accent/5" : "border-muted bg-surface"}`}
            >
              <span aria-hidden>{pick === d.answer ? "✅" : "❌"}</span>
              <span className="flex-1 text-[#cfe0f0]">
                {isBonus && (
                  <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    Bonus
                  </span>
                )}
                {summaryLine(d, { tomorrow: isBonus })}
              </span>
              <span className="font-semibold text-white">
                {formatCostShort(pricier.costKr)}
              </span>
            </li>
          );
        })}
      </ol>
      {bonus && !bonusPick && (
        <button
          type="button"
          onClick={() => setPhase("bonus")}
          className="w-full rounded-full border-2 border-accent px-6 py-3.5 font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          Spela bonusduellen om morgondagen (räknas inte)
        </button>
      )}
      <p className="text-sm text-[#8fafc9]">
        Nya dueller varje dag vid midnatt.
      </p>
    </section>
  );
}
