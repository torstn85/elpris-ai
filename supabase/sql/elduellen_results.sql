-- Elduellen — resultat per spelare och dag.
-- Körs manuellt i Supabase SQL Editor (repot har ingen migrationskedja).
--
-- Skrivs och läses ENDAST av server-routes med service role
-- (POST /api/elduellen/result, GET /api/elduellen/stats). RLS är påslaget utan
-- policyer, så anon/authenticated-nycklar kommer inte åt tabellen alls.

create table if not exists public.elduellen_results (
  puzzle_date date        not null,
  player_id   uuid        not null,
  -- A/B per duell, i ordning (duell 1–5). Bonusduellen räknas inte och sparas inte.
  picks       text[]      not null
    check (array_length(picks, 1) = 5 and picks <@ array['A', 'B']::text[]),
  -- Räknas om på servern från dagens pussel — klientens poäng används aldrig.
  score       smallint    not null check (score between 0 and 5),
  created_at  timestamptz not null default now(),
  primary key (puzzle_date, player_id)
);

alter table public.elduellen_results enable row level security;

revoke all on table public.elduellen_results from anon, authenticated;

comment on table public.elduellen_results is
  'Elduellen: ett resultat per spelare och dag. Endast service role (server-routes).';
