import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { OpenAIQueryParser } = await import("./openai");
const { AI_QUERY_JSON_SCHEMA } = await import("@/lib/domain/ai-query");

const conditions = {
  categories: ["japanese"],
  required_tags: [],
  max_price_krw: 10000,
  radius_m: null,
  keyword: null,
  place_mention: null,
  semantic_query: null,
  unsupported: [],
};

function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const parse = () =>
  new OpenAIQueryParser("k").parse(
    "만 원 이하 라멘",
    AbortSignal.timeout(1000),
  );

describe("OpenAIQueryParser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a strict JSON-schema Responses request without storing it", async () => {
    const fetchMock = respond({
      status: "completed",
      output: [
        { type: "reasoning" },
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(conditions) }],
        },
      ],
      usage: { input_tokens: 900, output_tokens: 60 },
    });
    const result = await parse();
    expect(result).toEqual({
      raw: conditions,
      usage: { inputTokens: 900, outputTokens: 60 },
      model: "gpt-6-luna",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer k");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      reasoning: { effort: "none" },
      store: false,
      max_output_tokens: 400,
      input: "<query>만 원 이하 라멘</query>",
      text: {
        format: {
          type: "json_schema",
          name: "search_conditions",
          strict: true,
          schema: AI_QUERY_JSON_SCHEMA,
        },
      },
    });
    expect(body).not.toHaveProperty("temperature");
  });

  it("maps refusals, truncation and errors to parser errors", async () => {
    respond({
      status: "completed",
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "no" }] },
      ],
    });
    await expect(parse()).rejects.toMatchObject({ kind: "refusal" });

    respond({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      usage: { input_tokens: 900, output_tokens: 400 },
    });
    await expect(parse()).rejects.toMatchObject({
      kind: "truncated",
      usage: { inputTokens: 900, outputTokens: 400 },
    });

    respond(
      { error: { message: "echo of input", code: "insufficient_quota" } },
      429,
    );
    const error = (await parse().catch((e: Error) => e)) as Error;
    expect(error.message).toBe("openai 429 insufficient_quota");
    expect(error.message).not.toContain("echo");

    respond({
      status: "completed",
      output: [
        { type: "message", content: [{ type: "output_text", text: "{" }] },
      ],
    });
    await expect(parse()).rejects.toMatchObject({ kind: "invalid_json" });
  });
});
