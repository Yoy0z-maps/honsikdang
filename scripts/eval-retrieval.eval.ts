// Retrieval evaluation for relevance ordering (decision Q48).
//   npm run eval:retrieval
// LOCAL database only: inserts the synthetic corpus
// (specs/evals/retrieval.corpus.json), embeds it, ranks each query, then
// deletes everything it inserted.
// Embedder: VOYAGE_API_KEY → voyage-4 (a real measurement, small spend);
// EVAL_EMBEDDER=fixture → fixture vectors (checks the harness only, not
// quality). Skipped otherwise. Results: specs/evals/results/retrieval-latest.json.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  FixtureEmbedder,
  VoyageEmbedder,
  toVectorLiteral,
  type Embedder,
} from "@/lib/ai/embeddings";
import {
  RETRIEVAL_THRESHOLDS,
  ndcgAtK,
  recallAtK,
} from "@/lib/ai/retrieval-metrics";
import { orderByRelevance } from "@/lib/domain/relevance";
import { runEmbeddingJobs } from "@/lib/embeddings/worker";
import type { Database } from "@/lib/supabase/database.types";

type Corpus = {
  restaurants: {
    n: number;
    name: string;
    category: string;
    tags: string[];
    reviews: string[];
  }[];
  queries: { id: string; text: string; relevant: Record<string, number> }[];
};

const corpus = JSON.parse(
  readFileSync("specs/evals/retrieval.corpus.json", "utf8"),
) as Corpus;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const local = ["127.0.0.1", "localhost"].includes(new URL(url).hostname);

function secretKey(): string {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /^SECRET_KEY="?([^"\r\n]+)"?\r?$/m.exec(out)?.[1] ?? "";
  } catch {
    return "";
  }
}

const embedder: Embedder | null = process.env.VOYAGE_API_KEY
  ? new VoyageEmbedder(process.env.VOYAGE_API_KEY, process.env.VOYAGE_API_BASE)
  : process.env.EVAL_EMBEDDER === "fixture"
    ? new FixtureEmbedder()
    : null;

const CENTER = { lat: 37.5663, lng: 126.9779 };
const id = (n: number) =>
  `e7000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Spread deterministically so distance order is unrelated to relevance.
const position = (n: number) => ({
  lat: CENTER.lat + (((n * 37) % 11) - 5) * 0.0006,
  lng: CENTER.lng + (((n * 53) % 13) - 6) * 0.0007,
});
const distance = (n: number) => {
  const p = position(n);
  return Math.hypot(p.lat - CENTER.lat, (p.lng - CENTER.lng) * 0.79);
};

const sqlText = (v: string) => `'${v.replaceAll("'", "''")}'`;
const USERS = [id(9001), id(9002)];

function corpusSql(): string {
  const users = USERS.map(
    (u, i) =>
      `(${sqlText(u)}, ${sqlText(`retrieval-eval-${i}@example.invalid`)}, 'authenticated', 'authenticated')`,
  );
  const restaurants = corpus.restaurants.map((r) => {
    const p = position(r.n);
    return `(${sqlText(id(r.n))}, ${sqlText(r.name)}, '평가용 주소', 'SRID=4326;POINT(${p.lng} ${p.lat})', (select id from public.restaurant_categories where slug = ${sqlText(r.category)}), 'approved', 'admin_entered', ${sqlText(USERS[0])})`;
  });
  const reviews = corpus.restaurants.flatMap((r) =>
    r.reviews.map(
      (body, i) =>
        `(${sqlText(id(1000 + r.n * 10 + i))}, ${sqlText(id(r.n))}, ${sqlText(USERS[i % USERS.length])}, '2026-10-01', 4, 'counter', ${sqlText(body)}, 'approved')`,
    ),
  );
  const tags = corpus.restaurants.flatMap((r) =>
    r.tags.map(
      (slug) =>
        `(${sqlText(id(1000 + r.n * 10))}, (select id from public.tags where slug = ${sqlText(slug)}))`,
    ),
  );
  return [
    cleanupSql(),
    "begin;",
    `insert into auth.users (id, email, aud, role) values ${users.join(", ")};`,
    `insert into public.restaurants (id, name, address, location, category_id, status, source_type, created_by) values ${restaurants.join(", ")};`,
    `insert into public.restaurant_reviews (id, restaurant_id, user_id, visited_at, solo_comfort, seat_type, body, status) values ${reviews.join(", ")};`,
    `insert into public.review_tags (review_id, tag_id) values ${tags.join(", ")};`,
    "commit;",
  ].join("\n");
}

function cleanupSql(): string {
  const ids = corpus.restaurants.map((r) => sqlText(id(r.n))).join(", ");
  return [
    `delete from public.restaurants where id in (${ids});`,
    `delete from auth.users where id in (${USERS.map(sqlText).join(", ")});`,
  ].join("\n");
}

