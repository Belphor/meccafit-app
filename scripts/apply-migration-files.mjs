/**
 * Aplica arquivos SQL específicos no Supabase remoto.
 *
 * Requer SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD em .env.local.
 * Uso:
 *   node scripts/apply-migration-files.mjs 20260704120000_fix_mural_comunidade_anon_revoke.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./lib/env.mjs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/apply-migration-files.mjs <arquivo.sql> [...]");
  process.exit(1);
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

const env = loadEnvLocal();
const dbUrl = resolveDbUrl(env);

if (!dbUrl) {
  console.error("SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD necessario em .env.local.");
  process.exit(1);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    const path = resolve(process.cwd(), "supabase/migrations", file);
    const sql = readFileSync(path, "utf8");
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
    console.log("  OK");
  }
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log("\nSchema cache PostgREST recarregado.");
} catch (error) {
  console.error("Falha:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}
