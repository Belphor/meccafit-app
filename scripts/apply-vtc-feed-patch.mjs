/**
 * Aplica patch hasVipBond no feed VTC global.
 * Uso: node scripts/apply-vtc-feed-patch.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MIGRATION_FILE = "20260627140000_patch_vtc_feed_vip_bond.sql";

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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const projectRef = projectRefFromUrl(baseUrl);
const dbUrl =
  env.SUPABASE_DB_URL?.trim() ||
  (env.SUPABASE_DB_PASSWORD?.trim() && projectRef
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD.trim())}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
    : "");
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || "").trim();
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", MIGRATION_FILE), "utf8");

console.log("\n=== Apply VTC feed VIP bond patch ===\n");

if (dbUrl) {
  await applyWithPg(dbUrl, sql);
  console.log("Patch aplicado via Postgres.");
} else if (accessToken && projectRef) {
  await applyWithManagementApi(projectRef, accessToken, sql);
  console.log("Patch aplicado via Management API.");
} else {
  console.error("Credencial DDL ausente.");
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 1500));

const client = createClient(baseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await client.auth.signInWithPassword({ email: "master@meccafit.com", password: "senha123" });
const { data } = await client.rpc("argos_forja_vtc_feed", { p_limit: 4 });
await client.auth.signOut();

const sample = Array.isArray(data) ? data[0] : null;
const ok = sample && "hasVipBond" in sample;
console.log(ok ? `[PASS] hasVipBond presente no feed` : `[FAIL] hasVipBond ausente`);
process.exit(ok ? 0 : 2);
