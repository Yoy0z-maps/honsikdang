// Grants (or revokes) the moderator role in the LOCAL Supabase database.
//
//   npm run db:grant-admin -- someone@example.com
//   npm run db:grant-admin -- someone@example.com --revoke
//
// It only talks to the local Docker container started by `supabase start`
// (supabase_db_<project_id>), never to a hosted project. For production,
// follow specs/ops/grant-admin.md. The user must have signed in once so an
// auth.users row exists.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [email, flag] = process.argv.slice(2);
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  (flag && flag !== "--revoke")
) {
  console.error("usage: npm run db:grant-admin -- <email> [--revoke]");
  process.exit(2);
}

const config = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);
const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
if (!projectId) {
  console.error("project_id not found in supabase/config.toml");
  process.exit(2);
}
const container = `supabase_db_${projectId}`;

// The email is passed as a psql variable and quoted by psql (:'email'), so it
// is never interpolated into SQL text.
const sql =
  flag === "--revoke"
    ? `delete from private.user_roles r using auth.users u
        where r.user_id = u.id and lower(u.email) = lower(:'email')
        returning u.email;`
    : `insert into private.user_roles (user_id, role)
       select id, 'admin' from auth.users where lower(email) = lower(:'email')
       on conflict (user_id) do nothing
       returning user_id;`;

const result = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    container,
    "psql",
    "-U",
    "postgres",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-v",
    `email=${email}`,
  ],
  { input: sql, encoding: "utf8" },
);

if (result.error || result.status !== 0) {
  console.error(
    `Could not run psql in ${container}. Is the local stack running (npm run db:start)?`,
  );
  console.error(result.stderr || result.error?.message);
  process.exit(1);
}

const changed = result.stdout
  .split("\n")
  .filter((line) => line.trim() && !/^(INSERT|DELETE)/.test(line)).length;
if (flag === "--revoke") {
  console.log(
    changed ? `Revoked admin from ${email}.` : `${email} was not an admin.`,
  );
} else if (changed) {
  console.log(`Granted admin to ${email}.`);
} else {
  console.log(
    `No change: ${email} is already an admin, or has not signed in yet (no auth.users row).`,
  );
}
