// Kontrollerar att "just nu"-delarna håller sig aktuella när en sida står öppen,
// med Playwrights klocka i webbläsaren. Fyra sidor × fyra fall:
//
//   (a) kvartsbyte  — sidan står öppen förbi nästa hel timme (även ett kvartsbyte)
//   (b) dold flik   — fliken döljs, klockan flyttas 45 min utan att timrar körs
//                     (som en fryst flik i iOS Safari), fliken visas igen
//   (c) midnatt     — sidan står öppen 23:58 → 00:01; omhämtning/refresh ska ske
//                     0–30 s efter midnatt (slumpad fördröjning), och bara en gång
//   (d) dygnsbyte i dold flik — fliken visas igen efter midnatt: refresh direkt
//
// Servern går på riktig tid. API-svaren mockas därför efter webbläsarens klocka,
// och efter midnatt får "nästa dygn" dagens priser förskjutna +24 h — även i
// router.refresh-svaret (RSC), där dagens datum skrivs om till nästa dag.
// Konsolfel om hydrering räknas som fel.
//
// Användning:
//   npm run test:live-refresh                       (startar next dev på port 3124)
//   LIVE_REFRESH_URL=http://localhost:3000 npm run test:live-refresh
//
// Kräver Playwrights Chromium: npx playwright install chromium
// Avslutar med exit 1 om något inte stämmer.

import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";
import { cheapestWindow, currentQuarter } from "../src/lib/prices/todaySummary";
import { isCurrentHour, type HourEntry } from "../src/lib/prices/hourly";
import type { QuarterPoint } from "../src/lib/prices/quarters";
import { formatClock } from "../src/lib/prices/quarterTicks";
import { quarterRangeLabel } from "../src/lib/prices/dstLabels";
import { ore1 } from "../src/lib/format/ore";

const AREA = "SE3"; // Göteborg ligger i SE3; startsidan tvingas till SE3 via /api/geo.
const CITY = "/elpris-idag/goteborg";
const PAGES = ["/", "/elpris-idag", CITY, "/elpris-imorgon"] as const;
type PagePath = (typeof PAGES)[number];

const Q = 15 * 60_000;
const DAY = 86_400_000;
const MAX_JITTER_MS = 30_000;

