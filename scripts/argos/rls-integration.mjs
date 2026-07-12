/**
 * ARGOS — testes autenticados de RLS (cliente vs soberano vs escalada)
 * Uso: node scripts/argos/rls-integration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { resolveSeedPassword } from "../lib/seed-credentials.mjs";
import {
  allocateFreshProbeExercicioId,
  cleanupProbeWorkout,
  createServiceAdmin,
  isDayLockError,
} from "./lib/probe-workout.mjs";

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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("ARGOS: variáveis Supabase ausentes em .env.local");
  process.exit(1);
}

const SEED_PASSWORD = resolveSeedPassword();

const ACCOUNTS = [
  { label: "cliente", email: "cliente@meccafit.com", password: SEED_PASSWORD },
  { label: "vitima", email: "atleta2@meccafit.com", password: SEED_PASSWORD },
  { label: "soberano", email: "master@meccafit.com", password: SEED_PASSWORD },
];

const FALLBACK_OTHER_USER_ID = "bad0554d-5c68-4e2e-b9d3-ba55f6e86634";

function createBrowserClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password) {
  const client = createBrowserClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login falhou (${email}): ${error?.message ?? "sem sessão"}`);
  }
  return { client, userId: data.user.id, token: data.session.access_token };
}

async function runCase(name, fn) {
  try {
    const result = await fn();
    const ok = result === true || result?.ok === true;
    console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${result?.detail ? ` — ${result.detail}` : ""}`);
    return ok;
  } catch (error) {
    console.log(`[FAIL] ${name} — ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

async function record(name, fn) {
  const ok = await runCase(name, fn);
  if (ok) passed += 1;
  else failed += 1;
}

console.log("\n=== ARGOS RLS Integration ===\n");

const cliente = await signIn(ACCOUNTS[0].email, ACCOUNTS[0].password);
let vitima = null;
try {
  vitima = await signIn(ACCOUNTS[1].email, ACCOUNTS[1].password);
} catch {
  console.warn("atleta2@ ausente — rode node scripts/seed-test-users.mjs");
}
const soberano = await signIn(ACCOUNTS[2].email, ACCOUNTS[2].password);
const OTHER_USER_ID = vitima?.userId ?? FALLBACK_OTHER_USER_ID;
const admin = createServiceAdmin();
if (!admin) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY ausente — cleanup de probes limitado");
}

await record("cliente: SELECT profiles retorna só o próprio", async () => {
  const { data, error } = await cliente.client.from("profiles").select("id");
  if (error) return { ok: false, detail: error.message };
  const foreign = data.filter((row) => row.id !== cliente.userId);
  return { ok: foreign.length === 0, detail: `linhas=${data.length}` };
});

await record("cliente: SELECT historico_treinos de outro usuário vazio", async () => {
  const { data, error } = await cliente.client
    .from("historico_treinos")
    .select("id, cliente_id")
    .eq("cliente_id", OTHER_USER_ID);
  if (error) return { ok: false, detail: error.message };
  return { ok: (data?.length ?? 0) === 0, detail: `linhas=${data?.length ?? 0}` };
});

await record("cliente: INSERT historico_treinos com cliente_id alheio bloqueado", async () => {
  const { error } = await cliente.client.from("historico_treinos").insert({
    cliente_id: OTHER_USER_ID,
    user_id: OTHER_USER_ID,
    exercicio_id: 9999,
    exercicio_nome: "ARGOS probe",
    musculo: "peito",
    peso: 50,
    peso_atual: 50,
    repeticoes: 1,
    series: 1,
  });
  return { ok: Boolean(error), detail: error?.message ?? "insert permitido" };
});

await record("cliente: RPC registrar_treino com p_user_id alheio bloqueado", async () => {
  const { error } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: OTHER_USER_ID,
    p_exercicio_id: 9998,
    p_exercicio_nome: "ARGOS probe",
    p_musculo: "peito",
    p_peso_atual: 50,
    p_repeticoes: 1,
    p_series: 1,
  });
  return { ok: Boolean(error), detail: error?.message ?? "rpc permitido" };
});

await record("cliente: UPDATE role para forjador_soberano bloqueado", async () => {
  const { error } = await cliente.client
    .from("profiles")
    .update({ role: "forjador_soberano" })
    .eq("id", cliente.userId);
  return { ok: Boolean(error), detail: error?.message ?? "escalada permitida" };
});

await record("soberano: SELECT profiles enxerga todos", async () => {
  const { data, error } = await soberano.client.from("profiles").select("id");
  if (error) return { ok: false, detail: error.message };
  return { ok: (data?.length ?? 0) >= 2, detail: `linhas=${data?.length ?? 0}` };
});

await record("soberano: SELECT historico_treinos global permitido", async () => {
  const { error } = await soberano.client.from("historico_treinos").select("id").limit(1);
  return { ok: !error, detail: error?.message ?? "ok" };
});

await record("cliente: INSERT direto historico_treinos bloqueado", async () => {
  const probeId = 88881;
  const { error } = await cliente.client.from("historico_treinos").insert({
    cliente_id: cliente.userId,
    user_id: cliente.userId,
    exercicio_id: probeId,
    exercicio_nome: "ARGOS blocked probe",
    musculo: "peito",
    peso: 45,
    peso_atual: 45,
    repeticoes: 1,
    series: 1,
    status: "SUPERAÇÃO",
  });

  return {
    ok: Boolean(error),
    detail: error?.message ?? "insert inesperadamente permitido",
  };
});

await record("cliente: INSERT mural fraud status bloqueado via policy", async () => {
  const probeId = 88883;
  const { data, error } = await cliente.client
    .from("historico_treinos")
    .insert({
      cliente_id: cliente.userId,
      user_id: cliente.userId,
      exercicio_id: probeId,
      exercicio_nome: "ARGOS mural fraud probe",
      musculo: "peito",
      peso: 999,
      peso_atual: 999,
      repeticoes: 1,
      series: 1,
      status: "SUPERAÇÃO",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: true, detail: error.message };
  }

  if (data?.id) {
    await cliente.client.from("historico_treinos").delete().eq("id", data.id);
  }

  return { ok: false, detail: "insert SUPERAÇÃO permitido — revisar RLS/trigger" };
});

await record("cliente: RPC registrar_treino com próprio user_id permitido", async () => {
  const probeId = await allocateFreshProbeExercicioId(admin, cliente.userId, 88);
  const { error: rpcError } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: cliente.userId,
    p_exercicio_id: probeId,
    p_exercicio_nome: "ARGOS own rpc",
    p_musculo: "peito",
    p_peso_atual: 46,
    p_repeticoes: 1,
    p_series: 1,
  });
  if (rpcError) return { ok: false, detail: rpcError.message };

  const { data, error } = await cliente.client
    .from("historico_treinos")
    .select("id")
    .eq("cliente_id", cliente.userId)
    .eq("exercicio_id", probeId)
    .maybeSingle();

  if (error || !data?.id) {
    await cleanupProbeWorkout(admin, cliente.userId, probeId);
    return { ok: false, detail: error?.message ?? "registro ausente" };
  }

  await cleanupProbeWorkout(admin, cliente.userId, probeId);
  return { ok: true, detail: `rpc ok · exercicio=${probeId}` };
});

await record("cliente: RPC registrar_treino trava diária no 2º registo do mesmo exercício", async () => {
  const probeId = await allocateFreshProbeExercicioId(admin, cliente.userId, 89);
  const args = {
    p_user_id: cliente.userId,
    p_exercicio_id: probeId,
    p_exercicio_nome: "ARGOS day lock",
    p_musculo: "peito",
    p_peso_atual: 47,
    p_repeticoes: 1,
    p_series: 1,
  };

  const { error: firstError } = await cliente.client.rpc("registrar_treino_com_status", args);
  if (firstError) {
    await cleanupProbeWorkout(admin, cliente.userId, probeId);
    return { ok: false, detail: `1º registo falhou: ${firstError.message}` };
  }

  const { error: secondError } = await cliente.client.rpc("registrar_treino_com_status", {
    ...args,
    p_peso_atual: 48,
  });

  await cleanupProbeWorkout(admin, cliente.userId, probeId);

  if (!secondError) {
    return { ok: false, detail: "2º registo permitido — trava diária ausente" };
  }

  return {
    ok: isDayLockError(secondError.message),
    detail: secondError.message,
  };
});

await record("cliente: SELECT historico filtrado por musculo peito", async () => {
  const { data, error } = await cliente.client
    .from("historico_treinos")
    .select("id, exercicio_id, peso, musculo, cliente_id")
    .eq("musculo", "peito");
  if (error) return { ok: false, detail: error.message };
  const foreign = (data ?? []).filter((row) => row.cliente_id && row.cliente_id !== cliente.userId);
  return { ok: foreign.length === 0, detail: `linhas=${data?.length ?? 0}` };
});

await record("cliente: RPC mural comunidade sem forjador_soberano", async () => {
  const { data, error } = await cliente.client.rpc("argos_fetch_mural_comunidade", {
    p_limit: 48,
  });
  if (error) return { ok: false, detail: error.message };
  const rows = Array.isArray(data) ? data : [];
  const hasSoberano = rows.some((row) => row.atleta_nome === "Mestre Supremo");
  return { ok: !hasSoberano, detail: `linhas=${rows.length}` };
});

await record("soberano: RPC mural comunidade leitura permitida", async () => {
  const { data, error } = await soberano.client.rpc("argos_fetch_mural_comunidade", {
    p_limit: 48,
  });
  if (error) return { ok: false, detail: error.message };
  const rows = Array.isArray(data) ? data : [];
  const hasOwnAscension = rows.some((row) => row.atleta_nome === "Mestre Supremo");
  return { ok: !hasOwnAscension, detail: `linhas=${rows.length}` };
});

await record("anon: RPC mural comunidade bloqueado", async () => {
  const anon = createBrowserClient();
  const { error } = await anon.rpc("argos_fetch_mural_comunidade", { p_limit: 10 });
  return { ok: Boolean(error), detail: error?.message ?? "rpc permitido" };
});

await record("cliente: RPC argos_compute_vtc_30d de outro user bloqueado", async () => {
  const { data, error } = await cliente.client.rpc("argos_compute_vtc_30d", {
    p_user_id: OTHER_USER_ID,
  });
  return { ok: Boolean(error), detail: error?.message ?? `vazou=${data}` };
});

await record("cliente: INSERT balanco_termico_diario alheio bloqueado", async () => {
  const { error } = await cliente.client.from("balanco_termico_diario").insert({
    user_id: OTHER_USER_ID,
    data_treino: "2026-01-01",
    vtc_total: 9999,
  });
  return { ok: Boolean(error), detail: error?.message ?? "insert permitido" };
});

await record("cliente: SELECT balanco_termico_diario só self", async () => {
  const { data, error } = await cliente.client.from("balanco_termico_diario").select("user_id, vtc_total");
  if (error) {
    const missing = error.message.includes("Could not find the table");
    return { ok: missing, detail: error.message };
  }
  const foreign = (data ?? []).filter((row) => row.user_id !== cliente.userId);
  return { ok: foreign.length === 0, detail: `linhas=${data?.length ?? 0}` };
});

console.log(`\nARGOS RLS: ${passed} pass · ${failed} fail\n`);
process.exit(failed > 0 ? 3 : 0);
