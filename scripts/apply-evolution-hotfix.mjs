/**
 * Aplica hotfix obter_calor_muscular_atleta (ambiguous column).
 * Uso: node scripts/apply-evolution-hotfix.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MIGRATION_FILE = "20260530122000_fix_obter_calor_volatile.sql";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = env.SUPABASE_DB_URL?.trim();
const dbPassword = (process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || "").trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || "").trim();
const projectRef = projectRefFromUrl(baseUrl);

const resolvedDbUrl =
  dbUrl ||
  (dbPassword && projectRef
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
    : "");

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", MIGRATION_FILE), "utf8");

console.log("\n=== Apply Evolution Hotfix ===\n");

if (resolvedDbUrl) {
  await applyWithPg(resolvedDbUrl, sql);
  console.log("Hotfix aplicado via Postgres.");
} else if (accessToken && projectRef) {
  await applyWithManagementApi(projectRef, accessToken, sql);
  console.log("Hotfix aplicado via Management API.");
} else {
  console.error("Credencial DDL ausente (SUPABASE_DB_PASSWORD, SUPABASE_DB_URL ou SUPABASE_ACCESS_TOKEN).");
  process.exit(1);
}

const admin = createClient(baseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await admin.rpc("obter_calor_muscular_atleta", {
  p_user_id: "00000000-0000-4000-8000-000000000001",
});

if (error?.message?.includes("ambiguous")) {
  console.error("Verificação falhou — ambiguous persiste:", error.message);
  process.exit(1);
}

console.log("Verificação RPC OK (sem ambiguous).");
process.exit(0);
