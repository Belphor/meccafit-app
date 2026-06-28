/**
 * Limpeza completa para testes reais — treinos, planilha, prescrições, mural, comunidade, evolução.
 *
 * Uso: node scripts/reset-full-test-environment.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();
const SENTINEL = "00000000-0000-0000-0000-000000000000";

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
    idColumn === "id" && table === "historico_treinos" ? -1 : SENTINEL;

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

async function ensureComunidadeResetRpc() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: probeError } = await client.rpc("comunidade_reset_test_environment");
  if (!probeError) return true;

  if (probeError.code !== "PGRST202") {
    throw new Error(`comunidade_reset_test_environment: ${probeError.message}`);
  }

  const dbUrl = env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) return false;

  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260627260000_comunidade_reset_test_environment.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  const { default: pg } = await import("pg");
  const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();
  try {
    await pgClient.query(sql);
    await pgClient.query("NOTIFY pgrst, 'reload schema';");
  } finally {
    await pgClient.end();
  }
  return true;
}

async function resetComunidadeArenaFallback(client) {
  const duelosRemovidos = await deleteAllRows(client, "duelos_supergrupos");
  const cargasRemovidas = await deleteAllRows(client, "historico_cargas");
  await deleteAllRows(client, "comunidade_titulos").catch(() => 0);

  const { data: metasBefore } = await client
    .from("metas_coletivas_academia")
    .select("id, tonelagem_atual_acumulada");

  let metasZeradas = 0;
  if (metasBefore?.length) {
    const { error: metaError } = await client
      .from("metas_coletivas_academia")
      .update({ tonelagem_atual_acumulada: 0, updated_at: new Date().toISOString() })
      .neq("id", SENTINEL);

    if (metaError) {
      console.warn("metas_coletivas_academia:", metaError.message);
    } else {
      metasZeradas = metasBefore.filter((row) => Number(row.tonelagem_atual_acumulada) > 0).length;
    }
  }

  const { data: planos, error: planosReadError } = await client
    .from("planos_atletas")
    .select(
      "atleta_id, total_treinos_mensais_planejados, tem_cinturao_duelo, tem_cinturao_superiores, tem_cinturao_inferiores, is_rei_das_chamas, is_rei_chamas_superiores, is_rei_chamas_inferiores, is_pilar_cooperativo",
    );

  if (planosReadError) {
    throw new Error(`planos_atletas read: ${planosReadError.message}`);
  }

  let planosAtualizados = 0;
  for (const row of planos ?? []) {
    const hadTitle =
      row.tem_cinturao_duelo ||
      row.tem_cinturao_superiores ||
      row.tem_cinturao_inferiores ||
      row.is_rei_das_chamas ||
      row.is_rei_chamas_superiores ||
      row.is_rei_chamas_inferiores ||
      row.is_pilar_cooperativo;

    const { error: deleteError } = await client
      .from("planos_atletas")
      .delete()
      .eq("atleta_id", row.atleta_id);

    if (deleteError) {
      console.warn(`planos_atletas delete ${row.atleta_id}:`, deleteError.message);
      continue;
    }

    const { error: insertError } = await client.from("planos_atletas").insert({
      atleta_id: row.atleta_id,
      total_treinos_mensais_planejados: row.total_treinos_mensais_planejados ?? 16,
      grupos_obrigatorios: [],
    });

    if (insertError) {
      console.warn(`planos_atletas insert ${row.atleta_id}:`, insertError.message);
      continue;
    }

    if (hadTitle) planosAtualizados += 1;
  }

  return {
    duelos_removidos: duelosRemovidos,
    cargas_removidas: cargasRemovidas,
    metas_zeradas: metasZeradas,
    planos_atualizados: planosAtualizados,
    modo: "fallback",
  };
}

async function resetComunidadeArena(client) {
  const hasRpc = await ensureComunidadeResetRpc();

  if (hasRpc) {
    const { data, error } = await client.rpc("comunidade_reset_test_environment");
    if (error) {
      throw new Error(`comunidade_reset_test_environment: ${error.message}`);
    }
    return { ...(data ?? {}), modo: "rpc" };
  }

  console.warn("reset-full: RPC ausente — limpando comunidade via fallback (delete/reinsert planos).");
  return resetComunidadeArenaFallback(client);
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("reset-full: iniciando limpeza completa…");

  const comunidade = await resetComunidadeArena(client);

  const historicoRemoved = await deleteAllRows(client, "historico_treinos", "id");
  const historicoTreinoRemoved = await deleteAllRows(client, "historico_treino", "id");
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
    .neq("id", SENTINEL);

  if (matrizError) {
    console.warn("matriz_forca:", matrizError.message);
  }

  console.log("reset-full: OK");
  console.log(`  comunidade.modo: ${comunidade.modo ?? "?"}`);
  console.log(`  comunidade.duelos_removidos: ${comunidade.duelos_removidos ?? "?"}`);
  console.log(`  comunidade.cargas_removidas: ${comunidade.cargas_removidas ?? "?"}`);
  console.log(`  comunidade.metas_zeradas: ${comunidade.metas_zeradas ?? "?"}`);
  console.log(`  comunidade.planos_atualizados: ${comunidade.planos_atualizados ?? "?"}`);
  console.log(`  historico_treinos removidos: ${historicoRemoved}`);
  console.log(`  historico_treino removidos: ${historicoTreinoRemoved}`);
  console.log(`  historico_treinos_personais removidos: ${historicoPersonaisRemoved}`);
  for (const [table, count] of Object.entries(sideCounts)) {
    console.log(`  ${table} removidos: ${count}`);
  }
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
