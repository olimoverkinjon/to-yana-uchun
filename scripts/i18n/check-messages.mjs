/**
 * Checks that every locale defines the same message keys — `npm run i18n:check`.
 *
 * next-intl resolves a missing key to the key itself, so a forgotten
 * translation ships as literal "events.details.cashTotals" on screen rather
 * than as a build error. This is the check that turns that into one.
 *
 * en is the reference simply because it is where new keys get written first.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.resolve(here, "..", "..", "src", "i18n", "messages");
const REFERENCE = "en";

/** Flattens {a: {b: 1}} to ["a.b"], so nesting differences surface as key differences. */
function flatten(value, prefix = "") {
  const keys = [];
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      keys.push(...flatten(entry, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const locales = readdirSync(messagesDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.basename(file, ".json"));

const keysByLocale = Object.fromEntries(
  locales.map((locale) => [
    locale,
    new Set(flatten(JSON.parse(readFileSync(path.join(messagesDir, `${locale}.json`), "utf8")))),
  ]),
);

const reference = keysByLocale[REFERENCE];
if (!reference) {
  console.error(`No ${REFERENCE}.json to compare against.`);
  process.exit(1);
}

let failed = false;

for (const locale of locales) {
  if (locale === REFERENCE) continue;

  const keys = keysByLocale[locale];
  const missing = [...reference].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !reference.has(key));

  if (missing.length || extra.length) {
    failed = true;
    console.log(`\n  ${locale}.json`);
    for (const key of missing) console.log(`    missing: ${key}`);
    for (const key of extra) console.log(`    not in ${REFERENCE}: ${key}`);
  }
}

if (failed) {
  console.log("\nMessage keys are out of sync.\n");
  process.exit(1);
}

console.log(`\n  ${locales.join(", ")} — ${reference.size} keys, all in sync\n`);
