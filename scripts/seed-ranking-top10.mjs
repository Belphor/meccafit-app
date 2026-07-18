/**
 * Seed · Ranking Top 10 VTC (Comunidade)
 *
 * Cria atleta5–atleta10 e popula historico_cargas para 10 clientes
 * (cliente + atleta2…atleta10) com VTC global distinto no mês atual.
 *
 * Pré-requisito: npm run seed:test-users (ou este script cria atleta5–10)
 * Uso: npm run seed:ranking-top10
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertAllowSeedTestUsers } from "./lib/seed-credentials.mjs";

assertAllowSeedTestUsers("seed-ranking-top10");

const SEED_TAG = "ranking-top10";
const PASSWORD = "senha123";

/** Ordem = posição no ranking global (1 = maior VTC) */
const RANKING_SEEDS = [
  { email: "atleta10@meccafit.com", full_name: "Atleta Dez", vtcTotal: 2800 },
  { email: "atleta9@meccafit.com", full_name: "Atleta Nove", vtcTotal: 2550 },
  { email: "atleta8@meccafit.com", full_name: "Atleta Oito", vtcTotal: 2300 },
  { email: "atleta7@meccafit.com", full_name: "Atleta Sete", vtcTotal: 2050 },
  { email: "atleta6@meccafit.com", full_name: "Atleta Seis", vtcTotal: 1800 },
  { email: "atleta5@meccafit.com", full_name: "Atleta Cinco", vtcTotal: 1550 },
  { email: "atleta4@meccafit.com", full_name: "Atleta Quatro", vtcTotal: 1300 },
  { email: "atleta3@meccafit.com", full_name: "Atleta Três", vtcTotal: 1050 },
  { email: "atleta2@meccafit.com", full_name: "Atleta Dois", vtcTotal: 800 },
  { email: "cliente@meccafit.com", full_name: "Cliente Teste", vtcTotal: 550 },
];

const EXTRA_USERS = [
  {
    email: "atleta5@meccafit.com",
    full_name: "Atleta Cinco",
    nome_linhagem: "Linhagem Argos E",
  },
  {
    email: "atleta6@meccafit.com",
    full_name: "Atleta Seis",
    nome_linhagem: "Linhagem Argos F",
  },
  {
    email: "atleta7@meccafit.com",
    full_name: "Atleta Sete",
    nome_linhagem: "Linhagem Argos G",
  },
  {
    email: "atleta8@meccafit.com",
    full_name: "Atleta Oito",
    nome_linhagem: "Linhagem Argos H",
  },
  {
    email: "atleta9@meccafit.com",
    full_name: "Atleta Nove",
    nome_linhagem: "Linhagem Argos I",
  },
  {
    email: "atleta10@meccafit.com",
    full_name: "Atleta Dez",
    nome_linhagem: "Linhagem Argos J",
  },
];

const GRUPOS = ["PEITO", "OMBROS", "COSTAS", "PERNAS"];
const GRUPO_WEIGHTS = [0.28, 0.22, 0.25, 0.25];

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

function splitVtc(total) {
  const peito = Math.round(total * GRUPO_WEIGHTS[0]);
  const ombros = Math.round(total * GRUPO_WEIGHTS[1]);
  const costas = Math.round(total * GRUPO_WEIGHTS[2]);
  const pernas = total - peito - ombros - costas;
  return { PEITO: peito, OMBROS: ombros, COSTAS: costas, PERNAS: pernas };
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("seed-ranking-top10: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listAllUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users;
}

async function ensureExtraUser(account) {
  const users = await listAllUsers();
  const existing = users.find((u) => u.email?.toLowerCase() === account.email.toLowerCase());

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name,
        data_nascimento: "1993-01-01",
        role: "cliente",
        nome_linhagem: account.nome_linhagem,
      },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.full_name,
      data_nascimento: "1993-01-01",
      role: "cliente",
      nome_linhagem: account.nome_linhagem,
    },
  });
  if (error) throw error;
  console.log(`  Criado · ${account.email}`);
  return data.user.id;
}

async function resolveAthleteId(email, users) {
  const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!hit?.id) {
    throw new Error(`${email} ausente — rode npm run seed:test-users`);
  }
  return hit.id;
}

async function ensurePlano(atletaId) {
  const { error } = await admin.from("planos_atletas").upsert(
    { atleta_id: atletaId, total_treinos_mensais_planejados: 16 },
    { onConflict: "atleta_id" },
  );
  if (error) throw error;
}

async function clearRankingCargas() {
  const { error } = await admin
    .from("historico_cargas")
    .delete()
    .like("exercicio_id", `${SEED_TAG}-%`);
  if (error) throw error;
}

async function insertCarga(atletaId, grupo, suffix, carga) {
  const { error } = await admin.from("historico_cargas").insert({
    atleta_id: atletaId,
    grupo_muscular: grupo,
    exercicio_id: `${SEED_TAG}-${suffix}`,
    carga_maxima: carga,
    repeticoes_acumuladas: 10,
    data_registro: new Date().toISOString(),
  });
  if (error) throw error;
}

console.log("\n=== seed-ranking-top10 ===\n");

try {
  console.log("1. Utilizadores atleta5–atleta10");
  for (const account of EXTRA_USERS) {
    await ensureExtraUser(account);
  }

  const users = await listAllUsers();

  console.log("\n2. Planos atletas");
  const athleteIds = [];
  for (const seed of RANKING_SEEDS) {
    const id = await resolveAthleteId(seed.email, users);
    athleteIds.push(id);
    await ensurePlano(id);
  }
  console.log(`  OK · ${athleteIds.length} planos`);

  console.log("\n3. historico_cargas · VTC mensal");
  await clearRankingCargas();

  for (let index = 0; index < RANKING_SEEDS.length; index++) {
    const seed = RANKING_SEEDS[index];
    const atletaId = athleteIds[index];
    const split = splitVtc(seed.vtcTotal);
    const pos = index + 1;

    for (const grupo of GRUPOS) {
      await insertCarga(atletaId, grupo, `${pos}-${grupo.toLowerCase()}`, split[grupo]);
    }

    console.log(
      `  #${pos} · ${seed.full_name} · VTC ~${seed.vtcTotal} kg (${seed.email})`,
    );
  }

  console.log("\n4. Verificação · Top 10 esperado");
  for (const seed of RANKING_SEEDS) {
    console.log(`  ${seed.full_name} · ${seed.vtcTotal} kg`);
  }

  console.log("\nseed-ranking-top10: concluído → /dashboard?tab=comunidade#comunidade-rankings");
  console.log("Senha de todos: senha123\n");
} catch (error) {
  console.error("\nseed-ranking-top10 FALHOU:", error.message ?? error);
  process.exit(1);
}
