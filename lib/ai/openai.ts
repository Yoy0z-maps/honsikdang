import "server-only";
import { AI_QUERY_JSON_SCHEMA } from "@/lib/domain/ai-query";
import { SYSTEM_PROMPT, userMessage } from "./prompt";
import { ParserError, type ParserResult, type QueryParser } from "./types";

// Verified 2026-10-16 (specs/decisions.md §20):
// https://developers.openai.com/api/docs/models/gpt-6-luna
// https://developers.openai.com/api/docs/guides/structured-outputs
//   POST /v1/responses with text.format {type: "json_schema", name, strict,
//   schema}; output[] message → content[] parts of type "output_text" or
//   "refusal"; status "incomplete" (max_output_tokens) may be truncated.
//   gpt-6-luna supports Structured Outputs and reasoning effort "none".
const ENDPOINT = "https://api.openai.com/v1/responses";
export const OPENAI_PARSER_MODEL = "gpt-6-luna";

type ResponsesBody = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: {
    type?: string;
    content?: { type?: string; text?: string; refusal?: string }[];
  }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class OpenAIQueryParser implements QueryParser {
  readonly model = OPENAI_PARSER_MODEL;

  constructor(private readonly apiKey: string) {}

  async parse(query: string, signal: AbortSignal): Promise<ParserResult> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        instructions: SYSTEM_PROMPT,
        input: userMessage(query),
        reasoning: { effort: "none" },
        max_output_tokens: 400,
        // Q42: do not keep queries on the provider side for later retrieval.
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "search_conditions",
            strict: true,
            schema: AI_QUERY_JSON_SCHEMA,
          },
        },
      }),
    });
    if (!res.ok) {
      // Status and OpenAI's short error code only (e.g. rate_limit_exceeded
      // vs insufficient_quota, both 429); never the message, which may
      // echo request details.
      const code = await res
        .json()
        .then((b: { error?: { code?: unknown } }) => b?.error?.code)
        .catch(() => undefined);
      const safe =
        typeof code === "string" && /^[a-z0-9_]{1,40}$/.test(code)
          ? ` ${code}`
          : "";
      throw new ParserError("http", `openai ${res.status}${safe}`);
    }
    const body = (await res.json()) as ResponsesBody;
    const usage = {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    };
    if (body.status === "incomplete") {
      throw new ParserError("truncated", "incomplete", usage);
    }
    const parts = (body.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? []);
    if (parts.some((part) => part.type === "refusal")) {
      throw new ParserError("refusal", "refusal", usage);
    }
    const text = parts.find((part) => part.type === "output_text")?.text ?? "";
    try {
      return { raw: JSON.parse(text), usage, model: this.model };
    } catch {
      throw new ParserError("invalid_json", "invalid json", usage);
    }
  }
}
