/**
 * Aplica uma migration SQL específica via conexão directa Postgres.
 * Uso: node scripts/apply-single-migration.mjs 20260627100000_diet_blueprints_vip.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function projectRefFromUrl(url) {
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function resolveDbUrl(env) {
  const direct = env.SUPABASE_DB_URL?.trim();
  if (direct) return direct;

  const projectRef = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const dbPassword = (process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || "").trim();
  if (dbPassword && projectRef) {
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  }
  return "";
}

const file = process.argv[2] ?? "20260627100000_diet_blueprints_vip.sql";
const env = loadEnv();
const dbUrl = resolveDbUrl(env);

if (!dbUrl) {
  console.error("SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD necessário.");
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "supabase/migrations", file);
const sql = readFileSync(sqlPath, "utf8");

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Aplicando ${file}...`);
  await client.query(sql);
  console.log("OK");
} catch (error) {
  console.error("Falha:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}
