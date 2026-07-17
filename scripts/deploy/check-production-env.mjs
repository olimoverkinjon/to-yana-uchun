import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "SESSION_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

function readEnvFile(path) {
  const env = {};
  const content = readFileSync(path, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}

function isPlaceholder(value) {
  return !value || /placeholder|replace-with|your-project|your-|123456:/i.test(value);
}

function checkUrl(name, value, { https = false } = {}) {
  try {
    const url = new URL(value);
    if (https && url.protocol !== "https:") return `${name} must use HTTPS for Telegram production.`;
    return null;
  } catch {
    return `${name} must be a valid URL.`;
  }
}

const env = readEnvFile(envPath);
const issues = [];

for (const key of required) {
  if (isPlaceholder(env[key])) issues.push(`${key} is missing or still a placeholder.`);
}

if (env.NEXT_PUBLIC_LOCAL_DEMO === "true") {
  issues.push("NEXT_PUBLIC_LOCAL_DEMO must be false or omitted for real Supabase/Telegram production.");
}

if (env.SUPABASE_JWT_SECRET && env.SUPABASE_JWT_SECRET.length < 32) {
  issues.push("SUPABASE_JWT_SECRET must be at least 32 characters.");
}

if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
  issues.push("SESSION_SECRET must be at least 32 characters.");
}

if (env.NEXT_PUBLIC_SUPABASE_URL) {
  const issue = checkUrl("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL, { https: true });
  if (issue) issues.push(issue);
}

if (env.NEXT_PUBLIC_APP_URL) {
  const issue = checkUrl("NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL, { https: true });
  if (issue) issues.push(issue);
}

if (!env.BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS) {
  issues.push("BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS is recommended for first launch.");
}

if (issues.length) {
  console.error("Production environment is not ready:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Production environment looks ready.");
