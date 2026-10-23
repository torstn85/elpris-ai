-- spot_prices_daily — spotpris per elområde och svenskt kalenderdygn.
-- Körs manuellt i Supabase SQL Editor (repot har ingen migrationskedja).
-- Kör denna fil FÖRE spot_prices_monthly.sql, som bygger på vyn.
--
-- Underlag för /elpris-historik. Samma definitioner som
-- scripts/analysis/history-stats.ts:
--   - Tidsviktat: en timrad (före 2025-10-01) väger 60 min, en kvartsrad 15 min.
--     Dygnssnitt = ore_minutes / minutes (spotpris, öre/kWh exkl. moms).
--   - complete = periodernas minuter täcker hela det svenska dygnet
--     (1380/1440/1500 min: omställning till sommartid / vanligt dygn / omställning till normaltid). Dygn som helt saknas
--     i spot_prices (t.ex. de fem luckorna från källan) har ingen rad alls.
--   - Vyn innehåller alla dygn i tabellen, även dagens och (efter ca 13:15)
--     morgondagens. Filtrera på delivery_date < current_date för "till och med i går".
--
-- Vanlig vy (räknas vid varje fråga). Byts mot en materialiserad vy om den
-- blir långsam när tabellen växer.
--
-- Ny relation i public: explicit GRANT enligt CLAUDE.md (gäller från
-- 30 oktober 2026). Endast service role (servern) läser vyn.
-- security_invoker = true: vyn körs med anroparens rättigheter och kan aldrig
-- kringgå rättigheterna på spot_prices.

create or replace view public.spot_prices_daily
with (security_invoker = true) as
with periods as (
  select
    area,
    (delivery_period_start at time zone 'Europe/Stockholm')::date as delivery_date,
    resolution_minutes,
    ore_per_kwh
  from public.spot_prices
),
days as (
  select
    area,
    delivery_date,
    sum(ore_per_kwh * resolution_minutes)                                     as ore_minutes,
    sum(resolution_minutes)::int                                              as minutes,
    coalesce(sum(resolution_minutes) filter (where ore_per_kwh < 0), 0)::int  as neg_minutes,
    count(*)::int                                                             as periods,
    (count(*) filter (where ore_per_kwh < 0))::int                            as neg_periods,
    min(resolution_minutes)::smallint                                         as resolution_minutes,
    min(ore_per_kwh)                                                          as min_ore_per_kwh,
    max(ore_per_kwh)                                                          as max_ore_per_kwh
  from periods
  group by area, delivery_date
)
select
  d.area,
  d.delivery_date,
  d.ore_minutes,
  d.minutes,
  d.neg_minutes,
  d.periods,
  d.neg_periods,
  d.resolution_minutes,
  d.min_ore_per_kwh,
  d.max_ore_per_kwh,
  round(d.ore_minutes / d.minutes, 2)                                         as avg_ore_per_kwh,
  l.day_minutes,
  d.minutes = l.day_minutes                                                   as complete
from days d
cross join lateral (
  select (extract(epoch from (
    ((d.delivery_date + 1)::timestamp at time zone 'Europe/Stockholm')
    - (d.delivery_date::timestamp at time zone 'Europe/Stockholm')
  )) / 60)::int as day_minutes
) l;

revoke all on public.spot_prices_daily from anon, authenticated;
grant select on public.spot_prices_daily to service_role;

comment on view public.spot_prices_daily is
  'Spotpris per elområde och svenskt dygn, tidsviktat (60/15 min). complete = hela dygnet täckt. Endast service role.';

-- Kontroll efter körning (ska stämma med scripts/analysis/history-stats.ts):
--   select area, delivery_date, avg_ore_per_kwh from public.spot_prices_daily
--   where (area, delivery_date) in (('SE3', '2022-08-23'), ('SE1', '2023-07-16'));
--   -- väntat: SE3 2022-08-23 ≈ 515,0 · SE1 2023-07-16 ≈ −9,6
--   select area, count(*) filter (where not complete) as ofullstandiga, count(*) as dygn
--   from public.spot_prices_daily group by area order by area;
--   -- väntat: 0 ofullständiga per område
