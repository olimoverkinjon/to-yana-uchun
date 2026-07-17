/**
 * Disposable Postgres for exercising the migrations end to end.
 *
 * Docker (and therefore `supabase start`) is not available in every
 * environment this project gets worked on, and "the SQL looks right" is not
 * evidence that RLS actually denies a Viewer an UPDATE. This boots a real
 * Postgres from the embedded-postgres package, applies the platform stubs
 * followed by every migration in order, and hands back a client — so the
 * policies, triggers, and constraints under test are the same ones that ship.
 *
 * The instance is created fresh in a temp directory and destroyed on stop;
 * nothing here touches a real project.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import EmbeddedPostgres from "embedded-postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const stubsDir = path.join(here, "stubs");

const PORT = Number(process.env.HARNESS_PG_PORT ?? 55432);
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "postgres";

export function databaseUrl() {
  return `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`;
}

/**
 * Windows leaves the data directory locked briefly after the postmaster
 * exits, so a plain rmSync right after stop() intermittently throws EBUSY.
 * The cleanup is best-effort by design: a leftover temp dir is harmless, a
 * crashed test run because of it is not.
 */
function removeQuietly(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* ignore */
  }
}

export async function startHarness({ log = () => {} } = {}) {
  const dataDir = mkdtempSync(path.join(tmpdir(), "wr-pgdata-"));

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
    // Without this, initdb inherits the host locale — on a Windows machine
    // that means a WIN1252 cluster, which cannot even store the Uzbek and
    // Russian text this app is built around, and rejects any migration
    // containing a non-Latin-1 character. Supabase runs UTF8; a harness that
    // does not is testing a different database than the one we ship to.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: () => {},
  });

  log("initialising postgres…");
  await pg.initialise();
  await pg.start();
  // No createDatabase call: initdb already creates `postgres`, and asking for
  // it again errors out.

  const client = pg.getPgClient();
  await client.connect();

  log("applying supabase platform stubs…");
  for (const file of readdirSync(stubsDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    await client.query(readFileSync(path.join(stubsDir, file), "utf8"));
  }

  const migrations = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  log(`applying ${migrations.length} migrations…`);
  for (const file of migrations) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    try {
      await client.query(sql);
    } catch (error) {
      throw new Error(`migration ${file} failed: ${error.message}`);
    }
  }

  return {
    client,
    async stop() {
      await client.end().catch(() => {});
      await pg.stop().catch(() => {});
      removeQuietly(dataDir);
    },
  };
}

/**
 * Runs `fn` as a given profile, exactly the way PostgREST presents a request
 * to Postgres: the role is switched to `authenticated` and the JWT claims are
 * put in the setting auth.uid() reads. Everything happens inside a
 * transaction that is always rolled back, so tests cannot leak state into
 * each other.
 *
 * Pass profileId = null to simulate an unauthenticated caller.
 */
export async function asUser(client, profileId, fn) {
  await client.query("begin");
  try {
    if (profileId) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: profileId, role: "authenticated" }),
      ]);
    }
    await client.query("set local role authenticated");
    return await fn();
  } finally {
    await client.query("rollback").catch(() => {});
  }
}

/**
 * As above, but commits on success — for the arrange steps that later tests
 * need to actually observe.
 */
export async function asUserCommitted(client, profileId, fn) {
  await client.query("begin");
  try {
    if (profileId) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: profileId, role: "authenticated" }),
      ]);
    }
    await client.query("set local role authenticated");
    const result = await fn();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

export function generateTypes(log = () => {}) {
  log("generating typescript types…");
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "supabase", "gen", "types", "typescript", "--db-url", databaseUrl()],
    { encoding: "utf8", cwd: repoRoot, shell: process.platform === "win32" },
  );

  if (result.status !== 0) {
    throw new Error(`type generation failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
