/**
 * Seed demo · Comunidade (mural avatares, duelos activos, termómetro colectivo)
 *
 * Pré-requisito: npm run seed:test-users
 * Uso: npm run seed:comunidade-demo
 *
 * Mural: usa registrar_treino_com_status (ARGOS bloqueia status em INSERT directo).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SEED_TAG = "comunidade-demo-v1";
const DEMO_PASSWORD = "senha123";
const DEMO_EXERCISE_IDS = [88101, 88102, 88103, 88104];

const MURAL_SEEDS = [
  {
    email: "cliente@meccafit.com",
    exercicioId: 88101,
    nome: "Supino Demo",
    musculo: "peito",
    peso: 120,
    series: 4,
    reps: 10,
  },
  {
    email: "atleta2@meccafit.com",
    exercicioId: 88102,
    nome: "Remada Demo",
    musculo: "costas",
    peso: 110,
    series: 4,
    reps: 12,
  },
  {
    email: "atleta3@meccafit.com",
    exercicioId: 88103,
    nome: "Agachamento Demo",
    musculo: "pernas",
    peso: 160,
    series: 5,
    reps: 8,
  },
  {
    email: "atleta4@meccafit.com",
    exercicioId: 88104,
    nome: "Desenvolvimento Demo",
    musculo: "ombros",
    peso: 60,
    series: 4,
    reps: 10,
  },
];

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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!url || !serviceKey || !anonKey) {
  console.error("seed-comunidade-demo: URL, service role e anon key obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveAthleteIds() {
  const { data: listed, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;

  const ids = [];
  for (const seed of MURAL_SEEDS) {
    const user = listed.users.find((row) => row.email?.toLowerCase() === seed.email.toLowerCase());
    if (!user?.id) {
      console.error(`seed-comunidade-demo: ${seed.email} ausente — rode npm run seed:test-users`);
      process.exit(1);
    }
    ids.push(user.id);
  }
  return ids;
}

async function clearDemoMural() {
  const { error } = await admin
    .from("historico_treinos")
    .delete()
    .in("exercicio_id", DEMO_EXERCISE_IDS);
  if (error) throw error;
}

async function seedSuperacaoViaRpc(seed) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sessionData, error: loginError } = await client.auth.signInWithPassword({
    email: seed.email,
    password: DEMO_PASSWORD,
  });

  if (loginError || !sessionData.session?.user?.id) {
    throw new Error(`login ${seed.email}: ${loginError?.message ?? "sem sessão"}`);
  }

  const userId = sessionData.user.id;

  const { error: rpcError } = await client.rpc("registrar_treino_com_status", {
    p_user_id: userId,
    p_exercicio_id: seed.exercicioId,
    p_exercicio_nome: seed.nome,
    p_musculo: seed.musculo,
    p_peso_atual: seed.peso,
    p_repeticoes: seed.reps,
    p_series: seed.series,
  });

  await client.auth.signOut();

  if (rpcError) {
    throw new Error(`RPC ${seed.nome}: ${rpcError.message}`);
  }
}

async function insertCarga(atletaId, grupo, exercicioId, carga, reps) {
  const { error } = await admin.from("historico_cargas").insert({
    atleta_id: atletaId,
    grupo_muscular: grupo,
    exercicio_id: `${SEED_TAG}-${exercicioId}-${Date.now()}`,
    carga_maxima: carga,
    repeticoes_acumuladas: reps,
    data_registro: new Date().toISOString(),
  });
  if (error) throw error;
}

async function ensurePlano(atletaId) {
  const { error } = await admin.from("planos_atletas").upsert(
    { atleta_id: atletaId, total_treinos_mensais_planejados: 16 },
    { onConflict: "atleta_id" },
  );
  if (error) throw error;
}

async function clearDemoDuels(athleteIds) {
  for (const id of athleteIds) {
    await admin.from("duelos_supergrupos").delete().eq("atleta_desafiante_id", id);
    await admin.from("duelos_supergrupos").delete().eq("atleta_desafiado_id", id);
  }
}

async function createActiveDuel(desafiante, desafiado, tipo, vtcDesafiante, vtcDesafiado) {
  const inicio = new Date();
  const fimDays = tipo === "SUPERIORES" ? 3 : 2;
  const fim = new Date(inicio.getTime() + fimDays * 24 * 3600 * 1000);

  const { error } = await admin.from("duelos_supergrupos").insert({
    atleta_desafiante_id: desafiante,
    atleta_desafiado_id: desafiado,
    tipo_confronto: tipo,
    vtc_desafiante: vtcDesafiante,
    vtc_desafiado: vtcDesafiado,
    status: "EM_ANDAMENTO",
    inicio_em: inicio.toISOString(),
    fim_em: fim.toISOString(),
  });

  if (error) throw error;
}

console.log("\n=== seed-comunidade-demo ===\n");

try {
  const [u1, u2, u3, u4] = await resolveAthleteIds();
  const athletes = [u1, u2, u3, u4];

  for (const id of athletes) {
    await ensurePlano(id);
  }

  console.log("1. Mural · superações via RPC ARGOS");
  await clearDemoMural();
  for (const seed of MURAL_SEEDS) {
    await seedSuperacaoViaRpc(seed);
    console.log(`  OK · ${seed.nome} (${seed.email})`);
  }

  const { count: muralCount } = await admin
    .from("historico_treinos")
    .select("id", { count: "exact", head: true })
    .in("exercicio_id", DEMO_EXERCISE_IDS)
    .eq("status", "SUPERAÇÃO");

  console.log(`  Verificado · ${muralCount ?? 0} superações no mural demo`);

  console.log("\n2. Termómetro colectivo · historico_cargas");
  const cargas = [
    [u1, "PEITO", "a", 80, 40],
    [u2, "COSTAS", "b", 70, 48],
    [u3, "PERNAS", "c", 120, 32],
    [u4, "PERNAS", "f", 100, 40],
    [u1, "OMBROS", "d", 40, 36],
    [u2, "PEITO", "e", 90, 30],
  ];
  for (const [id, grupo, ex, carga, reps] of cargas) {
    await insertCarga(id, grupo, ex, carga, reps);
    console.log(`  OK · ${grupo} · ${carga * reps} kg`);
  }

  console.log("\n3. Duelos activos · ranking");
  await clearDemoDuels(athletes);
  await createActiveDuel(u2, u3, "SUPERIORES", 4200, 3800);
  await createActiveDuel(u1, u4, "INFERIORES", 5600, 4900);
  console.log("  OK · SUPERIORES (atleta2 vs atleta3)");
  console.log("  OK · INFERIORES (cliente vs atleta4)");

  console.log("\n4. Títulos demo · THOTH");
  const { error: titulosErr } = await admin.rpc("comunidade_apply_demo_titulos", {
    p_cinturao_superiores_id: u2,
    p_cinturao_inferiores_id: u4,
    p_pilar_id: u3,
    p_rei_id: u4,
    p_todos_id: u1,
  });
  if (titulosErr) {
    if (titulosErr.code === "PGRST202") {
      console.log("  SKIP · aplique migrations 20260623100000 e 20260623120000 no Supabase");
    } else {
      throw titulosErr;
    }
  } else {
    console.log("  OK · atleta2 cinturão superiores · atleta4 cinturão inferiores + rei");
    console.log("  OK · atleta3 pilar · cliente todos os títulos");
  }

  const { data: meta } = await admin
    .from("metas_coletivas_academia")
    .select("tonelagem_atual_acumulada, tonelagem_alvo_kg")
    .order("mes_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(
    "\nTermómetro:",
    meta?.tonelagem_atual_acumulada ?? 0,
    "kg / meta",
    meta?.tonelagem_alvo_kg ?? 100000,
  );

  const { count: dueloCount } = await admin
    .from("duelos_supergrupos")
    .select("id", { count: "exact", head: true })
    .eq("status", "EM_ANDAMENTO");

  console.log("Duelos activos:", dueloCount ?? 0);
  console.log("\nseed-comunidade-demo: concluído → /dashboard?tab=comunidade\n");
} catch (error) {
  console.error("\nseed-comunidade-demo FALHOU:", error.message ?? error);
  process.exit(1);
}
