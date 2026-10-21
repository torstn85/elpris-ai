# elpris.ai

## Supabase

- Från 30 oktober 2026 ger Supabase inte längre automatiskt Data API-åtkomst till nya tabeller i `public`. Varje ny tabell i `supabase/sql/` ska ha explicit `GRANT` i samma fil, t.ex.

  ```sql
  grant select, insert, update, delete on public.<tabell> to service_role;
  ```

  (och `anon`/`authenticated` endast om tabellen ska nås från klienten – i dag ingen). Befintliga tabeller påverkas inte.
