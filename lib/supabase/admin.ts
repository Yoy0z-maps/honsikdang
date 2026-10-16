import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Secret-key client for trusted background work only (embedding jobs).
 * Bypasses RLS: never use it for anything a request's user asked for.
 * Returns null when SUPABASE_SECRET_KEY is not configured.
 */
export function getAdminSupabase(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY must be a secret key (sb_secret_…)");
  }
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
