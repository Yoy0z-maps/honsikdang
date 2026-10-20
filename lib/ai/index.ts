import "server-only";
import { AnthropicQueryParser } from "./anthropic";
import { FixtureEmbedder, VoyageEmbedder, type Embedder } from "./embeddings";
import { FixtureQueryParser } from "./fixture";
import { OpenAIQueryParser } from "./openai";
import type { QueryParser } from "./types";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isLocalSupabase(): boolean {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * The configured parser, or null when AI search is off (no key). The
 * fixture is refused unless the app talks to a local Supabase, so it can
 * never answer real users.
 */
/**
 * AI search launch switch (decision C-76): off unless explicitly enabled.
 * NEXT_PUBLIC_ so the client can hide the toggle; the server action checks
 * it too.
 */
export function isAiSearchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_SEARCH_ENABLED === "true";
}

export function getQueryParser(): QueryParser | null {
  // OpenAI by default (decision C-59); Anthropic stays selectable.
  const provider = process.env.AI_PROVIDER?.trim() || "openai";
  if (provider === "fixture") {
    return isLocalSupabase() ? new FixtureQueryParser() : null;
  }
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    return key ? new OpenAIQueryParser(key) : null;
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    return key ? new AnthropicQueryParser(key) : null;
  }
  return null;
}

/**
 * The configured embedder, or null when semantic ranking is off (no key);
 * results then keep distance order. Same fixture rule as the parser.
 */
export function getEmbedder(): Embedder | null {
  const provider = process.env.EMBEDDING_PROVIDER?.trim() || "voyage";
  if (provider === "fixture") {
    return isLocalSupabase() ? new FixtureEmbedder() : null;
  }
  if (provider !== "voyage") return null;
  const key = process.env.VOYAGE_API_KEY?.trim();
  const base = process.env.VOYAGE_API_BASE?.trim();
  return key ? new VoyageEmbedder(key, base || undefined) : null;
}
