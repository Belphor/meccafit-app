/**
 * Limpeza completa para testes reais — treinos, mural demo, comunidade, nutrição VIP, evolução.
 *
 * Uso: node scripts/reset-full-test-environment.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const DEMO_EXERCISE_IDS = Array.from({ length: 10 }, (_, index) => 88101 + index);
const DEMO_CARGA_TAGS = ["comunidade-demo-v2", "ranking-top10"];

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();

async function deleteWhere(client, table, filterFn) {
  const { data, error } = await client.from(table).select("*").limit(5000);
  if (error) {
    if (error.code === "42P01") return 0;
    throw new Error(`${table}: ${error.message}`);
  }
  const rows = (data ?? []).filter(filterFn);
  if (rows.length === 0) return 0;

  const idColumn = rows[0].id !== undefined ? "id" : Object.keys(rows[0])[0];
  const ids = rows.map((row) => row[idColumn]).filter(Boolean);

  const { error: deleteError } = await client.from(table).delete().in(idColumn, ids);
  if (deleteError) throw new Error(`${table} delete: ${deleteError.message}`);
  return rows.length;
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("reset-full: iniciando limpeza completa…");

  const { count: historicoBefore } = await client
    .from("historico_treinos")
    .select("*", { count: "exact", head: true });

  const { error: historicoDeleteError } = await client
    .from("historico_treinos")
    .delete()
    .neq("id", -1);

  if (historicoDeleteError) {
    console.error("historico_treinos:", historicoDeleteError.message);
    process.exit(1);
  }

  for (const tag of DEMO_CARGA_TAGS) {
    const { error } = await client.from("historico_cargas").delete().like("exercicio_id", `${tag}%`);
    if (error && error.code !== "42P01") {
      console.warn(`historico_cargas tag ${tag}:`, error.message);
    }
  }

  const { error: allCargasError } = await client
    .from("historico_cargas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (allCargasError && allCargasError.code !== "42P01") {
    console.warn("historico_cargas:", allCargasError.message);
  }

  const sideTables = [
    "evolucao_membro_estase",
    "balanco_termico_diario",
    "cardio_sessoes_diarias",
    "calendario_ignicao",
    "purity_logs",
    "historico_treinos_personais",
    "vip_medidas_corporais",
    "vip_dieta_semanal",
    "diet_blueprints",
  ];

  for (const table of sideTables) {
    const { error } = await client
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      const alt = await client.from(table).delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
      if (alt.error && alt.error.code !== "42P01") {
        const alt2 = await client.from(table).delete().neq("atleta_id", "00000000-0000-0000-0000-000000000000");
        if (alt2.error && alt2.error.code !== "42P01") {
          console.warn(`${table}:`, alt2.error.message);
        }
      }
    }
  }

  await client.from("matriz_forca").update({ vtc_atual: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");

  const duelosRemoved = await deleteWhere(client, "duelos_supergrupos", () => true).catch(() => 0);
  const titulosRemoved = await deleteWhere(client, "comunidade_titulos", () => true).catch(() => 0);

  const { error: profilesError } = await client
    .from("profiles")
    .update({ vtc_atual: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (profilesError) {
    console.warn("profiles vtc reset:", profilesError.message);
  }

  console.log("reset-full: OK");
  console.log(`  historico_treinos removidos: ${historicoBefore ?? "?"}`);
  console.log(`  duelos removidos: ${duelosRemoved}`);
  console.log(`  titulos removidos: ${titulosRemoved}`);
  console.log("");
  console.log("No navegador (F12 → Console):");
  console.log("  Object.keys(localStorage).filter(k=>k.startsWith('meccafit:')).forEach(k=>localStorage.removeItem(k));");
  console.log("Depois: Ctrl+F5 e faça login novamente.");
}

main().catch((error) => {
  console.error("reset-full: erro —", error);
  process.exit(1);
});
