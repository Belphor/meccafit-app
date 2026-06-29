/**
 * Aplica arquivos SQL específicos no Supabase remoto.
 *
 * Requer SUPABASE_DB_URL em .env.local (Session pooler ou direct).
 * Uso:
 *   node scripts/apply-migration-files.mjs 20260627250000_mural_superacoes_hoje_metric.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/apply-migration-files.mjs <arquivo.sql> [...]");
  process.exit(1);
}

const env = loadEnvLocal();
requireEnv(env, ["SUPABASE_DB_URL"]);

const dbUrl = env.SUPABASE_DB_URL.trim();
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
