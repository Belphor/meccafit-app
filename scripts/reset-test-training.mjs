/**
 * Redefine histórico de treino e matriz para testes.
 * Limpa TODOS os clientes e forjadores (service role obrigatória).
 *
 * Uso:
 *   node scripts/reset-test-training.mjs
 *   node scripts/reset-test-training.mjs --catalog-only   (só exercícios do catálogo ARGOS)
 *   node scripts/reset-test-training.mjs --first-run      (estado inicial · sem seed)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";
import { findCatalogExercise, listCatalogExerciseIds, matchesCatalogExercise } from "./lib/exercise-catalog.mjs";

function formatHistoricoMetric(row) {
  const catalogEntry = findCatalogExercise(Number(row.exercicio_id));
  const value = row.peso_atual;
  if (catalogEntry?.metricKind === "duration_sec") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes <= 0) return `${seconds} s`;
    if (seconds <= 0) return `${minutes} min`;
    return `${minutes} min ${seconds} s`;
  }
  if (catalogEntry?.metricKind === "rep_max" || row.musculo === "abdomen") {
    return `${value} rep`;
  }
  return `${value} kg`;
}

const FORJADOR_ROLES = new Set(["forjador", "forjador_linhagem", "forjador_soberano"]);
const firstRun = process.argv.includes("--first-run");
const catalogOnly = process.argv.includes("--catalog-only") || firstRun;

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();

function resolveActorLabel(role) {
  if (FORJADOR_ROLES.has(role)) return "forjador";
  return "cliente";
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const catalogIds = new Set(listCatalogExerciseIds());

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, role, full_name, nome_linhagem");

  if (profilesError) {
    console.error("reset-test-training: leitura profiles falhou —", profilesError.message);
    process.exit(1);
  }

  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));

  const { data: allHistorico, error: historicoError } = await client
    .from("historico_treinos")
    .select("id, cliente_id, exercicio_id, exercicio_nome, peso_atual, series, status, musculo")
    .order("cliente_id", { ascending: true });

  if (historicoError) {
    console.error("reset-test-training: leitura historico falhou —", historicoError.message);
    process.exit(1);
  }

  const targetHistorico = catalogOnly
    ? (allHistorico ?? []).filter(matchesCatalogExercise)
    : (allHistorico ?? []);

  const historicoIds = targetHistorico.map((row) => row.id);

  if (historicoIds.length > 0) {
    const { error: deleteHistoricoError } = await client
      .from("historico_treinos")
      .delete()
      .in("id", historicoIds);

    if (deleteHistoricoError) {
      console.error("reset-test-training: delete historico falhou —", deleteHistoricoError.message);
      process.exit(1);
    }
  }

  const affectedUserIds = [
    ...new Set(
      targetHistorico.map((row) => row.cliente_id).filter((id) => typeof id === "string" && id.length > 0),
    ),
  ];

  let estaseResetCount = 0;
  {
    const { data: estaseRows, error: estaseReadError } = await client
      .from("evolucao_membro_estase")
      .select("user_id, membro_principal");

    if (estaseReadError) {
      console.error("reset-test-training: leitura evolucao_membro_estase falhou —", estaseReadError.message);
      process.exit(1);
    }

    estaseResetCount = estaseRows?.length ?? 0;

    if (estaseResetCount > 0 && (catalogOnly || affectedUserIds.length > 0)) {
      const { error: estaseDeleteError } = catalogOnly
        ? await client
            .from("evolucao_membro_estase")
            .delete()
            .neq("user_id", "00000000-0000-0000-0000-000000000000")
        : await client.from("evolucao_membro_estase").delete().in("user_id", affectedUserIds);

      if (estaseDeleteError) {
        console.error("reset-test-training: reset estase falhou —", estaseDeleteError.message);
        process.exit(1);
      }
    }
  }

  let balancoResetCount = 0;
  {
    const { data: balancoRows, error: balancoReadError } = await client
      .from("balanco_termico_diario")
      .select("user_id, data_treino");

    if (balancoReadError) {
      console.error("reset-test-training: leitura balanco_termico falhou —", balancoReadError.message);
      process.exit(1);
    }

    balancoResetCount = balancoRows?.length ?? 0;

    if (balancoResetCount > 0 && (catalogOnly || affectedUserIds.length > 0)) {
      const { error: balancoDeleteError } = catalogOnly
        ? await client
            .from("balanco_termico_diario")
            .delete()
            .neq("user_id", "00000000-0000-0000-0000-000000000000")
        : await client.from("balanco_termico_diario").delete().in("user_id", affectedUserIds);

      if (balancoDeleteError) {
        console.error("reset-test-training: reset balanco falhou —", balancoDeleteError.message);
        process.exit(1);
      }
    }
  }

  let matrizResetCount = 0;
  {
    const { data: matrizRows, error: matrizReadError } = await client
      .from("matriz_forca")
      .select("id, cliente_id, musculo, vtc_atual");

    if (matrizReadError) {
      console.error("reset-test-training: leitura matriz falhou —", matrizReadError.message);
      process.exit(1);
    }

    const matrizIds = (matrizRows ?? []).map((row) => row.id);
    if (matrizIds.length > 0) {
      const { error: matrizUpdateError } = await client
        .from("matriz_forca")
        .update({ vtc_atual: 0 })
        .in("id", matrizIds);

      if (matrizUpdateError) {
        console.error("reset-test-training: reset matriz falhou —", matrizUpdateError.message);
        process.exit(1);
      }
      matrizResetCount = matrizIds.length;
    }
  }

  const midasTables = [
    { table: "historico_cargas", column: "atleta_id" },
    { table: "calendario_ignicao", column: "atleta_id" },
    { table: "purity_logs", column: "user_id" },
  ];

  const midasResetCounts = {};
  for (const { table, column } of midasTables) {
    const { count, error: countError } = await client
      .from(table)
      .select("*", { count: "exact", head: true });

    if (countError) {
      if (countError.code === "42P01" || (countError.message ?? "").includes("does not exist")) {
        midasResetCounts[table] = 0;
        continue;
      }
      console.error(`reset-test-training: leitura ${table} falhou —`, countError.message);
      process.exit(1);
    }

    if ((count ?? 0) > 0) {
      const { error: deleteError } = await client
        .from(table)
        .delete()
        .neq(column, "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        console.error(`reset-test-training: reset ${table} falhou —`, deleteError.message);
        process.exit(1);
      }
    }

    midasResetCounts[table] = count ?? 0;
  }

  const { data: remainingHistorico, error: verifyError } = await client
    .from("historico_treinos")
    .select("id, cliente_id, exercicio_id, exercicio_nome")
    .in("id", historicoIds.length > 0 ? historicoIds : [-1]);

  if (verifyError) {
    console.error("reset-test-training: verificação falhou —", verifyError.message);
    process.exit(1);
  }

  if (targetHistorico.length === 0 && matrizResetCount === 0 && estaseResetCount === 0 && balancoResetCount === 0) {
    console.log("reset-test-training: OK — banco já limpo.");
  } else {
    console.log("reset-test-training: OK");
  }

  console.log(
    `  escopo: ${firstRun ? "primeira abertura (catálogo · sem histórico)" : catalogOnly ? `catálogo (${catalogIds.size} exercícios)` : "TODOS — clientes e forjadores"}`,
  );
  console.log(`  historico removido: ${targetHistorico.length}`);
  console.log(`  evolucao_membro_estase removida: ${estaseResetCount}`);
  console.log(`  balanco_termico_diario removido: ${balancoResetCount}`);
  console.log(`  matriz_forca zerada: ${matrizResetCount}`);
  console.log(`  historico_cargas removido: ${midasResetCounts.historico_cargas ?? 0}`);
  console.log(`  calendario_ignicao removido: ${midasResetCounts.calendario_ignicao ?? 0}`);
  console.log(`  purity_logs removido: ${midasResetCounts.purity_logs ?? 0}`);

  const byActor = { cliente: [], forjador: [], desconhecido: [] };

  for (const row of targetHistorico) {
    const profile = row.cliente_id ? profileById.get(row.cliente_id) : null;
    const actor = profile ? resolveActorLabel(profile.role) : "desconhecido";
    byActor[actor].push({ row, profile });
  }

  for (const actor of ["cliente", "forjador", "desconhecido"]) {
    const entries = byActor[actor];
    if (entries.length === 0) continue;

    console.log(`  ${actor}s (${entries.length} registro(s)):`);
    for (const { row, profile } of entries) {
      const name = profile?.full_name?.trim() || profile?.nome_linhagem?.trim() || row.cliente_id;
      const role = profile?.role ?? "—";
      console.log(
        `    · ${name} [${role}] — #${row.exercicio_id} ${row.exercicio_nome} — ${formatHistoricoMetric(row)} · ${row.status ?? "—"}`,
      );
    }
  }

  if ((remainingHistorico?.length ?? 0) > 0) {
    console.error("");
    console.error("reset-test-training: AVISO — registros ainda presentes:");
    for (const row of remainingHistorico) {
      console.error(`    · id=${row.id} #${row.exercicio_id} ${row.exercicio_nome}`);
    }
    process.exit(1);
  }

  console.log("");
  if (firstRun) {
    console.log("Estado inicial pronto — nenhum treino registrado.");
    console.log("No browser (F12 → Console), cole:");
    console.log("  Object.keys(localStorage).filter(k=>k.startsWith('meccafit:')).forEach(k=>localStorage.removeItem(k));");
    console.log("Depois: Ctrl+F5 · /dashboard");
  } else {
    console.log("Próximo passo: npm run seed:test-training");
    console.log("No browser: logout/login ou Ctrl+F5 para limpar localStorage meccafit:*");
  }
}

main().catch((error) => {
  console.error("reset-test-training: erro inesperado —", error);
  process.exit(1);
});
