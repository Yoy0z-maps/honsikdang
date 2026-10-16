import { timingSafeEqual } from "node:crypto";
import { getEmbedder } from "@/lib/ai";
import { runEmbeddingJobs } from "@/lib/embeddings/worker";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Embedding job runner (decision Q46). Called by `npm run embed:sync`
// locally; production scheduling is decided in WP-07. Protected by
// EMBEDDING_JOB_SECRET (Authorization: Bearer …).

function authorized(request: Request): boolean {
  const secret = process.env.EMBEDDING_JOB_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = getAdminSupabase();
  const embedder = getEmbedder();
  if (!client || !embedder) {
    return Response.json(
      { error: "embedding is not configured" },
      { status: 503 },
    );
  }
  try {
    const report = await runEmbeddingJobs(client, embedder);
    return Response.json({ model: embedder.model, ...report });
  } catch (error) {
    console.error("embedding jobs failed", (error as Error).message);
    return Response.json({ error: "job run failed" }, { status: 500 });
  }
}
