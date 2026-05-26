/**
 * Redefine histórico de treino e matriz para testes.
 * Limpa TODOS os clientes e forjadores (service role obrigatória).
 *
 * Uso:
 *   node scripts/reset-test-training.mjs
 *   node scripts/reset-test-training.mjs --peito-only   (só exercícios peito 1–3)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PEITO_EXERCISE_IDS = [1, 2, 3];
const PEITO_EXERCISE_NAMES = [
  "Supino Reto Halteres",
  "Crucifixo Inclinado",
  "Crossover Polia Alta",
];

const FORJADOR_ROLES = new Set(["forjador", "forjador_linhagem", "forjador_soberano"]);
const peitoOnly = process.argv.includes("--peito-only");

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

function matchesPeitoCatalog(row) {
  const id = Number(row.exercicio_id);
  const name = String(row.exercicio_nome ?? "").trim();
  const musculo = String(row.musculo ?? "").trim().toLowerCase();

  if (PEITO_EXERCISE_IDS.includes(id)) return true;
  if (musculo === "peito" && PEITO_EXERCISE_NAMES.some((label) => name.includes(label.split(" ")[0]))) {
    return true;
  }
  return PEITO_EXERCISE_NAMES.some((label) => name === label);
}

function resolveActorLabel(role) {
  if (FORJADOR_ROLES.has(role)) return "forjador";
  return "cliente";
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("reset-test-training: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

  const targetHistorico = peitoOnly
    ? (allHistorico ?? []).filter(matchesPeitoCatalog)
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

  let matrizResetCount = 0;
  if (!peitoOnly) {
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

  const { data: remainingHistorico, error: verifyError } = await client
    .from("historico_treinos")
    .select("id, cliente_id, exercicio_id, exercicio_nome")
    .in("id", historicoIds.length > 0 ? historicoIds : [-1]);

  if (verifyError) {
    console.error("reset-test-training: verificação falhou —", verifyError.message);
    process.exit(1);
  }

  if (targetHistorico.length === 0 && matrizResetCount === 0) {
    console.log("reset-test-training: OK — banco já limpo (0 historico, 0 matriz).");
  } else {
    console.log("reset-test-training: OK");
  }
  console.log(`  escopo: ${peitoOnly ? "peito (exercícios 1–3)" : "TODOS — clientes e forjadores"}`);
  console.log(`  historico removido: ${targetHistorico.length}`);
  console.log(`  matriz_forca zerada: ${matrizResetCount}`);

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
        `    · ${name} [${role}] — #${row.exercicio_id} ${row.exercicio_nome} — ${row.peso_atual} kg · ${row.status ?? "—"}`,
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
  console.log("No browser: logout/login ou Ctrl+F5 para limpar localStorage meccafit:*");
}

main().catch((error) => {
  console.error("reset-test-training: erro inesperado —", error);
  process.exit(1);
});
