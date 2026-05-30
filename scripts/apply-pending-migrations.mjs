/**
 * Aplica migrations pendentes (Mecca + Fórum + Security Hardening).
 * Requer SUPABASE_DB_URL em .env.local (Connection string Session pooler).
 *
 * Uso: node scripts/apply-pending-migrations.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS = [
  "20260525100000_argos_forum_brasa_viva.sql",
  "20260525110000_argos_security_hardening.sql",
  "20260527240000_create_mecca_global_metrics.sql",
  "20260527241000_integrate_mecca_contribution_registrar.sql",
  "20260528590000_add_abdomen_subgrupo_muscular.sql",
  "20260529000000_split_workout_architecture.sql",
  "20260529100000_dual_track_training_architecture.sql",
  "20260530008000_final_consolidated_muscle_architecture.sql",
];

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

async function verifyApplied(admin) {
  const { error: forumErr } = await admin.rpc("argos_fetch_forum_brasa_viva", { p_limit: 1 });
  const forumOk = !forumErr || forumErr.code !== "PGRST202";

  const { data: meccaRow, error: meccaErr } = await admin
    .from("mecca_global_metrics")
    .select("id, furnace_temperature")
    .limit(1)
    .maybeSingle();
  const meccaOk = !meccaErr && Boolean(meccaRow?.id);

  const { data: soberanoRow } = await admin
    .from("profiles")
    .select("id, phase_tier")
    .eq("role", "forjador_soberano")
    .limit(1)
    .maybeSingle();

  let phaseLock = false;
  if (soberanoRow?.id) {
    const { error: phaseErr } = await admin
      .from("profiles")
      .update({ phase_tier: Math.min(5, (soberanoRow.phase_tier ?? 1) + 1) })
      .eq("id", soberanoRow.id);
    phaseLock = Boolean(phaseErr);
  }

  return { forumOk, meccaOk, phaseLock };
}

const env = loadEnv();
const dbUrl = env.SUPABASE_DB_URL?.trim();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("\n=== ARGOS · apply pending migrations ===\n");

const admin =
  baseUrl && serviceKey
    ? createClient(baseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (admin) {
  const status = await verifyApplied(admin);
  if (status.forumOk && status.meccaOk && status.phaseLock) {
    console.log("Migrations já aplicadas (forum + mecca global + phase lock).");
    process.exit(0);
  }
}

if (!dbUrl) {
  console.error("SUPABASE_DB_URL ausente em .env.local.");
  console.error("Supabase Dashboard → Project Settings → Database → Connection string (Session).");
  console.error("\nOu aplique manualmente no SQL Editor, por ordem:");
  for (const file of MIGRATIONS) {
    console.error(`  supabase/migrations/${file}`);
  }
  process.exit(1);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of MIGRATIONS) {
    const path = resolve(process.cwd(), "supabase/migrations", file);
    const sql = readFileSync(path, "utf8");
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
    console.log(`  OK`);
  }
} catch (error) {
  console.error("Falha:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}

if (admin) {
  await new Promise((r) => setTimeout(r, 2000));
  const status = await verifyApplied(admin);
  if (status.forumOk && status.meccaOk && status.phaseLock) {
    console.log("\nVerificação OK: forum + mecca global + phase lock activos.");
    process.exit(0);
  }
  console.warn("\nMigration executada — aguarde ~30s cache PostgREST e re-verifique.");
}

console.log("\nMigrations aplicadas via SUPABASE_DB_URL.");
process.exit(0);
