// GA4-events för Elduellen. gtag laddas i layout.tsx och blockeras av Cookiebot
// tills besökaren samtyckt till statistik — då finns window.gtag inte, och
// anropen blir tysta no-ops.

type GtagParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: GtagParams) => void;
  }
}

export type ElduellenEvent =
  "elduellen_start" | "elduellen_complete" | "elduellen_share";

export function track(event: ElduellenEvent, params: GtagParams = {}): void {
  try {
    window.gtag?.("event", event, params);
  } catch {
    // Analys får aldrig störa spelet.
  }
}
