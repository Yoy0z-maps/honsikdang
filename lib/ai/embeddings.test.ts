import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  EmbeddingError,
  VoyageEmbedder,
  fixtureVector,
  toVectorLiteral,
} from "./embeddings";

const dot = (a: number[], b: number[]) =>
  a.reduce((s, x, i) => s + x * b[i], 0);

describe("fixtureVector", () => {
  it("is normalized and deterministic", () => {
    const v = fixtureVector("조용한 라멘집");
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(Math.hypot(...v)).toBeCloseTo(1);
    expect(fixtureVector("조용한 라멘집")).toEqual(v);
  });

  it("scores shared words higher", () => {
    const q = fixtureVector("조용한 곳");
    expect(dot(q, fixtureVector("리뷰: 조용한 분위기"))).toBeGreaterThan(
      dot(q, fixtureVector("리뷰: 시끄러운 분위기")),
    );
  });
});

describe("VoyageEmbedder", () => {
  afterEach(() => vi.unstubAllGlobals());

  const vec = (x: number) => new Array(EMBEDDING_DIMENSIONS).fill(x);

  it("sends documented fields and orders vectors by index", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          { embedding: vec(0.2), index: 1 },
          { embedding: vec(0.1), index: 0 },
        ],
        usage: { total_tokens: 12 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new VoyageEmbedder("k").embed(
      ["a", "b"],
      "document",
      AbortSignal.timeout(1000),
    );
    expect(result.vectors[0][0]).toBe(0.1);
    expect(result.vectors[1][0]).toBe(0.2);
    expect(result.tokens).toBe(12);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://ai.mongodb.com/v1/embeddings");
    expect(JSON.parse(String(init.body))).toEqual({
      input: ["a", "b"],
      model: "voyage-4",
      input_type: "document",
      output_dimension: 1024,
    });
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer k");
  });

  it("rejects errors and wrong shapes without echoing the body", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response("secret input", { status: 400 }),
    );
    await expect(
      new VoyageEmbedder("k").embed(["a"], "query", AbortSignal.timeout(1000)),
    ).rejects.toThrow(new EmbeddingError("embeddings 400"));
    vi.stubGlobal("fetch", async () =>
      Response.json({ data: [{ embedding: [1, 2, 3], index: 0 }] }),
    );
    await expect(
      new VoyageEmbedder("k").embed(["a"], "query", AbortSignal.timeout(1000)),
    ).rejects.toThrow("shape");
  });
});

describe("toVectorLiteral", () => {
  it("formats pgvector text", () => {
    expect(toVectorLiteral([0.5, -1, 0])).toBe("[0.5,-1,0]");
  });
});

describe("RetryingEmbedder", () => {
  it("retries rate limits and passes other errors through", async () => {
    const { RetryingEmbedder, EmbeddingError } = await import("./embeddings");
    let calls = 0;
    const flaky = {
      model: "m",
      embed: async () => {
        calls++;
        if (calls < 3) throw new EmbeddingError("embeddings 429");
        return { vectors: [[1]], tokens: 1 };
      },
    };
    const result = await new RetryingEmbedder(flaky, 3, 1).embed(
      ["a"],
      "query",
      AbortSignal.timeout(1000),
    );
    expect(result.tokens).toBe(1);
    expect(calls).toBe(3);

    const broken = {
      model: "m",
      embed: async () => {
        throw new EmbeddingError("embeddings 400");
      },
    };
    await expect(
      new RetryingEmbedder(broken, 3, 1).embed(
        ["a"],
        "query",
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow("400");
  });
});
