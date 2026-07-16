/**
 * Popula historico_treinos com o catálogo de teste (6 grupos musculares).
 * Requer usuários ARGOS (npm run seed:test-users).
 *
 * Uso:
 *   node scripts/seed-test-training.mjs
 *   node scripts/seed-test-training.mjs --user=cliente_principal
 *   node scripts/seed-test-training.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";
import { listCatalogExercises } from "./lib/exercise-catalog.mjs";
import { resolveTreinoPersistPayload, formatSeedMetricLabel } from "./lib/training-metric.mjs";

const dryRun = process.argv.includes("--dry-run");
const userLabel =
  process.argv.find((arg) => arg.startsWith("--user="))?.slice("--user=".length) ||
  "cliente_principal";

/** Dia da planilha (1=Seg … 6=Sáb) alinhado ao calendário civil de Brasília. */
function resolvePlanilhaDiaSp() {
  const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dow = spNow.getDay();
  return dow === 0 ? 1 : dow === 6 ? 6 : dow;
}

const planilhaDiaHoje = resolvePlanilhaDiaSp();

function loadTestUsers() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const env = loadEnvLocal();
requireEnv(env, [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!anonKey) {
  console.error("seed-test-training: NEXT_PUBLIC_SUPABASE_ANON_KEY obrigatório.");
  process.exit(1);
}

const registry = loadTestUsers();
const account = registry?.users?.[userLabel];

if (!account?.userId || !account?.email) {
  console.error(`seed-test-training: usuário '${userLabel}' ausente em test-users.json`);
  console.error("Rode: npm run seed:test-users");
  process.exit(1);
}

async function main() {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sessionData, error: loginError } = await client.auth.signInWithPassword({
    email: account.email,
    password: "senha123",
  });

  if (loginError || !sessionData.session) {
    console.error(`seed-test-training: login falhou (${account.email}) —`, loginError?.message);
    process.exit(1);
  }

  const userId = sessionData.user.id;
  const exercises = listCatalogExercises();

  console.log(`seed-test-training: ${exercises.length} exercícios · ${account.email}`);

  if (dryRun) {
    for (const exercise of exercises) {
      console.log(
        `  · #${exercise.id} ${exercise.name} (${exercise.musculo}) — ${formatSeedMetricLabel(exercise)}`,
      );
    }
    return;
  }

  let seeded = 0;
  let skipped = 0;

  for (const exercise of exercises) {
    const { data: existing } = await client
      .from("historico_treinos")
      .select("id")
      .eq("cliente_id", userId)
      .eq("exercicio_id", exercise.id)
      .maybeSingle();

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const payload = resolveTreinoPersistPayload({
      metricKind: exercise.metricKind,
      musculo: exercise.musculo,
      exercicioId: exercise.id,
      metricValue: exercise.seedMetric,
      prescribedSeries: exercise.targetSets,
    });

    const { error } = await client.rpc("registrar_treino_com_status", {
      p_user_id: userId,
      p_exercicio_id: exercise.id,
      p_exercicio_nome: exercise.name,
      p_musculo: exercise.musculo,
      p_peso_atual: payload.pesoAtual,
      p_repeticoes: payload.repeticoes,
      p_series: payload.series,
      p_dia_planilha: planilhaDiaHoje,
    });

    if (error) {
      console.error(`  FAIL #${exercise.id} ${exercise.name} — ${error.message}`);
      process.exit(1);
    }

    seeded += 1;
    console.log(
      `  OK #${exercise.id} ${exercise.name} — ${formatSeedMetricLabel(exercise)}`,
    );
  }

  console.log("");
  console.log(`seed-test-training: concluído — ${seeded} inseridos · ${skipped} já existiam`);
  console.log("Rotas de teste:");
  console.log("  /dashboard?subgrupo=peitoral-superior");
  console.log("  /dashboard?subgrupo=ombros-deltoides");
  console.log("  /dashboard?subgrupo=bracos-biceps-triceps");
  console.log("  /dashboard?subgrupo=costas-dorsal");
  console.log("  /dashboard?subgrupo=core");
  console.log("  /dashboard?subgrupo=membro-inferior");
  console.log("  /evolucao");
}

main().catch((error) => {
  console.error("seed-test-training: erro —", error);
  process.exit(1);
});
