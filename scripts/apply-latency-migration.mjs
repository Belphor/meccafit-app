/**
 * Aplica migration de latência no Supabase remoto.
 * Requer SUPABASE_DB_URL em .env.local (Connection string do pooler, modo Session).
 *
 * Uso: node scripts/apply-latency-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const env = loadEnv();
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260524210000_argos_latency_optimization.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const dbUrl = env.SUPABASE_DB_URL?.trim();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function verifyRpc() {
  if (!baseUrl || !serviceKey) return false;

  const admin = createClient(baseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.rpc("fetch_dashboard_bundle", { p_musculo: "peito" });
  return !error || error.code !== "PGRST202";
}

async function applyWithPg() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

console.log("ARGOS latency migration\n");

if (await verifyRpc()) {
  console.log("fetch_dashboard_bundle já existe — migration aplicada.");
  process.exit(0);
}

if (!dbUrl) {
  console.error("SUPABASE_DB_URL ausente em .env.local.");
  console.error("Cole a connection string (Session pooler) do Supabase Dashboard → Connect.");
  console.error(
    "SQL Editor: https://supabase.com/dashboard/project/srhftwluwxbnoirrtyuz/sql/new",
  );
  console.error(`\nArquivo: ${migrationPath}`);
  process.exit(1);
}

try {
  await applyWithPg();
  console.log("Migration aplicada via SUPABASE_DB_URL.");
} catch (error) {
  console.error("Falha ao aplicar migration:", error.message ?? error);
  process.exit(1);
}

if (await verifyRpc()) {
  console.log("Verificação OK: fetch_dashboard_bundle disponível.");
  process.exit(0);
}

console.error("Migration executada, mas RPC ainda não visível (aguarde schema cache ~30s).");
process.exit(1);
