/**
 * ARGOS — aplica migration Thermal Gravity (balanco_termico_diario).
 *
 * Canais (em ordem):
 * 1. SUPABASE_DB_URL — conexão Postgres direta (recomendado)
 * 2. SUPABASE_ACCESS_TOKEN — Management API POST /database/query
 *
 * Uso: node scripts/apply-thermal-gravity-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MIGRATION_FILE = "20260524260000_argos_thermal_gravity_engine.sql";

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

async function verifyApplied(admin) {
  const { error: tableError } = await admin.from("balanco_termico_diario").select("user_id").limit(1);
  if (tableError) return false;

  const uid = "00000000-0000-0000-0000-000000000001";
  const { error: rpcError } = await admin.rpc("argos_compute_vtc_30d", { p_user_id: uid });
  return !rpcError;
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
const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef = projectRefFromUrl(baseUrl);

const resolvedDbUrl =
  dbUrl ||
  (dbPassword && projectRef
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
    : "");

const migrationPath = resolve(process.cwd(), "supabase/migrations", MIGRATION_FILE);
const sql = readFileSync(migrationPath, "utf8");

console.log("\n=== ARGOS · Thermal Gravity Migration ===\n");
console.log(`Arquivo: ${MIGRATION_FILE}`);
console.log(`Projeto: ${projectRef ?? "?"}\n`);

if (!baseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios em .env.local");
  process.exit(1);
}

const admin = createClient(baseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (await verifyApplied(admin)) {
  console.log("Migration já aplicada (balanco_termico_diario + RPCs OK).");
  process.exit(0);
}

if (resolvedDbUrl) {
  try {
    await applyWithPg(resolvedDbUrl, sql);
    console.log("Migration aplicada via Postgres (SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD).");
  } catch (error) {
    console.error("Falha SUPABASE_DB_URL:", error.message ?? error);
    process.exit(1);
  }
} else if (accessToken && projectRef) {
  try {
    await applyWithManagementApi(projectRef, accessToken, sql);
    console.log("Migration aplicada via SUPABASE_ACCESS_TOKEN (Management API).");
  } catch (error) {
    console.error("Falha Management API:", error.message ?? error);
    process.exit(1);
  }
} else {
  console.error("Credencial de DDL ausente.");
  console.error("");
  console.error("Adicione UMA das opções em .env.local:");
  console.error("  SUPABASE_DB_PASSWORD=...  (senha do Postgres em Project Settings → Database)");
  console.error("  SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres");
  console.error("  SUPABASE_ACCESS_TOKEN=sbp_...  (https://supabase.com/dashboard/account/tokens)");
  console.error("");
  console.error(`SQL Editor: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  process.exit(1);
}

await new Promise((resolve) => setTimeout(resolve, 3000));

if (await verifyApplied(admin)) {
  console.log("Verificação OK: balanco_termico_diario disponível.");
  process.exit(0);
}

console.warn("Migration executada; aguarde ~30s e rode a verificação novamente se o schema cache demorar.");
process.exit(0);