const SWEDISH_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const swedishDate = (ms: number) => SWEDISH_DATE.format(new Date(ms));
const HMS = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const hms = (ms: number) => HMS.format(new Date(ms));
const MINUTE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", minute: "numeric" });
const realWait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer(): Promise<{ base: string; proc: ChildProcess | null }> {
  if (process.env.LIVE_REFRESH_URL) return { base: process.env.LIVE_REFRESH_URL.replace(/\/$/, ""), proc: null };
  const port = 3124;
  const proc = spawn("npx", ["next", "dev", "-p", String(port)], { stdio: "ignore", detached: true });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/prices/today`)).ok) return { base, proc };
    } catch {
      // startar fortfarande
    }
    await realWait(1000);
  }
  throw new Error("next dev startade inte");
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Day {
  date: string;
  areas: Record<string, HourEntry[]>;
  quarters: Record<string, QuarterPoint[]>;
}

const plusDay = (iso: string) => new Date(Date.parse(iso) + DAY).toISOString();
const nextIsoDate = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + DAY).toISOString().slice(0, 10);

function shiftDay(d: Day): Day {
  const map = <T,>(rec: Record<string, T[]>, f: (x: T) => T) =>
    Object.fromEntries(Object.entries(rec).map(([a, xs]) => [a, xs.map(f)]));
  return {
    date: nextIsoDate(d.date),
    areas: map(d.areas, (h) => ({ ...h, startUTC: plusDay(h.startUTC), endUTC: plusDay(h.endUTC) })),
    quarters: map(d.quarters, (q) => ({ ...q, start: plusDay(q.start) })),
  };
}

/** Skriver om dagens datum (och UTC-datumet för dygnets första timme) till nästa dag i ett RSC-svar. */
function shiftPayload(text: string, today: Day): string {
  const firstUtcDate = today.quarters[AREA][0].start.slice(0, 10);
  const map = new Map([
    [firstUtcDate, nextIsoDate(firstUtcDate)],
    [today.date, nextIsoDate(today.date)],
  ]);
  return text.replace(/\d{4}-\d{2}-\d{2}/g, (d) => map.get(d) ?? d);
}

// ─── Förväntat ────────────────────────────────────────────────────────────────

function expected(today: Day, next: Day, t: number) {
  const day = swedishDate(t) === today.date ? today : next;
  const q = currentQuarter(day.quarters[AREA], t);
  const hour = day.areas[AREA].find((h) => isCurrentHour(h, t));
  const w = cheapestWindow(day.areas[AREA], t);
  const minute = Number(MINUTE.format(new Date(t)));
  return {
    price: q ? ore1(q.ore) : null,
    slot: q ? formatClock(q.start) : null,
    range: q ? `kl ${quarterRangeLabel(q.start)}` : null,
    hour: hour ? hour.label.slice(0, 11) : null,
    window: w ? `${w.start}–${w.end}` : null,
    nextIn: 15 - (minute % 15),
    countdown: (() => {
      const left = 13 * 60 + 15 - (Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", hour12: false }).format(new Date(t))) % 24) * 60 - minute;
      return left > 0 ? `om ca ${Math.floor(left / 60) > 0 ? `${Math.floor(left / 60)} h ` : ""}${left % 60} min` : "Priserna är på väg";
    })(),
  };
}
type Expected = ReturnType<typeof expected>;

// ─── Avläsning ────────────────────────────────────────────────────────────────

type Shown = Record<string, string | null | boolean>;

async function read(page: Page, path: PagePath): Promise<Shown> {
  return page.evaluate((path) => {
    const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).offsetParent !== null;
    const ps = Array.from(document.querySelectorAll("p"));
    const row = Array.from(document.querySelectorAll('tr[aria-current="time"]')).find(visible);
    const out: Record<string, string | null | boolean> = {
      markeradTimme: row?.querySelector("td")?.textContent?.trim().slice(0, 11) ?? null,
      nuMarkör: Array.from(document.querySelectorAll(".recharts-label")).some((l) => l.textContent === "Nu"),
      billigast: ps.find((p) => visible(p) && /resten av dagen/i.test(p.textContent ?? ""))?.querySelector("strong")?.textContent ?? null,
    };
    if (path === "/") {
      out.pris = document.querySelector("span.font-black")?.textContent?.trim() ?? null;
      out.badge = Array.from(document.querySelectorAll("span")).find((s) => s.textContent?.startsWith("· SE"))?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    } else if (path === "/elpris-idag") {
      const card = ps.find((p) => p.textContent?.startsWith("Just nu i"))?.parentElement;
      out.pris = card?.querySelector("p.font-extrabold")?.firstChild?.textContent?.trim() ?? null;
      out.kl = card?.querySelectorAll("p")[2]?.textContent?.trim() ?? null;
    } else if (path.startsWith("/elpris-idag/")) {
      const w = ps.find((p) => p.textContent?.includes("Spotpris just nu"))?.closest("div.my-8");
      out.pris = w?.querySelector("span.text-6xl")?.textContent?.trim() ?? null;
      out.uppdaterad = w?.querySelector("p.mt-3.text-xs")?.textContent?.trim() ?? null;
    } else {
      out.status = ps.find((p) => p.textContent?.startsWith("Morgondagens priser publiceras"))?.nextElementSibling?.textContent?.trim() ?? null;
    }
    return out;
  }, path);
}

/** [fält, visat, förväntat, ok] för sidans just nu-delar. */
function compare(path: PagePath, s: Shown, e: Expected): [string, unknown, unknown, boolean][] {
  const rows: [string, unknown, unknown, boolean][] = [];
  const eq = (k: string, want: unknown) => rows.push([k, s[k], want, s[k] === want]);
  if (path === "/") {
    eq("pris", e.price);
    const badge = String(s.badge ?? "");
    const want = `Uppdaterad ${e.slot} · Nästa om ${e.nextIn} min`;
    rows.push(["badge", badge, want, badge.includes(want)]);
    eq("nuMarkör", true);
  } else if (path === "/elpris-idag") {
    eq("pris", e.price);
    eq("kl", e.range);
    eq("markeradTimme", e.hour);
    eq("billigast", e.window);
    eq("nuMarkör", true);
  } else if (path === CITY) {
    eq("pris", e.price);
    eq("uppdaterad", `Uppdaterad ${e.slot}`);
    eq("markeradTimme", e.hour);
    eq("billigast", e.window);
    eq("nuMarkör", true);
  } else if (s.status !== null) {
    // Före publiceringen: nedräkning till 13:15.
    const st = String(s.status);
    rows.push(["status", st, e.countdown, st.startsWith(e.countdown)]);
  } else {
    // Efter publiceringen: morgondagens priser — ingen pågående timme eller Nu-markör.
    eq("markeradTimme", null);
    eq("nuMarkör", false);
  }
  return rows;
}

// ─── Körning ──────────────────────────────────────────────────────────────────

let failures = 0;
function report(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`    ${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
}

interface Ctx {
  page: Page;
  close: () => Promise<void>;
  /** Webbläsarens tid (ms) för varje omhämtning efter dygnsbyte: router.refresh (RSC) eller /api/prices/today. */
  dayFetches: { t: number; kind: string }[];
  hydrationErrors: string[];
}

async function open(browser: Browser, base: string, path: PagePath, today: Day, next: Day): Promise<Ctx> {
  const context = await browser.newContext({ locale: "sv-SE", timezoneId: "Europe/Stockholm", viewport: { width: 1280, height: 900 } });
  // tsx (esbuild keepNames) lägger __name(...) i funktioner som skickas till page.evaluate.
  await context.addInitScript("window.__name = (f) => f;");
  const page = await context.newPage();
  const ctx: Ctx = { page, close: () => context.close(), dayFetches: [], hydrationErrors: [] };
  const fakeNow = async () => page.evaluate(() => Date.now()).catch(() => Date.now());
  const isNext = (t: number) => swedishDate(t) !== today.date;

  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|did not match|server rendered|Text content does not match/i.test(m.text())) ctx.hydrationErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => /hydrat/i.test(e.message) && ctx.hydrationErrors.push(e.message.slice(0, 200)));

  await page.clock.install({ time: new Date() });
  await page.route("**/api/geo", (r) => r.fulfill({ json: { area: AREA } }));
  await page.route("**/api/prices/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const t = await fakeNow();
    const day = isNext(t) ? next : today;
    if (pathname === "/api/prices/current") {
      const body: Record<string, unknown> = { fetched_at: new Date(t).toISOString() };
      for (const [a, qs] of Object.entries(day.quarters)) {
        const q = currentQuarter(qs, t);
        body[a] = q?.ore ?? null;
        body.slot_start = q?.start ?? null;
      }
      return route.fulfill({ json: body });
    }
    if (pathname === "/api/prices/today") {
      if (isNext(t)) ctx.dayFetches.push({ t, kind: "/api/prices/today" });
      return route.fulfill({ json: { ...day, source: "test" } });
    }
    return route.continue();
  });
  // router.refresh: RSC-förfrågan mot sidans egen sökväg (inte förhämtning).
  await page.route((url) => url.pathname === path, async (route) => {
    const h = route.request().headers();
    if (h["rsc"] !== "1" || h["next-router-prefetch"]) return route.continue();
    const t = await fakeNow();
    if (!isNext(t)) return route.continue();
    ctx.dayFetches.push({ t, kind: "router.refresh" });
    const res = await route.fetch();
    const headers = { ...res.headers() };
    delete headers["content-length"];
    delete headers["content-encoding"];
    return route.fulfill({ status: res.status(), headers, body: shiftPayload(await res.text(), today) });
  });

  await page.goto(base + path, { waitUntil: "networkidle" });
  await realWait(500);
  return ctx;
}

