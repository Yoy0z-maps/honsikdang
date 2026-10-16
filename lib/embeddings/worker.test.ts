import { describe, expect, it, vi } from "vitest";
import { FixtureEmbedder, type Embedder } from "@/lib/ai/embeddings";
import { runEmbeddingJobs } from "./worker";

type Call = { fn: string; args: Record<string, unknown> };

function fakeClient(
  batches: { restaurant_id: string; content: string; content_hash: string }[][],
  reviewBatches: {
    review_id: string;
    content: string;
    content_hash: string;
  }[][] = [],
) {
  const calls: Call[] = [];
  const client = {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === "embedding_jobs_claim")
        return { data: batches.shift() ?? [], error: null };
      if (fn === "embedding_jobs_complete" || fn === "review_embeddings_store")
        return { data: (args.items as unknown[]).length, error: null };
      if (fn === "review_embedding_backlog")
        return { data: reviewBatches.shift() ?? [], error: null };
      return { data: null, error: null };
    }),
  };
  return { client: client as never, calls };
}

const job = (n: number) => ({
  restaurant_id: `r${n}`,
  content: `식당 ${n}`,
  content_hash: `h${n}`,
});

describe("runEmbeddingJobs", () => {
  it("claims, embeds and stores until the queue is empty", async () => {
    const { client, calls } = fakeClient([[job(1), job(2)], [job(3)]]);
    const report = await runEmbeddingJobs(client, new FixtureEmbedder());
    expect(report).toEqual({
      claimed: 3,
      stored: 3,
      failed: 0,
      tokens: 0,
      reviews: 0,
    });
    const complete = calls.find((c) => c.fn === "embedding_jobs_complete")!;
    expect(complete.args.model).toBe("fixture-embed");
    expect(
      (complete.args.items as { content_hash: string }[])[1].content_hash,
    ).toBe("h2");
  });

  it("releases a failed batch and stops", async () => {
    const { client, calls } = fakeClient([[job(1), job(2)], [job(3)]]);
    const broken: Embedder = {
      model: "m",
      embed: async () => {
        throw new Error("embeddings 503");
      },
    };
    const report = await runEmbeddingJobs(client, broken);
    expect(report).toMatchObject({ claimed: 2, stored: 0, failed: 2 });
    expect(calls.filter((c) => c.fn === "embedding_jobs_fail")).toHaveLength(2);
    expect(calls.filter((c) => c.fn === "embedding_jobs_claim")).toHaveLength(
      1,
    );
  });

  it("then stores review vectors from the backlog", async () => {
    const review = (n: number) => ({
      review_id: `v${n}`,
      content: `리뷰 ${n}`,
      content_hash: `rh${n}`,
    });
    const { client, calls } = fakeClient([[job(1)]], [[review(1), review(2)]]);
    const report = await runEmbeddingJobs(client, new FixtureEmbedder());
    expect(report).toMatchObject({ stored: 1, reviews: 2, failed: 0 });
    const store = calls.find((c) => c.fn === "review_embeddings_store")!;
    expect(
      (store.args.items as { review_id: string }[]).map((i) => i.review_id),
    ).toEqual(["v1", "v2"]);
  });
});
