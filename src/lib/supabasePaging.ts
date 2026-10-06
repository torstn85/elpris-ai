// Supabase/PostgREST returnerar högst ~1 000 rader per fråga (db-max-rows) och
// trunkerar tyst. Frågor som kan ge fler rader måste pagineras.
//
// Krav på frågan: en UNIK sortering (t.ex. .order("delivery_period_start").order("id")),
// annars kan rader hoppas över eller dubbleras mellan sidorna.

type PageResult<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

/**
 * Hämtar alla rader genom att anropa `page(from, to)` (inklusive gränser, som
 * Supabase `.range()`) tills en tom sida kommer tillbaka. Går vidare med antalet
 * rader som faktiskt kom — fungerar även om servern har en lägre radgräns än
 * `pageSize`.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PageResult<T>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return out;
    for (const row of rows) out.push(row);
    from += rows.length;
  }
}
