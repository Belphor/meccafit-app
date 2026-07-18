/**
 * Zera usuários e dados de produção/teste no Supabase — pronto para lançamento.
 *
 * Mantém: schema, policies, RPCs, argos_academia_config.
 * Remove: auth.users, profiles e todas as tabelas de dados de atleta/forja.
 *
 * Uso: node scripts/launch-wipe-database.mjs --confirm
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const CONFIRM = process.argv.includes("--confirm");
const SENTINEL = "00000000-0000-0000-0000-000000000000";

/** Ordem: filhos antes de pais (FKs). Views não entram. */
const DATA_TABLES = [
  { table: "duelos_supergrupos", column: "id" },
  { table: "historico_cargas", column: "id" },
  { table: "historico_treinos", column: "id", sentinel: -1 },
  { table: "historico_treino", column: "id", sentinel: -1 },
  { table: "historico_treinos_personais", column: "id" },
  { table: "historico_treinos_comuns", column: "id" },
  { table: "prescricoes_treino_forjador", column: "id" },
  { table: "planilhas_forjador", column: "id" },
  { table: "planos_semanais", column: "id" },
  { table: "planos_atletas", column: "atleta_id" },
  { table: "diet_blueprints", column: "id" },
  { table: "vip_dieta_semanal", column: "id" },
  { table: "vip_medidas_corporais", column: "id" },
  { table: "forger_client_bonds", column: "id" },
  { table: "evolucao_membro_estase", column: "user_id" },
  { table: "balanco_termico_diario", column: "user_id" },
  { table: "cardio_sessoes_diarias", column: "atleta_id" },
  { table: "calendario_ignicao", column: "atleta_id" },
  { table: "fenix_pureza_diaria", column: "user_id" },
  { table: "purity_logs", column: "id" },
  { table: "config_treino_atleta", column: "user_id" },
  { table: "matriz_forca", column: "id" },
  { table: "cliente_suporte_feedback", column: "id" },
  { table: "argos_forja_audit_log", column: "id" },
  { table: "workout_split_lane", column: "atleta_id" },
  { table: "profiles", column: "id" },
];

async function deleteAllRows(client, table, idColumn, sentinel) {
  const { count, error: countError } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    if (countError.code === "42P01" || countError.message?.includes("does not exist")) {
      return { table, removed: 0, skipped: true, reason: "ausente" };
    }
    return { table, removed: 0, error: countError.message };
  }

  if ((count ?? 0) === 0) {
    return { table, removed: 0 };
  }

  const sentinelValue = sentinel ?? (idColumn === "id" ? SENTINEL : SENTINEL);
  const { error } = await client.from(table).delete().neq(idColumn, sentinelValue);

  if (error) {
    // Fallback: algumas tabelas usam outra PK / não aceitam neq uuid
    const alt = await client.from(table).delete().gte(idColumn, sentinelValue === -1 ? -1 : SENTINEL);
    if (alt.error) {
      return { table, removed: 0, error: `${error.message} | alt: ${alt.error.message}` };
    }
  }

  return { table, removed: count ?? 0 };
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function resetSingletonRows(client) {
  const notes = [];

  const { error: meccaError } = await client
    .from("mecca_global_metrics")
    .update({
      total_weight_lifted: 0,
      active_streaks_count: 0,
      furnace_temperature: 0,
      updated_at: new Date().toISOString(),
    })
    .neq("id", SENTINEL);

  if (meccaError) {
    notes.push(`mecca_global_metrics: ${meccaError.message}`);
  } else {
    notes.push("mecca_global_metrics zerado");
  }

  const { error: metaError } = await client
    .from("metas_coletivas_academia")
    .update({
      tonelagem_atual_acumulada: 0,
      updated_at: new Date().toISOString(),
    })
    .neq("id", SENTINEL);

  if (metaError) {
    notes.push(`metas_coletivas_academia: ${metaError.message}`);
  } else {
    notes.push("metas_coletivas_academia zerada");
  }

  return notes;
}

async function main() {
  const env = loadEnvLocal();
  requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== FENYXIA · Launch wipe ===\n");
  console.log(`Projeto: ${url}`);

  const users = await listAllAuthUsers(admin);
  console.log(`auth.users encontrados: ${users.length}`);
  for (const user of users.slice(0, 30)) {
    console.log(`  - ${user.email ?? "(sem email)"} · ${user.id.slice(0, 8)}…`);
  }
  if (users.length > 30) console.log(`  … +${users.length - 30} mais`);

  if (!CONFIRM) {
    console.log("\nDry-run. Para apagar de verdade:");
    console.log("  node scripts/launch-wipe-database.mjs --confirm\n");
    process.exit(0);
  }

  console.log("\n1) Limpando tabelas de dados…");
  for (const entry of DATA_TABLES) {
    const result = await deleteAllRows(admin, entry.table, entry.column, entry.sentinel);
    if (result.error) {
      console.warn(`  [WARN] ${result.table}: ${result.error}`);
    } else if (result.skipped) {
      console.log(`  [SKIP] ${result.table} (${result.reason})`);
    } else {
      console.log(`  [OK] ${result.table}: ${result.removed} removido(s)`);
    }
  }

  console.log("\n2) Zerando métricas globais…");
  for (const note of await resetSingletonRows(admin)) {
    console.log(`  ${note}`);
  }

  console.log("\n3) Apagando auth.users…");
  let deleted = 0;
  let failed = 0;
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      failed += 1;
      console.warn(`  [FAIL] ${user.email ?? user.id}: ${error.message}`);
    } else {
      deleted += 1;
    }
  }
  console.log(`  auth.users apagados: ${deleted} · falhas: ${failed}`);

  const remaining = await listAllAuthUsers(admin);
  const { count: profileCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  console.log("\n=== Resultado ===");
  console.log(`  auth.users restantes: ${remaining.length}`);
  console.log(`  profiles restantes: ${profileCount ?? "?"}`);
  console.log("  argos_academia_config: preservado");
  console.log("\nBanco zerado para lançamento.\n");

  if (remaining.length > 0 || (profileCount ?? 0) > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("launch-wipe: erro —", error);
  process.exit(1);
});
