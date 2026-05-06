// Voyage AI embedding-klient.
//
// voyage-3-lite returns 512-dim embeddings (model is locked at this dim).
// Supabase article_chunks.embedding is vector(512) to match.
// Quality test confirmed strong semantic separation in Swedish at 512 dim.
//
//   - Modell: voyage-3-lite (gratis 200M tokens/månad)
//   - embedTexts: input_type=document, batchar upp till 128 texts/request
//   - embedQuery: input_type=query, single
//   - Retry vid 429 (max 2 försök, 2s delay)

export const EMBEDDING_DIMENSION = 512;

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';
const MAX_BATCH_SIZE = 128;
// Voyage free-tier utan betalmetod = 3 RPM (~20s mellan requests).
// Ge retry-delayet marginal över 20s.
const RETRY_DELAY_MS = 21_000;
const MAX_RETRIES = 2;

interface VoyageEmbeddingItem {
  object: string;
  embedding: number[];
  index: number;
}

interface VoyageResponse {
  object: string;
  data: VoyageEmbeddingItem[];
  model: string;
  usage: { total_tokens: number };
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error(
      'VOYAGE_API_KEY saknas i miljön. Lägg till den i .env.local eller exportera innan körning.',
    );
  }
  return key;
}

async function callVoyage(
  texts: string[],
  inputType: 'document' | 'query',
): Promise<{ embeddings: number[][]; tokens: number }> {
  const apiKey = getApiKey();

  let attempt = 0;
  while (true) {
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: MODEL,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSION,
      }),
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      attempt++;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as VoyageResponse;
    // Voyage returnerar i input-ordning, men sortera defensivt på index.
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    const embeddings = sorted.map((d) => d.embedding);

    // Sanity-check dimension så vi inte tyst skickar fel storlek till pgvector.
    if (embeddings.length > 0 && embeddings[0].length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Voyage returned dimension ${embeddings[0].length}, expected ${EMBEDDING_DIMENSION} — check output_dimension parameter`,
      );
    }

    return {
      embeddings,
      tokens: json.usage.total_tokens,
    };
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const { embeddings, tokens } = await callVoyage(batch, 'document');
    allEmbeddings.push(...embeddings);
    totalTokens += tokens;
  }

  console.log(
    `[voyage] embedTexts: ${texts.length} dokument, ${totalTokens} tokens`,
  );
  return allEmbeddings;
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embeddings, tokens } = await callVoyage([query], 'query');
  console.log(`[voyage] embedQuery: ${tokens} tokens`);
  return embeddings[0];
}
