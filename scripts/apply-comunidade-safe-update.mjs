/**
 * Hotfix · comunidade_apply_demo_titulos WHERE true (safe-update Supabase)
 * Uso: node scripts/apply-comunidade-safe-update.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_FILE = "20260623130000_fix_comunidade_safe_update_where.sql";

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

async function applyWithPg(dbUrl, sql) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function applyWithManagementApi(projectRef, accessToken, sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Management API ${response.status}: ${body.slice(0, 400)}`);
  }
}

const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", MIGRATION_FILE), "utf8");

const dbUrl =
  env.SUPABASE_DB_URL?.trim() ||
  (() => {
    const projectRef = projectRefFromUrl(baseUrl);
    const dbPassword = (process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || "").trim();
    if (dbPassword && projectRef) {
      return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;
    }
    return "";
  })();

const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || "").trim();
const projectRef = projectRefFromUrl(baseUrl);

console.log(`\n=== apply ${MIGRATION_FILE} ===\n`);

try {
  if (dbUrl) {
    console.log("Aplicando via PostgreSQL...");
    await applyWithPg(dbUrl, sql);
  } else if (accessToken && projectRef) {
    console.log("Aplicando via Management API...");
    await applyWithManagementApi(projectRef, accessToken, sql);
  } else {
    console.error("Configure SUPABASE_DB_URL, SUPABASE_DB_PASSWORD ou SUPABASE_ACCESS_TOKEN em .env.local");
    console.error(`Ou cole manualmente no SQL Editor: supabase/migrations/${MIGRATION_FILE}`);
    process.exit(1);
  }
  console.log("OK · funções corrigidas.\n");
} catch (error) {
  console.error("Falha:", error.message ?? error);
  process.exit(1);
}
