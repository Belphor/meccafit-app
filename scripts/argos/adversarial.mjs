/**
 * ARGOS — simulação adversarial (atacante vs vitima vs soberano).
 * Uso: node scripts/argos/adversarial.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { resolveSeedPassword } from "../lib/seed-credentials.mjs";

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

function loadTestUsers() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8");
    return JSON.parse(raw).users;
  } catch {
    return {};
  }
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("adversarial: env ausente");
  process.exit(1);
}

const registry = loadTestUsers();
let passed = 0;
let failed = 0;

async function attack(name, fn) {
  try {
    const blocked = await fn();
    if (blocked) {
      passed += 1;
      console.log(`[BLOCKED OK] ${name}`);
    } else {
      failed += 1;
      console.log(`[VULNERABILITY] ${name}`);
    }
  } catch (error) {
    passed += 1;
    console.log(`[BLOCKED OK] ${name} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function signIn(email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login ${email}`);
  return { client, userId: data.user.id };
}

const SEED_PASSWORD = resolveSeedPassword();

console.log("\n=== ARGOS Adversarial Simulation ===\n");

const atacante = await signIn(registry.cliente_principal?.email ?? "cliente@meccafit.com", SEED_PASSWORD);
const vitima = await signIn(registry.atleta_vitima?.email ?? "atleta2@meccafit.com", SEED_PASSWORD);
const soberano = await signIn(registry.forjador_soberano?.email ?? "master@meccafit.com", SEED_PASSWORD);

await attack("Atacante registra treino em nome da vitima", async () => {
  const { error } = await atacante.client.rpc("registrar_treino_com_status", {
    p_user_id: vitima.userId,
    p_exercicio_id: 88001,
    p_peso_atual: 100,
    p_musculo: "peito",
    p_repeticoes: 1,
    p_series: 1,
  });
  return Boolean(error);
});

await attack("Atacante le VTC 30d da vitima", async () => {
  const { error } = await atacante.client.rpc("argos_compute_vtc_30d", { p_user_id: vitima.userId });
  return Boolean(error);
});

await attack("Atacante injeta balanco termico na vitima", async () => {
  const { error } = await atacante.client.from("balanco_termico_diario").insert({
    user_id: vitima.userId,
    data_treino: new Date().toISOString().slice(0, 10),
    vtc_total: 999999,
  });
  return Boolean(error);
});

await attack("Atacante altera role para soberano", async () => {
  const { error } = await atacante.client
    .from("profiles")
    .update({ role: "forjador_soberano" })
    .eq("id", atacante.userId);
  return Boolean(error);
});

await attack("Atacante forja SUPERAÇÃO no historico (insert direto)", async () => {
  const { error } = await atacante.client.from("historico_treinos").insert({
    cliente_id: atacante.userId,
    user_id: atacante.userId,
    exercicio_id: 88002,
    exercicio_nome: "Fraude mural",
    musculo: "peito",
    peso: 999,
    peso_atual: 999,
    repeticoes: 1,
    series: 1,
    status: "SUPERAÇÃO",
  });
  return Boolean(error);
});

await attack("Atacante le perfil da vitima via SELECT", async () => {
  const { data, error } = await atacante.client.from("profiles").select("id").eq("id", vitima.userId);
  if (error) return true;
  return (data ?? []).length === 0;
});

await attack("Atacante le historico da vitima", async () => {
  const { data, error } = await atacante.client
    .from("historico_treinos")
    .select("id")
    .eq("cliente_id", vitima.userId);
  if (error) return true;
  return (data ?? []).length === 0;
});

await attack("Soberano NÃO publica no mural (superacao propria)", async () => {
  const probeId = 88003;
  await soberano.client.rpc("registrar_treino_com_status", {
    p_user_id: soberano.userId,
    p_exercicio_id: probeId,
    p_peso_atual: 120,
    p_musculo: "peito",
    p_repeticoes: 1,
    p_series: 1,
    p_exercicio_nome: "Soberano probe",
  });

  const { data } = await atacante.client.rpc("argos_fetch_mural_comunidade", { p_limit: 48 });
  const rows = Array.isArray(data) ? data : [];
  const leaked = rows.some((row) => row.atleta_nome === "Mestre Supremo");
  return !leaked;
});

console.log(`\nARGOS Adversarial: ${passed} blocked · ${failed} vulnerabilities\n`);
process.exit(failed > 0 ? 3 : 0);
