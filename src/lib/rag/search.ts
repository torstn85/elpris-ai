// Semantisk sökning i article_chunks via pgvector cosinus-likhet.
//
// ───────────────────────────────────────────────────────────────────────────
// REQUIRED: kör denna SQL i Supabase SQL Editor INNAN första anropet:
// ───────────────────────────────────────────────────────────────────────────
//
//   create or replace function match_article_chunks (
//     query_embedding vector(512),
//     match_threshold float default 0.4,
//     match_count int default 5,
//     category_filter text default null
//   )
//   returns table (
//     chunk_text text,
//     article_slug text,
//     category text,
//     heading_path text,
//     similarity float
//   )
//   language sql stable
//   as $$
//     select
//       article_chunks.chunk_text,
//       article_chunks.article_slug,
//       article_chunks.category,
//       article_chunks.heading_path,
//       1 - (article_chunks.embedding <=> query_embedding) as similarity
//     from article_chunks
//     where 1 - (article_chunks.embedding <=> query_embedding) >= match_threshold
//       and (category_filter is null or article_chunks.category = category_filter)
//     order by article_chunks.embedding <=> query_embedding asc
//     limit match_count;
//   $$;
//
// ───────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { embedQuery } from './embed';

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  categoryFilter?: string;
}

export interface SearchResult {
  chunk_text: string;
  article_slug: string;
  category: string;
  heading_path: string;
  similarity: number;
}

let _client: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY');
  _client = createClient(url, key);
  return _client;
}

export async function searchKnowledge(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 5;
  const minSimilarity = options.minSimilarity ?? 0.4;
  const categoryFilter = options.categoryFilter ?? null;

  const queryEmbedding = await embedQuery(query);
  const client = getSupabase();

  const { data, error } = await client.rpc('match_article_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: minSimilarity,
    match_count: limit,
    category_filter: categoryFilter,
  });

  if (error) {
    throw new Error(`match_article_chunks RPC failed: ${error.message}`);
  }

  // Redan sorterad DESC på similarity och filtrerad mot tröskeln av SQL-funktionen
  return (data ?? []) as SearchResult[];
}
