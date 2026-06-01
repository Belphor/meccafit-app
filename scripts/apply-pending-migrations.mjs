/**
 * Aplica migrations pendentes com verificação ARGOS remota.
 * Requer SUPABASE_DB_URL para apply SQL · probes usam service role.
 *
 * Uso: node scripts/apply-pending-migrations.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  ALL_MIGRATION_FILES,
  runMigrationProbes,
} from "./argos/verify-migrations.mjs";

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
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;
  }

  return "";
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

function printProbeReport(result) {
  console.log("\n=== ARGOS · probes remotas ===\n");
  for (const probe of result.probes) {
    console.log(`${probe.ok ? "[PASS]" : "[FAIL]"} ${probe.id} — ${probe.detail}`);
  }
  console.log("");
}

const env = loadEnv();
const dbUrl = resolveDbUrl(env);
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("\n=== ARGOS · apply pending migrations ===\n");

if (!baseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const admin = createClient(baseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let probeResult = await runMigrationProbes(admin, { probeOmbrosIsolation: true });
printProbeReport(probeResult);

if (probeResult.allOk) {
  console.log("Remote OK · nenhuma migration pendente detectada.");
  if (!dbUrl) {
    console.log("SUPABASE_DB_URL ausente — apply SQL local ignorado (remoto já conforme).");
  }
  process.exit(0);
}

const filesToApply =
  probeResult.filesToApply.length > 0 ? probeResult.filesToApply : ALL_MIGRATION_FILES;

console.log(`${probeResult.failed.length} probe(s) falharam.`);
console.log(`Aplicar ${filesToApply.length} arquivo(s) SQL.\n`);

if (!dbUrl) {
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN || "").trim();
  const projectRef = projectRefFromUrl(baseUrl);

  if (accessToken && projectRef) {
    try {
      for (const file of filesToApply) {
        const path = resolve(process.cwd(), "supabase/migrations", file);
        const sql = readFileSync(path, "utf8");
        console.log(`Aplicando ${file} via Management API...`);
        await applyWithManagementApi(projectRef, accessToken, sql);
        console.log("  OK");
      }
    } catch (error) {
      console.error("Falha:", error.message ?? error);
      process.exit(1);
    }

    console.log("\nRe-verificando probes remotas (aguarde cache PostgREST)...");
    await new Promise((r) => setTimeout(r, 2500));

    probeResult = await runMigrationProbes(admin, { probeOmbrosIsolation: true });
    printProbeReport(probeResult);

    if (probeResult.allOk) {
      console.log("Migrations aplicadas e verificadas via ARGOS.");
      process.exit(0);
    }

    console.warn("Migrations executadas, mas probes ainda falham — aguarde ~30s e rode:");
    console.warn("  node scripts/argos/verify-migrations.mjs");
    process.exit(2);
  }

  console.error("SUPABASE_DB_URL ausente em .env.local — não é possível aplicar SQL.");
  console.error("Configure SUPABASE_DB_URL, SUPABASE_DB_PASSWORD ou SUPABASE_ACCESS_TOKEN.");
  console.error("Supabase Dashboard → Project Settings → Database → Connection string (Session).");
  console.error("\nAplique manualmente no SQL Editor, por ordem:");
  for (const file of filesToApply) {
    console.error(`  supabase/migrations/${file}`);
  }
  process.exit(1);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of filesToApply) {
    const path = resolve(process.cwd(), "supabase/migrations", file);
    const sql = readFileSync(path, "utf8");
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
    console.log("  OK");
  }
} catch (error) {
  console.error("Falha:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}

console.log("\nRe-verificando probes remotas (aguarde cache PostgREST)...");
await new Promise((r) => setTimeout(r, 2500));

probeResult = await runMigrationProbes(admin, { probeOmbrosIsolation: true });
printProbeReport(probeResult);

if (probeResult.allOk) {
  console.log("Migrations aplicadas e verificadas via ARGOS.");
  process.exit(0);
}

console.warn("Migrations executadas, mas probes ainda falham — aguarde ~30s e rode:");
console.warn("  node scripts/argos/verify-migrations.mjs");
process.exit(2);
