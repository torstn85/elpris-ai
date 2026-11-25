-- Prishämtning: pg_cron + pg_net anropar /api/cron/fetch-prices.
-- Körs manuellt i Supabase → SQL Editor. Idempotent: befintliga jobb med samma
-- namn avregistreras först, så filen kan köras om efter ändringar.
--
-- Schema (pg_cron i Supabase kör i UTC):
--   fetch-prices-publicering  */10 11-16 * * *       var 10:e minut 11:00–16:50 UTC
--                                                   (13:15 svensk tid = 11:15 UTC sommartid,
--                                                   12:15 UTC normaltid — båda täcks)
--   fetch-prices-bas          0 2,5,8,17,20,23 * * *  var tredje timme resten av dygnet
--
-- Hemligheten läses ur Vault (vault.decrypted_secrets, namn cron_secret) varje
-- gång jobbet körs. Den står aldrig i cron.job.command eller i cron.job_run_details.
-- GitHub-workflowen (.github/workflows/fetch-prices.yml) ligger kvar som reserv;
-- dubbla anrop är ofarliga (upsert på area + delivery_period_start).
--
-- Skapar inga tabeller i public, så GRANT-regeln i CLAUDE.md gäller inte här.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Avbryt om hemligheten saknas: annars skickas "Authorization: null" och varje
-- anrop får 401.
do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'cron_secret' and coalesce(decrypted_secret, '') <> ''
  ) then
    raise exception 'Vault-hemligheten cron_secret saknas eller är tom';
  end if;
end
$$;

do $$
declare
  j text;
begin
  foreach j in array array['fetch-prices-publicering', 'fetch-prices-bas'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end
$$;

-- Samma anrop för båda jobben. timeout 30 s: routen hämtar upp till åtta filer
-- från elprisetjustnu och gör upsert (pg_net har 5 s som standard).
select cron.schedule(
  'fetch-prices-publicering',
  '*/10 11-16 * * *',
  $job$
  select net.http_get(
    url := 'https://www.elpris.ai/api/cron/fetch-prices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  )
  $job$
);

select cron.schedule(
  'fetch-prices-bas',
  '0 2,5,8,17,20,23 * * *',
  $job$
  select net.http_get(
    url := 'https://www.elpris.ai/api/cron/fetch-prices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  )
  $job$
);

-- ─── Kontroll ─────────────────────────────────────────────────────────────────
--
-- Jobben (command innehåller bara Vault-uppslaget, aldrig hemligheten):
--   select jobid, jobname, schedule, active from cron.job
--   where jobname like 'fetch-prices-%' order by jobname;
--
-- Senaste körningarna i pg_cron (lyckad = anropet köades, inte att routen svarade 200):
--   select j.jobname, d.status, d.start_time, d.return_message
--   from cron.job_run_details d join cron.job j using (jobid)
--   where j.jobname like 'fetch-prices-%'
--   order by d.start_time desc limit 10;
--
-- Senaste HTTP-svaren (pg_net sparar dem i 6 timmar). Väljer bara svarsfält:
-- förfrågans headers, och därmed hemligheten, finns inte i den här tabellen.
-- Väntat: status_code 200 och content som börjar med {"ok":true,...
--   select id, created, status_code, timed_out, error_msg, left(content, 200) as content_start
--   from net._http_response
--   order by created desc limit 10;
