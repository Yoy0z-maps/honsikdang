import { parseModelOutput, type ParsedQuery } from "@/lib/domain/ai-query";
import type { ParserUsage, QueryParser } from "./types";

export const PARSE_TIMEOUT_MS = 4000;

export type InterpretOutcome = "ok" | "invalid_output" | "timeout" | "error";

export type Interpretation = {
  outcome: InterpretOutcome;
  parsed: ParsedQuery | null;
  usage: ParserUsage;
  latencyMs: number;
};

/**
 * Runs the parser with a hard timeout and validates its output. Never
 * throws: any failure becomes an outcome the caller turns into the
 * keyword-search fallback.
 */
export async function interpretQuery(
  parser: QueryParser,
  query: string,
  timeoutMs = PARSE_TIMEOUT_MS,
): Promise<Interpretation> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const result = await parser.parse(query, signal);
    const parsed = parseModelOutput(result.raw);
    return {
      outcome: parsed ? "ok" : "invalid_output",
      parsed,
      usage: result.usage,
      latencyMs: elapsed(),
    };
  } catch (error) {
    const usage = (error as { usage?: ParserUsage }).usage ?? {
      inputTokens: 0,
      outputTokens: 0,
    };
    const timedOut =
      signal.aborted ||
      (error instanceof DOMException && error.name === "TimeoutError");
    const invalid =
      (error as { kind?: string }).kind === "invalid_json" ||
      (error as { kind?: string }).kind === "truncated";
    return {
      outcome: timedOut ? "timeout" : invalid ? "invalid_output" : "error",
      parsed: null,
      usage,
      latencyMs: elapsed(),
    };
  }
}
