export type ParserUsage = { inputTokens: number; outputTokens: number };

export type ParserResult = {
  /** Untrusted model output; validate with parseModelOutput. */
  raw: unknown;
  usage: ParserUsage;
  model: string;
};

/** Natural-language query → structured conditions (WP-05a). */
export interface QueryParser {
  readonly model: string;
  parse(query: string, signal: AbortSignal): Promise<ParserResult>;
}

export class ParserError extends Error {
  constructor(
    readonly kind: "http" | "refusal" | "truncated" | "invalid_json",
    message: string,
    readonly usage?: ParserUsage,
  ) {
    super(message);
  }
}
