// Runs the embedding queue once against a running app (decision Q46):
//   npm run embed:sync              → http://localhost:3000
//   APP_URL=http://localhost:3100 npm run embed:sync
// Reads EMBEDDING_JOB_SECRET from the environment (.env.local via npm script).
const base = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.EMBEDDING_JOB_SECRET;
if (!secret) {
  console.error("EMBEDDING_JOB_SECRET is not set (see .env.example)");
  process.exit(1);
}

let total = { claimed: 0, stored: 0, failed: 0, tokens: 0 };
for (let round = 0; round < 50; round++) {
  const res = await fetch(`${base}/api/jobs/embeddings`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`embedding run failed: ${res.status} ${body.error ?? ""}`);
    process.exit(1);
  }
  for (const key of Object.keys(total)) total[key] += body[key] ?? 0;
  if (body.claimed === 0 || body.failed > 0) break;
}
console.log(JSON.stringify(total));
