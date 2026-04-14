import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialised so missing env vars don't crash the build.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY");
  // Server-side client using the secret key (service role).
  // Never expose this to the browser.
  _client = createClient(url, key);
  return _client;
}

// Use this everywhere instead of importing the client directly.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Database types ───────────────────────────────────────────────────────────

export interface SpotPriceRow {
  id?: number;
  area: "SE1" | "SE2" | "SE3" | "SE4";
  delivery_period_start: string; // ISO 8601
  delivery_period_end: string;   // ISO 8601
  sek_per_kwh: number;
  ore_per_kwh: number;
  created_at?: string;
}
