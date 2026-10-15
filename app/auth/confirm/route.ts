import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createUserServerSupabase } from "@/lib/supabase/server";

// Magic link landing: exchanges the one-time token_hash for a session cookie
// (https://supabase.com/docs/guides/auth/auth-email-passwordless).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type === "email") {
    const supabase = await createUserServerSupabase();
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    console.error("verifyOtp failed", error.status, error.code);
  }

  const failed = new URL("/login", request.url);
  failed.searchParams.set("error", "link");
  failed.searchParams.set("next", next);
  return NextResponse.redirect(failed);
}
