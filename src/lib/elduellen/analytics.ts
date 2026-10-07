// GA4-events för Elduellen. window.gtag sätts av src/components/ConsentManager.tsx
// först när besökaren samtyckt till statistik i Cookiebot — utan samtycke finns
// den inte, och anropen blir tysta no-ops (inget köas för senare utskick).

type GtagParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: GtagParams) => void;
  }
}

export type ElduellenEvent =
  | "elduellen_start"
  | "elduellen_complete"
  | "elduellen_share"
  | "elduellen_shared_visit";

export function track(event: ElduellenEvent, params: GtagParams = {}): void {
  try {
    window.gtag?.("event", event, params);
  } catch {
    // Analys får aldrig störa spelet.
  }
}

/**
 * Som track(), men väntar upp till `timeoutMs` på att gtag laddats — för event
 * vid sidladdning, när gtag-skriptet (afterInteractive) kanske inte körts än.
 * Utan samtycke dyker gtag aldrig upp och inget skickas.
 */
export function trackWhenReady(
  event: ElduellenEvent,
  params: GtagParams = {},
  timeoutMs = 10_000,
): void {
  const started = Date.now();
  const attempt = () => {
    if (typeof window.gtag === "function") return track(event, params);
    if (Date.now() - started < timeoutMs) window.setTimeout(attempt, 250);
  };
  attempt();
}
