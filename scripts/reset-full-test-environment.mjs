/**
 * Limpeza completa para testes reais — treinos, planilha, prescrições, mural, comunidade, evolução.
 *
 * Uso: node scripts/reset-full-test-environment.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();

async function deleteAllRows(client, table, idColumn = "id") {
  const { count, error: countError } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    if (countError.code === "42P01") return 0;
    throw new Error(`${table} count: ${countError.message}`);
  }

  if ((count ?? 0) === 0) return 0;

  const sentinel =
    idColumn === "id" && table === "historico_treinos" ? -1 : "00000000-0000-0000-0000-000000000000";

  const { error } = await client.from(table).delete().neq(idColumn, sentinel);
  if (error) {
    const altUser = await client.from(table).delete().neq("user_id", sentinel);
    if (altUser.error) {
      const altAtleta = await client.from(table).delete().neq("atleta_id", sentinel);
      if (altAtleta.error && altAtleta.error.code !== "42P01") {
        throw new Error(`${table} delete: ${altAtleta.error.message}`);
      }
    }
  }

  return count ?? 0;
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("reset-full: iniciando limpeza completa…");

  const historicoRemoved = await deleteAllRows(client, "historico_treinos", "id");
  const historicoTreinoRemoved = await deleteAllRows(client, "historico_treino", "id");
  const historicoCargasRemoved = await deleteAllRows(client, "historico_cargas", "id");
  const historicoPersonaisRemoved = await deleteAllRows(client, "historico_treinos_personais", "id");

  const sideTables = [
    "evolucao_membro_estase",
    "balanco_termico_diario",
    "cardio_sessoes_diarias",
    "calendario_ignicao",
    "purity_logs",
    "vip_medidas_corporais",
    "vip_dieta_semanal",
    "diet_blueprints",
    "planilhas_forjador",
    "prescricoes_treino_forjador",
    "planos_semanais",
    "duelos_supergrupos",
    "comunidade_titulos",
  ];

  const sideCounts = {};
  for (const table of sideTables) {
    sideCounts[table] = await deleteAllRows(client, table).catch((error) => {
      console.warn(`${table}:`, error.message);
      return 0;
    });
  }

  const { error: matrizError } = await client
    .from("matriz_forca")
    .update({ vtc_atual: 0, max_peso: 0, total_sessoes: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (matrizError) {
    console.warn("matriz_forca:", matrizError.message);
  }

  const { error: profilesError } = await client
    .from("profiles")
    .update({ vtc_atual: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (profilesError) {
    console.warn("profiles vtc reset:", profilesError.message);
  }

  const { error: planosResetError } = await client
    .from("planos_atletas")
    .update({
      tem_cinturao_duelo: false,
      tem_cinturao_superiores: false,
      tem_cinturao_inferiores: false,
      is_rei_das_chamas: false,
      is_rei_chamas_superiores: false,
      is_rei_chamas_inferiores: false,
      is_pilar_cooperativo: false,
      grupos_obrigatorios: [],
    })
    .neq("atleta_id", "00000000-0000-0000-0000-000000000000");

  if (planosResetError) {
    console.warn("planos_atletas titulos:", planosResetError.message);
  }

  console.log("reset-full: OK");
  console.log(`  historico_treinos removidos: ${historicoRemoved}`);
  console.log(`  historico_treino removidos: ${historicoTreinoRemoved}`);
  console.log(`  historico_cargas removidos: ${historicoCargasRemoved}`);
  console.log(`  historico_treinos_personais removidos: ${historicoPersonaisRemoved}`);
  for (const [table, count] of Object.entries(sideCounts)) {
    console.log(`  ${table} removidos: ${count}`);
  }
  console.log("  planos_atletas: titulos e grupos_obrigatorios zerados");
  console.log("");
  console.log("No navegador (F12 → Console):");
  console.log(
    "  Object.keys(localStorage).filter(k=>k.startsWith('meccafit:')).forEach(k=>localStorage.removeItem(k));",
  );
  console.log("Depois: Ctrl+F5 e faça login novamente.");
}

main().catch((error) => {
  console.error("reset-full: erro —", error);
  process.exit(1);
});
