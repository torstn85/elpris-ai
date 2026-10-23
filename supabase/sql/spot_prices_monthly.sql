-- spot_prices_monthly — spotpris per elområde och kalendermånad.
-- Körs manuellt i Supabase SQL Editor (repot har ingen migrationskedja).
-- Kräver public.spot_prices_daily (kör spot_prices_daily.sql först).
--
-- Underlag för /elpris-historik. Bara fullständiga dygn (complete) räknas.
-- Summorna (ore_minutes, minutes) är oavrundade så att år och säsonger kan
-- räknas exakt tidsviktat ur månaderna: Σ ore_minutes / Σ minutes.
--
--   complete_days  fullständiga dygn med data i månaden
--   calendar_days  dygn i kalendermånaden
--   Skillnaden är dygn som saknas (luckor i källan), plus dygn utanför datan i
--   första månaden och dygn som inte inträffat än i innevarande månad.
--   Vyn innehåller även dagens och morgondagens dygn (se spot_prices_daily) –
--   filtrera innevarande månad i sidan om den ska sluta i går.
--
-- Ny relation i public: explicit GRANT enligt CLAUDE.md (gäller från
-- 30 oktober 2026). Endast service role (servern) läser vyn.
-- security_invoker = true: vyn körs med anroparens rättigheter.

create or replace view public.spot_prices_monthly
with (security_invoker = true) as
select
  area,
  date_trunc('month', delivery_date)::date                                    as month,
  sum(ore_minutes)                                                            as ore_minutes,
  sum(minutes)::int                                                           as minutes,
  sum(neg_minutes)::int                                                       as neg_minutes,
  sum(periods)::int                                                           as periods,
  sum(neg_periods)::int                                                       as neg_periods,
  round(sum(ore_minutes) / sum(minutes), 2)                                   as avg_ore_per_kwh,
  count(*)::int                                                               as complete_days,
  extract(day from date_trunc('month', delivery_date)
    + interval '1 month' - interval '1 day')::int                             as calendar_days,
  min(delivery_date)                                                          as first_day,
  max(delivery_date)                                                          as last_day
from public.spot_prices_daily
where complete
group by area, date_trunc('month', delivery_date);

revoke all on public.spot_prices_monthly from anon, authenticated;
grant select on public.spot_prices_monthly to service_role;

comment on view public.spot_prices_monthly is
  'Spotpris per elområde och månad, tidsviktat över fullständiga dygn. Summor oavrundade för år/säsong. Endast service role.';

-- Kontroll efter körning (ska stämma med scripts/analysis/history-stats.ts):
--   select area, month, avg_ore_per_kwh, complete_days, calendar_days
--   from public.spot_prices_monthly
--   where month in ('2022-09-01', '2022-12-01') order by month, area;
--   -- väntat: 2022-12 SE1 205,9 · SE2 206,0 · SE3 268,9 · SE4 271,4 (31/31);
--   --         2022-09 SE2 98,9 med 27 av 30 dygn (tre luckor)