async function setVisibility(page: Page, v: "hidden" | "visible") {
  await page.evaluate((v) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => v === "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, v);
}

/** Läser sidan tills allt stämmer eller tiden (verklig) tar slut; rapporterar sista avläsningen. */
async function checkpoint(label: string, ctx: Ctx, path: PagePath, today: Day, next: Day, timeoutMs = 4000) {
  const start = Date.now();
  let rows: [string, unknown, unknown, boolean][] = [];
  let t = 0;
  for (;;) {
    t = await ctx.page.evaluate(() => Date.now());
    rows = compare(path, await read(ctx.page, path), expected(today, next, t));
    if (rows.every((r) => r[3]) || Date.now() - start > timeoutMs) break;
    await realWait(250);
  }
  console.log(`  [${label}] webbläsarklocka ${hms(t)}`);
  for (const [k, shown, want, ok] of rows) report(k, ok, ok ? `${JSON.stringify(shown)}` : `visas ${JSON.stringify(shown)}, rätt ${JSON.stringify(want)}`);
}

function checkDayFetch(ctx: Ctx, path: PagePath, midnight: number, maxDelayMs: number) {
  const kind = path === "/" ? "/api/prices/today" : "router.refresh";
  const hits = ctx.dayFetches.filter((f) => f.kind === kind);
  const first = hits[0];
  const delay = first ? first.t - midnight : null;
  report(
    `${kind} efter dygnsbyte`,
    !!first && delay! >= 0 && delay! <= maxDelayMs,
    first ? `${(delay! / 1000).toFixed(1)} s efter ${maxDelayMs > 5000 ? "midnatt" : "dygnsbytet"} (gräns ${maxDelayMs / 1000} s)` : "ingen",
  );
  return hits.length;
}

async function main() {
  const { base, proc } = await startServer();
  const browser = await chromium.launch();
  try {
    const today: Day = await (await fetch(`${base}/api/prices/today`)).json();
    if (!today?.quarters?.[AREA]) throw new Error("/api/prices/today saknar kvartar");
    const next = shiftDay(today);
    const qs = today.quarters[AREA];
    const midnight = Date.parse(qs[qs.length - 1].start) + Q;
    // Värm upp next dev (första kompileringen kan ta längre tid än en avläsning).
    for (const path of PAGES) await fetch(base + path);

    for (const path of PAGES) {
      console.log(`\n══════ ${path} ══════`);

      // (a) Kvartsbyte (nästa hela timme) medan sidan står öppen.
      {
        const ctx = await open(browser, base, path, today, next);
        console.log("(a) kvartsbyte");
        await checkpoint("start", ctx, path, today, next, 15_000);
        const now = await ctx.page.evaluate(() => Date.now());
        const nextHour = Math.ceil((now + 1) / (4 * Q)) * 4 * Q;
        if (nextHour < midnight) {
          await ctx.page.clock.runFor(nextHour + 2000 - now);
          await checkpoint("2 s efter timbytet", ctx, path, today, next, 1500);
        } else console.log("  (hoppar över – nästa timbyte är midnatt)");
        report("inga hydreringsfel", ctx.hydrationErrors.length === 0, ctx.hydrationErrors.join(" | "));
        await ctx.close();
      }

      // (b) Dold flik 45 min, timrarna körs inte under tiden.
      {
        const ctx = await open(browser, base, path, today, next);
        console.log("(b) dold flik 45 min");
        const now = await ctx.page.evaluate(() => Date.now());
        if (now + 45 * 60_000 < midnight) {
          await setVisibility(ctx.page, "hidden");
          await ctx.page.clock.setSystemTime(now + 45 * 60_000);
          await setVisibility(ctx.page, "visible");
          await checkpoint("direkt när fliken visas", ctx, path, today, next, 1500);
        } else console.log("  (hoppar över – för nära midnatt)");
        await ctx.close();
      }

      // (c) Midnatt medan sidan står öppen.
      {
        const ctx = await open(browser, base, path, today, next);
        console.log("(c) midnatt");
        const now = await ctx.page.evaluate(() => Date.now());
        await ctx.page.clock.fastForward(midnight - 90_000 - now); // 23:58:30
        await ctx.page.clock.runFor(10_000);
        await checkpoint("23:58", ctx, path, today, next);
        await ctx.page.clock.runFor(midnight + MAX_JITTER_MS + 5000 - (await ctx.page.evaluate(() => Date.now())));
        await realWait(1500);
        checkDayFetch(ctx, path, midnight, MAX_JITTER_MS + 1500);
        await ctx.page.clock.runFor(midnight + 65_000 - (await ctx.page.evaluate(() => Date.now())));
        await checkpoint("00:01", ctx, path, today, next);
        await ctx.page.clock.runFor(3 * 60_000);
        await realWait(1000);
        // Startsidans /api/prices/today hämtas också av DailyPriceAnalysis var 5:e minut — räkna bara refresh.
        if (path !== "/") {
          const n = ctx.dayFetches.filter((f) => f.kind === "router.refresh").length;
          report("router.refresh bara en gång", n === 1, `${n} st t.o.m. 00:04`);
        }
        await ctx.close();
      }

      // (d) Fliken dold över midnatt, visas igen 00:20.
      {
        const ctx = await open(browser, base, path, today, next);
        console.log("(d) dold över midnatt, visas 00:20");
        await setVisibility(ctx.page, "hidden");
        const shown = midnight + 20 * 60_000;
        await ctx.page.clock.setSystemTime(shown);
        await setVisibility(ctx.page, "visible");
        await realWait(1500);
        checkDayFetch(ctx, path, shown, 1500);
        await checkpoint("00:20", ctx, path, today, next);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    if (proc?.pid) process.kill(-proc.pid);
  }
  console.log(failures === 0 ? "\nAlla kontroller OK." : `\n${failures} kontroll(er) misslyckades.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
