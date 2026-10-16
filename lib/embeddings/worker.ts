import type { SupabaseClient } from "@supabase/supabase-js";
import type { Embedder } from "@/lib/ai/embeddings";
import type { Database } from "@/lib/supabase/database.types";

export const EMBED_BATCH = 16;
const EMBED_TIMEOUT_MS = 20_000;

export type WorkerReport = {
  claimed: number;
  stored: number;
  failed: number;
  tokens: number;
};

/**
 * Drains the embedding queue (decision Q46): claim → embed as documents →
 * store. A failed batch releases its jobs for a later run (max 5 attempts).
 * `client` must be the secret-key client; the RPCs are service_role only.
 */
export async function runEmbeddingJobs(
  client: SupabaseClient<Database>,
  embedder: Embedder,
  maxBatches = 10,
  batchSize = EMBED_BATCH,
  timeoutMs = EMBED_TIMEOUT_MS,
): Promise<WorkerReport> {
  const report: WorkerReport = { claimed: 0, stored: 0, failed: 0, tokens: 0 };
  for (let i = 0; i < maxBatches; i++) {
    const { data: jobs, error } = await client.rpc("embedding_jobs_claim", {
      batch: batchSize,
      model: embedder.model,
    });
    if (error) throw new Error(`claim failed: ${error.code}`);
    if (jobs.length === 0) break;
    report.claimed += jobs.length;

    try {
      const { vectors, tokens } = await embedder.embed(
        jobs.map((job) => job.content),
        "document",
        AbortSignal.timeout(timeoutMs),
      );
      report.tokens += tokens;
      const { data: stored, error: storeError } = await client.rpc(
        "embedding_jobs_complete",
        {
          model: embedder.model,
          items: jobs.map((job, index) => ({
            restaurant_id: job.restaurant_id,
            content_hash: job.content_hash,
            embedding: vectors[index],
          })),
        },
      );
      if (storeError) throw new Error(`store failed: ${storeError.code}`);
      report.stored += stored;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown";
      report.failed += jobs.length;
      await Promise.all(
        jobs.map((job) =>
          client.rpc("embedding_jobs_fail", {
            restaurant_id: job.restaurant_id,
            error: message,
          }),
        ),
      );
      break;
    }
  }
  return report;
}
