-- spot_prices — upplösning per rad (15 eller 60 minuter).
-- Körs manuellt i Supabase SQL Editor (repot har ingen migrationskedja).
--
-- Befintlig tabell (skapad utanför repot, dokumenteras här):
--
--   public.spot_prices
--     id                     bigint       primary key
--     area                   text         not null   -- 'SE1' | 'SE2' | 'SE3' | 'SE4'
--     delivery_period_start  timestamptz  not null   -- periodens start (UTC)
--     delivery_period_end    timestamptz  not null   -- periodens slut (UTC)
--     sek_per_kwh            numeric      not null   -- spotpris exkl. moms, SEK/kWh
--     ore_per_kwh            numeric      not null   -- round(sek_per_kwh × 10000) / 100
--     created_at             timestamptz
--   unik nyckel: (area, delivery_period_start) — upsert i /api/cron/fetch-prices
--
-- Skrivs och läses endast av servern med service role. Tabellen finns redan, så
-- GRANT-regeln i CLAUDE.md (nya tabeller från 30 oktober 2026) gäller inte här.
--
-- Kvartspriser (15 min) från 1 oktober 2025, timpriser (60 min) före dess.
-- resolution_minutes räknas fram ur start och slut och kan inte hamna ur fas
-- med tiderna; varken cron-jobbet eller importskript skriver kolumnen.
-- Läsare som förutsätter kvartar filtrerar på resolution_minutes = 15.

alter table public.spot_prices
  add column if not exists resolution_minutes smallint
  generated always as (
    (extract(epoch from (delivery_period_end - delivery_period_start)) / 60)::smallint
  ) stored;

alter table public.spot_prices
  drop constraint if exists spot_prices_resolution_chk;

alter table public.spot_prices
  add constraint spot_prices_resolution_chk check (resolution_minutes in (15, 60));

comment on column public.spot_prices.resolution_minutes is
  'Periodens längd i minuter (15 = kvartspris, 60 = timpris). Genererad ur delivery_period_start/end.';
