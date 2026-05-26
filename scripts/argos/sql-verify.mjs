/**
 * ARGOS — verificação SQL/RPC pós-migration (Thermal Gravity + integridade).
 * Uso: node scripts/argos/sql-verify.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
    return null;
  }
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("sql-verify: env ausente");
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    const ok = await fn();
    if (ok) {
      passed += 1;
      console.log(`[PASS] ${name}`);
    } else {
      failed += 1;
      console.log(`[FAIL] ${name}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`[FAIL] ${name} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function signIn(email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

console.log("\n=== ARGOS SQL Verify ===\n");

const registry = loadTestUsers();
const clienteEmail = registry?.cliente_principal?.email ?? "cliente@meccafit.com";
const vitimaEmail = registry?.atleta_vitima?.email ?? "atleta2@meccafit.com";

const cliente = await signIn(clienteEmail, "senha123");
let vitima = null;
try {
  vitima = await signIn(vitimaEmail, "senha123");
} catch {
  console.warn("atleta2 ausente — rode: node scripts/seed-test-users.mjs");
}

await check("tabela balanco_termico_diario existe", async () => {
  const { error } = await cliente.client.from("balanco_termico_diario").select("user_id").limit(1);
  return !error;
});

await check("RPC registrar_treino grava VTC no balanco diario", async () => {
  const probeId = 77001;
  const { error: rpcError } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: cliente.userId,
    p_exercicio_id: probeId,
    p_exercicio_nome: "ARGOS SQL verify",
    p_musculo: "peito",
    p_peso_atual: 50,
    p_repeticoes: 10,
    p_series: 4,
  });
  if (rpcError) return false;

  const { data: vtcToday, error: vtcErr } = await cliente.client.rpc("argos_compute_session_vtc_today", {
    p_user_id: cliente.userId,
  });
  if (vtcErr) return false;

  const expectedMin = 50 * 10 * 4;
  const ok = Number(vtcToday) >= expectedMin;

  const { data: hist } = await cliente.client
    .from("historico_treinos")
    .select("id")
    .eq("cliente_id", cliente.userId)
    .eq("exercicio_id", probeId)
    .maybeSingle();
  if (hist?.id) {
    await cliente.client.from("historico_treinos").delete().eq("id", hist.id);
  }

  return ok;
});

await check("RPC vtc_30d retorna numero >= 0 para self", async () => {
  const { data, error } = await cliente.client.rpc("argos_compute_vtc_30d", {
    p_user_id: cliente.userId,
  });
  return !error && Number(data) >= 0;
});

if (vitima) {
  await check("RPC vtc_30d bloqueia leitura cross-user", async () => {
    const { data, error } = await cliente.client.rpc("argos_compute_vtc_30d", {
      p_user_id: vitima.userId,
    });
    return Boolean(error) && data === null;
  });

  await check("INSERT balanco alheio bloqueado", async () => {
    const { error } = await cliente.client.from("balanco_termico_diario").insert({
      user_id: vitima.userId,
      data_treino: "2026-01-01",
      vtc_total: 50000,
    });
    return Boolean(error);
  });
}

await check("fetch_dashboard_bundle responde autenticado", async () => {
  const { error } = await cliente.client.rpc("fetch_dashboard_bundle", { p_musculo: "peito" });
  return !error;
});

await check("peso invalido (0) rejeitado na RPC", async () => {
  const { error } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: cliente.userId,
    p_exercicio_id: 77002,
    p_peso_atual: 0,
    p_musculo: "peito",
    p_repeticoes: 1,
    p_series: 1,
  });
  return Boolean(error);
});

await check("peso invalido (99999) rejeitado na RPC", async () => {
  const { error } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: cliente.userId,
    p_exercicio_id: 77003,
    p_peso_atual: 99999,
    p_musculo: "peito",
    p_repeticoes: 1,
    p_series: 1,
  });
  return Boolean(error);
});

console.log(`\nARGOS SQL Verify: ${passed} pass · ${failed} fail\n`);
process.exit(failed > 0 ? 2 : 0);
