-- Elduellen: gallra resultat äldre än 13 månader.
-- Nattligt pg_cron-jobb kl 03:17 UTC (pg_cron i Supabase kör i UTC).
-- Idempotent: ett befintligt jobb med samma namn avregistreras först.
-- Körs manuellt i Supabase → SQL Editor.

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'elduellen-retention') then
    perform cron.unschedule('elduellen-retention');
  end if;
end
$$;

select cron.schedule(
  'elduellen-retention',
  '17 3 * * *',
  $job$delete from public.elduellen_results where puzzle_date < (current_date - interval '13 months')$job$
);
