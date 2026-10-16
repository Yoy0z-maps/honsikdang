import "server-only";
import { AI_QUERY_JSON_SCHEMA } from "@/lib/domain/ai-query";
import { SYSTEM_PROMPT, userMessage } from "./prompt";
import { ParserError, type ParserResult, type QueryParser } from "./types";

// Verified 2026-10-15 (specs/decisions.md §18): Messages API with
// output_config.format json_schema (GA, no beta header); Claude Haiku 5.5
// accepts thinking disabled at the default effort and rejects non-default
// sampling parameters, so none are sent.
const ENDPOINT = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_PARSER_MODEL = "claude-haiku-5-5";

type MessagesResponse = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicQueryParser implements QueryParser {
  readonly model = ANTHROPIC_PARSER_MODEL;

  constructor(private readonly apiKey: string) {}

  async parse(query: string, signal: AbortSignal): Promise<ParserResult> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 400,
        thinking: { type: "disabled" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage(query) }],
        output_config: {
          format: { type: "json_schema", schema: AI_QUERY_JSON_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      // Status only: error bodies may echo request details.
      throw new ParserError("http", `anthropic ${res.status}`);
    }
    const body = (await res.json()) as MessagesResponse;
    const usage = {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    };
    if (body.stop_reason === "refusal") {
      throw new ParserError("refusal", "refusal", usage);
    }
    if (body.stop_reason === "max_tokens") {
      throw new ParserError("truncated", "max_tokens", usage);
    }
    const text = body.content?.find((c) => c.type === "text")?.text ?? "";
    try {
      return { raw: JSON.parse(text), usage, model: this.model };
    } catch {
      throw new ParserError("invalid_json", "invalid json", usage);
    }
  }
}
