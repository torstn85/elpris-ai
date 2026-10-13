"use client";

// Statuskortet på /elpris-imorgon före publiceringen: nedräkning till 13:15
// (svensk tid, oberoende av webbläsarens tidszon). Från 13:10 frågar klienten
// /api/prices/tomorrow var 60:e sekund och laddar om sidan när priserna finns.
// Första renderingen använder serverns tid så att HTML och hydrering stämmer.

import { useEffect, useState } from "react";

const PUBLISH_MIN = 13 * 60 + 15;
const POLL_FROM_MIN = 13 * 60 + 10;
const TICK_MS = 30_000;
const POLL_MS = 60_000;
/** Högst en omladdning per två minuter — om API:t och sidan tillfälligt ger olika svar blir det ingen loop. */
const RELOAD_GUARD_MS = 2 * 60_000;
const RELOAD_KEY = "elpris-imorgon-reload";

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Utan sessionStorage: ladda om ändå.
  }
  window.location.reload();
}

const STOCKHOLM_HM = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Minuter sedan midnatt, svensk tid. */
function stockholmMinutes(ms: number): number {
  const [h, m] = STOCKHOLM_HM.format(new Date(ms)).split(":").map(Number);
  return (h % 24) * 60 + m;
}

export default function TomorrowStatus({ serverNow }: { serverNow: number }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const minutes = stockholmMinutes(now);
  const polling = minutes >= POLL_FROM_MIN;

  useEffect(() => {
    if (!polling) return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch("/api/prices/tomorrow", { cache: "no-store" });
        const data = (await res.json()) as { available?: boolean; areas?: unknown };
        if (!stopped && data.available !== false && data.areas) reloadOnce();
      } catch {
        // Nästa försök om en minut.
      }
    };
    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [polling]);

  const left = PUBLISH_MIN - minutes;
  const h = Math.floor(left / 60);
  const m = left % 60;

  return (
    <section className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 sm:p-8 max-w-3xl" aria-live="polite">
      <p className="font-bold text-xl sm:text-2xl text-white mb-2">
        Morgondagens priser publiceras runt kl 13:15
      </p>
      <p className="text-base text-[#8fafc9]">
        {left > 0
          ? `om ca ${h > 0 ? `${h} h ` : ""}${m} min`
          : "Priserna är på väg – de brukar dyka upp strax efter 13:15. Sidan uppdateras automatiskt."}
      </p>
    </section>
  );
}
