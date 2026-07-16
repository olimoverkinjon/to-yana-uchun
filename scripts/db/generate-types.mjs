/**
 * Regenerates src/lib/supabase/types.ts from the migrations — `npm run db:types`.
 *
 * Boots the same disposable Postgres the test suite uses, applies every
 * migration, and generates types from the result. So the checked-in types are
 * derived from the migrations themselves rather than from a live project
 * someone may have hand-edited, and regenerating them needs no network, no
 * Docker, and no project credentials.
 *
 * `supabase gen types --db-url` is not used here despite being the obvious
 * choice: the modern CLI shells out to a container to do the work, so it
 * needs Docker/podman even when pointed at a database that is already
 * running locally. It runs `postgres-meta` in that container — which is a
 * plain npm library, so this calls it directly and gets byte-identical output
 * with no container runtime involved.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getGeneratorMetadata } from "@supabase/postgres-meta/dist/lib/generators.js";
import { PostgresMeta } from "@supabase/postgres-meta/dist/lib/index.js";
import { apply as applyTypescriptTemplate } from "@supabase/postgres-meta/dist/server/templates/typescript.js";

import { databaseUrl, startHarness } from "./harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, "..", "..", "src", "lib", "supabase", "types.ts");

const HEADER = `/**
 * Generated from supabase/migrations/*.sql — do not hand-edit.
 * Regenerate with: npm run db:types
 */
`;

async function main() {
  const log = (msg) => console.log(`  ${msg}`);
  console.log("\nBooting disposable postgres…");
  const { stop } = await startHarness({ log });

  try {
    log("introspecting schema…");
    const pgMeta = new PostgresMeta({ connectionString: databaseUrl(), max: 1 });

    const { data: metadata, error } = await getGeneratorMetadata(pgMeta, { includedSchemas: ["public"] });
    if (error) throw new Error(error.message);

    const generated = await applyTypescriptTemplate({
      ...metadata,
      // Matches the CLI's default. Without it, a one-to-one relationship is
      // typed as an array, so `.single()` results would be wrong.
      detectOneToOneRelationships: true,
    });

    await pgMeta.end();

    writeFileSync(target, HEADER + generated.replace(/^[\s\S]*?(?=export type Json)/, ""), "utf8");
    log(`wrote ${path.relative(process.cwd(), target)}`);
    console.log("");
  } finally {
    await stop();
  }
}

main().catch((error) => {
  console.error("\nType generation failed:\n", error);
  process.exit(1);
});
