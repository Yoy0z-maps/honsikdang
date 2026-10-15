"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Browser client with the publishable key. Public reads only for now; RLS
 * enforces access. Session handling arrives with auth in WP-04.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (!client) {
    const env = getPublicEnv();
    client = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
