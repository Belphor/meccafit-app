/**
 * Aplica migration abdômen térmico (TLU · prancha em segundos).
 * Uso: node scripts/apply-abdomen-thermal.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runMigrationProbes } from "./argos/verify-migrations.mjs";

const MIGRATION_FILE = "20260530160000_evolucao_abdomen_thermal_metrics.sql";

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const projectRef = projectRefFromUrl(baseUrl);
const dbUrl =
  env.SUPABASE_DB_URL?.trim() ||
  (env.SUPABASE_DB_PASSWORD?.trim() && projectRef
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD.trim())}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
    : "");
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || "").trim();
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", MIGRATION_FILE), "utf8");

console.log("\n=== Apply abdomen thermal migration ===\n");

if (dbUrl) {
  await applyWithPg(dbUrl, sql);
  console.log("Migration aplicada via Postgres.");
} else if (accessToken && projectRef) {
  await applyWithManagementApi(projectRef, accessToken, sql);
  console.log("Migration aplicada via Management API.");
} else {
  console.error("Credencial DDL ausente.");
  console.error("Configure SUPABASE_DB_URL, SUPABASE_DB_PASSWORD ou SUPABASE_ACCESS_TOKEN em .env.local");
  console.error(`Ou cole no SQL Editor: supabase/migrations/${MIGRATION_FILE}`);
  process.exit(1);
}

const admin = createClient(baseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await new Promise((r) => setTimeout(r, 2000));
const result = await runMigrationProbes(admin, { probeOmbrosIsolation: false });
const abdomenProbe = result.probes.find((p) => p.id === "abdomen_thermal");
console.log(abdomenProbe?.ok ? `[PASS] ${abdomenProbe.detail}` : `[FAIL] ${abdomenProbe?.detail ?? "probe ausente"}`);
process.exit(abdomenProbe?.ok ? 0 : 2);
