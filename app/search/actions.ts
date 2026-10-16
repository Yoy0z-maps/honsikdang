"use server";

import { getQueryParser } from "@/lib/ai";
import { interpretQuery } from "@/lib/ai/interpret";
import { PROMPT_VERSION } from "@/lib/ai/prompt";
import { normalizeAiQuery, type ParsedQuery } from "@/lib/domain/ai-query";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type FallbackReason =
  "unavailable" | "budget" | "timeout" | "invalid_output" | "error";

export type AiSearchResult =
  | { status: "ok"; parsed: ParsedQuery }
  | { status: "fallback"; reason: FallbackReason }
  | { status: "login_required" }
  | { status: "limit" }
  | { status: "invalid_query" };

// ≈ ₩5,000/month (decision Q38). Stored in micro-USD; override with
// AI_MONTHLY_BUDGET_USD. The provider dashboard spend limit is the hard cap.
const DEFAULT_BUDGET_USD = 3;

function monthlyBudgetMicroUsd(): number {
  const value = Number(process.env.AI_MONTHLY_BUDGET_USD);
  const usd = Number.isFinite(value) && value >= 0 ? value : DEFAULT_BUDGET_USD;
  return Math.floor(usd * 1_000_000);
}

/**
 * Natural-language search (WP-05a): turns the query into filters. The
 * client applies them through the ordinary search; every failure becomes a
 * fallback the client turns into a keyword search.
 */
export async function aiSearch(input: string): Promise<AiSearchResult> {
  const query = normalizeAiQuery(typeof input === "string" ? input : "");
  if (!query) return { status: "invalid_query" };

  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) return { status: "login_required" };

  const parser = getQueryParser();
  if (!parser) return { status: "fallback", reason: "unavailable" };

  const { data: usageId, error: claimError } = await supabase.rpc(
    "claim_ai_search",
    {
      monthly_budget_micro_usd: monthlyBudgetMicroUsd(),
      model: parser.model,
      prompt_version: PROMPT_VERSION,
    },
  );
  if (claimError) {
    if (claimError.code === "HS429") return { status: "limit" };
    if (claimError.code === "HS402") {
      console.error("ai search budget reached");
      return { status: "fallback", reason: "budget" };
    }
    console.error("ai search claim failed", claimError.code);
    return { status: "fallback", reason: "error" };
  }

  const result = await interpretQuery(parser, query);
  const { error: finishError } = await supabase.rpc("finish_ai_search", {
    usage_id: usageId,
    outcome: result.outcome,
    input_tokens: result.usage.inputTokens,
    output_tokens: result.usage.outputTokens,
    latency_ms: result.latencyMs,
  });
  if (finishError) console.error("ai usage log failed", finishError.code);
  if (result.outcome !== "ok") {
    console.warn("ai search fallback", result.outcome, result.latencyMs);
  }

  return result.parsed
    ? { status: "ok", parsed: result.parsed }
    : {
        status: "fallback",
        reason: result.outcome === "ok" ? "error" : result.outcome,
      };
}
