import { getEmbedder } from "@/lib/ai";
import { RetryingEmbedder } from "@/lib/ai/embeddings";
import { runEmbeddingJobs } from "@/lib/embeddings/worker";
import { hasBearer } from "@/lib/jobs/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Daily maintenance (decisions C-77, C-74), scheduled by Vercel Cron in
// vercel.json; Vercel sends "Authorization: Bearer $CRON_SECRET". Hobby
// plans allow one run per day. Also keeps a free Supabase project active.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasBearer(request, process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = getAdminSupabase();
  if (!client) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const report: Record<string, unknown> = {};
  const { data: purged, error: purgeError } =
    await client.rpc("purge_expired_data");
  report.purged = purgeError ? { error: purgeError.code } : purged;

  const embedder = getEmbedder();
  if (embedder) {
    try {
      // Background work may wait out a rate limit (but stays under 60 s).
      report.embeddings = await runEmbeddingJobs(
        client,
        new RetryingEmbedder(embedder, 1, 15_000),
        5,
      );
    } catch (error) {
      report.embeddings = { error: (error as Error).message };
    }
  } else {
    report.embeddings = "not configured";
  }

  console.log("daily job", JSON.stringify(report));
  const failed = Boolean(purgeError) || "error" in Object(report.embeddings);
  return Response.json(report, { status: failed ? 500 : 200 });
}
