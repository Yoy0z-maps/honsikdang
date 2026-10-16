// Text embeddings (WP-05b, decision Q44). Verified 2026-10-16:
// https://platform.claude.com/docs/en/build-with-claude/embeddings
//   POST {base}/embeddings  {input[], model, input_type: "query"|"document"}
//   → {data: [{embedding, index}], usage: {total_tokens}}; vectors are
//   normalized to length 1 (cosine = dot product). Atlas model API keys use
//   https://ai.mongodb.com/v1.

export const EMBEDDING_DIMENSIONS = 1024;

export type EmbedInputType = "query" | "document";

export type EmbedResult = { vectors: number[][]; tokens: number };

export interface Embedder {
  readonly model: string;
  embed(
    texts: string[],
    inputType: EmbedInputType,
    signal: AbortSignal,
  ): Promise<EmbedResult>;
}

export class EmbeddingError extends Error {}

type EmbeddingsResponse = {
  data?: { embedding?: unknown; index?: number }[];
  usage?: { total_tokens?: number };
};

function isVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === EMBEDDING_DIMENSIONS &&
    value.every((x) => typeof x === "number" && Number.isFinite(x))
  );
}

export class VoyageEmbedder implements Embedder {
  readonly model = "voyage-4";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://ai.mongodb.com/v1",
  ) {}

  async embed(
    texts: string[],
    inputType: EmbedInputType,
    signal: AbortSignal,
  ): Promise<EmbedResult> {
    if (texts.length === 0) return { vectors: [], tokens: 0 };
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSIONS,
      }),
    });
    // Status only: error bodies may echo the input.
    if (!res.ok) throw new EmbeddingError(`embeddings ${res.status}`);
    const body = (await res.json()) as EmbeddingsResponse;
    const vectors: number[][] = new Array(texts.length);
    for (const item of body.data ?? []) {
      if (typeof item.index === "number" && isVector(item.embedding)) {
        vectors[item.index] = item.embedding;
      }
    }
    if (vectors.filter(Boolean).length !== texts.length) {
      throw new EmbeddingError("embeddings response shape");
    }
    return { vectors, tokens: body.usage?.total_tokens ?? 0 };
  }
}

/**
 * TEST FIXTURE, not a product feature: hashes character bigrams into a
 * normalized vector so texts sharing words are similar. Lets e2e tests and
 * the retrieval harness run without a key; it says nothing about the real
 * model's quality.
 */
export class FixtureEmbedder implements Embedder {
  readonly model = "fixture-embed";

  async embed(texts: string[]): Promise<EmbedResult> {
    return { vectors: texts.map(fixtureVector), tokens: 0 };
  }
}

export function fixtureVector(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const s = text.replace(/\s+/g, " ").trim();
  for (let i = 0; i < s.length - 1; i++) {
    const gram = s.slice(i, i + 2);
    if (gram.includes(" ")) continue;
    let h = 2166136261;
    for (const ch of gram) {
      h ^= ch.codePointAt(0)!;
      h = Math.imul(h, 16777619);
    }
    v[(h >>> 0) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** pgvector text literal. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