/** Runs SQL as postgres inside the local Supabase database container. */
function psql(sql: string) {
  const container = execSync("docker ps --format {{.Names}}", {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .find((name) => name.startsWith("supabase_db"));
  if (!container) throw new Error("local supabase_db container not found");
  execSync(
    `docker exec -i ${container} psql -U postgres -v ON_ERROR_STOP=1 -q`,
    {
      input: sql,
      stdio: ["pipe", "ignore", "inherit"],
    },
  );
}

describe.skipIf(!embedder || !local)("retrieval evaluation (local)", () => {
  it(
    "fused ranking meets the agreed thresholds",
    async () => {
      const admin = createClient<Database>(url, secretKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      try {
        // Insert as postgres in the local container: the corpus bypasses the
        // API on purpose (no user flows, no API-role privileges needed).
        psql(corpusSql());

        const work = await runEmbeddingJobs(admin, embedder!, 20);
        expect(work.failed).toBe(0);

        const byDistance = [...corpus.restaurants]
          .sort((a, b) => distance(a.n) - distance(b.n))
          .map((r) => ({ id: id(r.n), n: String(r.n) }));
        const toN = (ids: { n: string }[]) => ids.map((x) => x.n);

        type Scores = Record<
          "fused" | "vector" | "lexical" | "distance",
          number
        >;
        const rows: {
          id: string;
          text: string;
          recall: Scores;
          ndcg: Scores;
          top5: string[];
        }[] = [];
        for (const q of corpus.queries) {
          const { vectors } = await embedder!.embed(
            [q.text],
            "query",
            AbortSignal.timeout(10_000),
          );
          const rank = async (vector: string | null, text: string | null) => {
            const { data, error } = await admin.rpc("rank_restaurants", {
              candidate_ids: byDistance.map((x) => x.id),
              query_embedding: vector as string,
              model: embedder!.model,
              semantic_text: text as string,
            });
            if (error) throw error;
            return toN(orderByRelevance(byDistance, data));
          };
          const fused = await rank(toVectorLiteral(vectors[0]), q.text);
          const vectorOnly = await rank(toVectorLiteral(vectors[0]), null);
          const lexicalOnly = await rank(null, q.text);
          const baseline = toN(byDistance);
          const k = RETRIEVAL_THRESHOLDS.k;
          rows.push({
            id: q.id,
            text: q.text,
            recall: {
              fused: recallAtK(fused, q.relevant, k),
              vector: recallAtK(vectorOnly, q.relevant, k),
              lexical: recallAtK(lexicalOnly, q.relevant, k),
              distance: recallAtK(baseline, q.relevant, k),
            },
            ndcg: {
              fused: ndcgAtK(fused, q.relevant, k),
              vector: ndcgAtK(vectorOnly, q.relevant, k),
              lexical: ndcgAtK(lexicalOnly, q.relevant, k),
              distance: ndcgAtK(baseline, q.relevant, k),
            },
            top5: fused.slice(0, 5),
          });
        }

        const mean = (pick: (r: (typeof rows)[number]) => number) =>
          rows.reduce((s, r) => s + pick(r), 0) / rows.length;
        const summary = {
          date: new Date().toISOString(),
          model: embedder!.model,
          measurement:
            embedder instanceof FixtureEmbedder
              ? "harness check only (fixture vectors), not a quality measurement"
              : "live",
          queries: rows.length,
          recallAt10: {
            fused: mean((r) => r.recall.fused),
            vector: mean((r) => r.recall.vector),
            lexical: mean((r) => r.recall.lexical),
            distance: mean((r) => r.recall.distance),
          },
          ndcgAt10: {
            fused: mean((r) => r.ndcg.fused),
            vector: mean((r) => r.ndcg.vector),
            lexical: mean((r) => r.ndcg.lexical),
            distance: mean((r) => r.ndcg.distance),
          },
          embeddingTokens: work.tokens,
          thresholds: RETRIEVAL_THRESHOLDS,
        };
        mkdirSync("specs/evals/results", { recursive: true });
        const file =
          embedder instanceof FixtureEmbedder
            ? "retrieval-fixture.json"
            : "retrieval-latest.json";
        writeFileSync(
          `specs/evals/results/${file}`,
          JSON.stringify({ summary, queries: rows }, null, 2) + "\n",
        );
        console.log(JSON.stringify(summary, null, 2));

        if (!(embedder instanceof FixtureEmbedder)) {
          expect(summary.recallAt10.fused).toBeGreaterThanOrEqual(
            RETRIEVAL_THRESHOLDS.recall,
          );
          expect(
            summary.ndcgAt10.fused - summary.ndcgAt10.distance,
          ).toBeGreaterThanOrEqual(RETRIEVAL_THRESHOLDS.ndcgGainOverDistance);
        }
      } finally {
        psql(cleanupSql());
      }
    },
    10 * 60_000,
  );
});
