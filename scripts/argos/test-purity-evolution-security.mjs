/**
 * ARGOS · Purity & Evolution Security — Aba 3 (Evolução)
 *
 * 4 cenários adversariais / conformidade:
 *   1. Ataque anónimo (sem token de sessão)
 *   2. Isolamento de dados biológicos (cross-user RPC)
 *   3. Formato consolidado — 6 grupos JSON (peito · ombros · bracos · costas · abdomen · pernas)
 *   4. Gatilho de estase muscular (is_frozen × historico_treinos_personais)
 *
 * Actores: cliente@meccafit.com · atleta2@meccafit.com · master@meccafit.com
 *
 * Uso:
 *   node scripts/argos/test-purity-evolution-security.mjs
 *   npm run argos:purity-evolution
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SEED_PASSWORD = "senha123";

const SOVEREIGN_JSON_KEYS = ["peito", "ombros", "bracos", "costas", "abdomen", "pernas"];
const SOVEREIGN_MEMBERS = ["PEITO", "OMBROS", "BRACOS", "COSTAS", "ABDOMEN", "PERNAS"];
const LEGACY_SUBGROUP_MARKERS = [
  "peitoral",
  "subgrupo",
  "via_a",
  "via_b",
  "membro superior",
  "membro inferior",
  "membro_principal",
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
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function loadTestUsers() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8");
    return JSON.parse(raw).users ?? {};
  } catch {
    return {};
  }
}

function isAuthOrPermissionBlocked(error) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const status = Number(error.status ?? 0);
  const message = String(error.message ?? "").toLowerCase();
  return (
    status === 401 ||
    code === "42501" ||
    code === "PGRST301" ||
    message.includes("permission denied") ||
    message.includes("jwt") ||
    message.includes("not authenticated")
  );
}

function isRlsBlocked(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    isAuthOrPermissionBlocked(error) ||
    message.includes("row-level security") ||
    message.includes("violates row-level security")
  );
}

function assertCalorJsonPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, detail: "esperado objeto JSON, recebido array ou null" };
  }

  const keys = Object.keys(payload).filter((k) => k !== "indice_ignicao");
  const sorted = [...keys].sort();
  const expected = [...SOVEREIGN_JSON_KEYS].sort();

  if (!sorted.every((k, i) => k === expected[i])) {
    return { ok: false, detail: `chaves=${keys.join(",")}` };
  }

  if (typeof payload.indice_ignicao !== "number" || !Number.isFinite(payload.indice_ignicao)) {
    return { ok: false, detail: "indice_ignicao inválido" };
  }

  for (const key of SOVEREIGN_JSON_KEYS) {
    const group = payload[key];
    if (!group || typeof group !== "object") {
      return { ok: false, detail: `${key} ausente` };
    }
    if (typeof group.is_frozen !== "boolean") {
      return { ok: false, detail: `is_frozen não-booleano em ${key}` };
    }
    if (!group.nivel_calculado || typeof group.nivel_calculado !== "string") {
      return { ok: false, detail: `nivel_calculado inválido em ${key}` };
    }
  }

  return { ok: true, detail: SOVEREIGN_JSON_KEYS.join(" · ") };
}

function frozenByJsonKey(payload) {
  const out = {};
  for (const key of SOVEREIGN_JSON_KEYS) {
    out[key.toUpperCase()] = payload?.[key]?.is_frozen;
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const registry = loadTestUsers();

if (!url || !anonKey) {
  console.error("ARGOS purity-evolution: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes");
  process.exit(1);
}

if (!serviceKey) {
  console.error("ARGOS purity-evolution: SUPABASE_SERVICE_ROLE_KEY ausente (cenário 4 + cleanup)");
  process.exit(1);
}

const CLIENTE_EMAIL = registry.cliente_principal?.email ?? "cliente@meccafit.com";
const VITIMA_EMAIL = registry.atleta_vitima?.email ?? "atleta2@meccafit.com";
const MESTRE_EMAIL = registry.forjador_soberano?.email ?? "master@meccafit.com";

const RUN_ID = Date.now();
const PROBE_PREFIX = `argos-evolucao-${RUN_ID}`;

let passed = 0;
let failed = 0;
let skipped = 0;
const vulnerabilities = [];

function createAnonRestClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password = SEED_PASSWORD) {
  const client = createAnonRestClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login falhou (${email}): ${error?.message ?? "sem sessão"}`);
  }
  return { client, userId: data.user.id, email };
}

async function record(scenario, name, fn) {
  const label = `[C${scenario}] ${name}`;
  try {
    const result = await fn();
    if (result?.skip) {
      skipped += 1;
      console.log(`[SKIP] ${label}${result.detail ? ` — ${result.detail}` : ""}`);
      return;
    }
    const ok = result === true || result?.ok === true;
    if (ok) {
      passed += 1;
      console.log(`[PASS] ${label}${result?.detail ? ` — ${result.detail}` : ""}`);
    } else {
      failed += 1;
      vulnerabilities.push(label);
      console.log(`[FAIL] ${label}${result?.detail ? ` — ${result.detail}` : ""}`);
    }
  } catch (error) {
    failed += 1;
    vulnerabilities.push(label);
    console.log(`[FAIL] ${label} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function tableExists(client, tableName) {
  const { error } = await client.from(tableName).select("*").limit(1);
  if (!error) return true;
  const message = error.message ?? "";
  return !message.includes("does not exist") && !message.includes("Could not find the table");
}

console.log("\n=== ARGOS Purity & Evolution Security · Aba 3 ===\n");
console.log(`Supabase: ${url}\n`);

const service = createServiceClient();

for (const table of ["purity_logs", "evolucao_membro_estase", "historico_treinos_personais"]) {
  if (!(await tableExists(service, table))) {
    console.error(`ARGOS purity-evolution: tabela ${table} ausente — aplique migrations Evolução + dual-track.`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// CENÁRIO 1 · Ataque anónimo (sem token de sessão)
// ---------------------------------------------------------------------------

console.log("--- Cenário 1 · Ataque anónimo ---\n");

const anon = createAnonRestClient();
const dummyUuid = "00000000-0000-4000-8000-000000000001";

await record(1, "RPC obter_calor_muscular_atleta bloqueada", async () => {
  const { data, error } = await anon.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: dummyUuid,
  });
  return {
    ok: isAuthOrPermissionBlocked(error) && (data === null || data === undefined),
    detail: error?.message ?? `payload=${JSON.stringify(data)}`,
  };
});

await record(1, "RPC calcular_indice_ignicao_atleta bloqueada", async () => {
  const { data, error } = await anon.rpc("calcular_indice_ignicao_atleta", { p_user_id: dummyUuid });
  return {
    ok: isAuthOrPermissionBlocked(error) && (data === null || data === undefined),
    detail: error?.message ?? `ignicao=${data}`,
  };
});

await record(1, "INSERT purity_logs trancado (RLS)", async () => {
  const { error } = await anon.from("purity_logs").insert({
    user_id: dummyUuid,
    log_date: new Date().toISOString().slice(0, 10),
    is_pure: true,
  });
  return { ok: isRlsBlocked(error), detail: error?.message ?? "insert anónimo permitido" };
});

// ---------------------------------------------------------------------------
// CENÁRIO 2 · Isolamento de dados biológicos
// ---------------------------------------------------------------------------

console.log("\n--- Cenário 2 · Isolamento cross-user ---\n");

let cliente;
let vitima;
let mestre;

try {
  cliente = await signIn(CLIENTE_EMAIL);
  vitima = await signIn(VITIMA_EMAIL);
  mestre = await signIn(MESTRE_EMAIL);
} catch (error) {
  console.error(`Actores seed indisponíveis: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

await record(2, "cliente@ chama obter_calor com UUID de atleta2@ — bloqueado (42501)", async () => {
  const { data, error } = await cliente.client.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: vitima.userId,
  });
  const denied =
    isAuthOrPermissionBlocked(error) &&
    String(error?.message ?? "").includes("Acesso Negado");
  return {
    ok: denied && (data === null || data === undefined),
    detail: error?.message ?? `payload=${JSON.stringify(data)}`,
  };
});

await record(2, "cliente@ chama calcular_indice com UUID de atleta2@ — bloqueado ou vazio", async () => {
  const { data, error } = await cliente.client.rpc("calcular_indice_ignicao_atleta", {
    p_user_id: vitima.userId,
  });
  const empty = data === null || data === undefined;
  return {
    ok: isAuthOrPermissionBlocked(error) || empty,
    detail: error?.message ?? `valor=${data}`,
  };
});

// ---------------------------------------------------------------------------
// CENÁRIO 3 · Formato consolidado dos 4 Membros Soberanos
// ---------------------------------------------------------------------------

console.log("\n--- Cenário 3 · 6 grupos JSON ---\n");

await record(3, "payload legítimo — peito ombros bracos costas abdomen pernas", async () => {
  const { data, error } = await cliente.client.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: cliente.userId,
  });
  if (error) return { ok: false, detail: error.message };
  const check = assertCalorJsonPayload(data);
  return check;
});

await record(3, "zero menção a subgrupos legados no payload", async () => {
  const { data, error } = await vitima.client.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: vitima.userId,
  });
  if (error) return { ok: false, detail: error.message };
  const serialized = JSON.stringify(data ?? {}).toLowerCase();
  const hit = LEGACY_SUBGROUP_MARKERS.find((m) => serialized.includes(m));
  return { ok: !hit, detail: hit ? `legado=${hit}` : "limpo" };
});

// ---------------------------------------------------------------------------
// CENÁRIO 4 · Gatilho de estase muscular (historico_treinos_personais)
// ---------------------------------------------------------------------------

console.log("\n--- Cenário 4 · Estase muscular ---\n");

const probeRxIds = [];
let probeBondId = null;
let hadBondBefore = false;

await record(4, "setup: ficha personal PEITO+PERNAS para cliente VIP", async () => {
  const { data: bond } = await service
    .from("forger_client_bonds")
    .select("id")
    .eq("client_id", cliente.userId)
    .maybeSingle();

  hadBondBefore = Boolean(bond?.id);

  if (!bond?.id) {
    const { data: inserted, error: bondErr } = await service
      .from("forger_client_bonds")
      .insert({ forger_id: mestre.userId, client_id: cliente.userId })
      .select("id")
      .maybeSingle();
    if (bondErr) return { ok: false, detail: bondErr.message };
    probeBondId = inserted?.id ?? null;
  }

  await service
    .from("historico_treinos_personais")
    .delete()
    .eq("client_id", cliente.userId)
    .like("exercicio_id", `${PROBE_PREFIX}%`);

  const rxRows = [
    {
      client_id: cliente.userId,
      forger_id: mestre.userId,
      exercicio_id: `${PROBE_PREFIX}-peito`,
      peso_prescrito: 80,
      repeticoes_alvo: 10,
      series_alvo: 4,
      membro_principal: "PEITO",
    },
    {
      client_id: cliente.userId,
      forger_id: mestre.userId,
      exercicio_id: `${PROBE_PREFIX}-pernas`,
      peso_prescrito: 120,
      repeticoes_alvo: 8,
      series_alvo: 4,
      membro_principal: "PERNAS",
    },
  ];

  const { data: rx, error: rxErr } = await service
    .from("historico_treinos_personais")
    .insert(rxRows)
    .select("id");

  if (rxErr) return { ok: false, detail: rxErr.message };
  probeRxIds.push(...(rx ?? []).map((r) => r.id));

  return { ok: probeRxIds.length === 2, detail: `rx=${probeRxIds.length}` };
});

await record(4, "is_frozen booleano — prescritos false · ausentes true", async () => {
  const { data, error } = await cliente.client.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: cliente.userId,
  });
  if (error) return { ok: false, detail: error.message };

  const byMember = frozenByJsonKey(data);

  const expected = {
    PEITO: false,
    PERNAS: false,
    OMBROS: true,
    BRACOS: true,
    COSTAS: true,
    ABDOMEN: true,
  };

  const mismatches = SOVEREIGN_MEMBERS.filter((m) => byMember[m] !== expected[m]);
  const allBoolean = SOVEREIGN_MEMBERS.every((m) => typeof byMember[m] === "boolean");

  return {
    ok: mismatches.length === 0 && allBoolean,
    detail:
      mismatches.length > 0
        ? ` divergência: ${mismatches.map((m) => `${m}=${byMember[m]}`).join(", ")}`
        : "PEITO/PERNAS=active · OMBROS/BRACOS/COSTAS/ABDOMEN=frozen",
  };
});

await record(4, "cliente comum sem ficha personal — is_frozen false em todos", async () => {
  const { data: rx } = await service
    .from("historico_treinos_personais")
    .select("id")
    .eq("client_id", vitima.userId)
    .limit(1);

  const { data: bond } = await service
    .from("forger_client_bonds")
    .select("id")
    .eq("client_id", vitima.userId)
    .maybeSingle();

  if ((rx ?? []).length > 0 && bond?.id) {
    return { skip: true, detail: "atleta2 tem ficha VIP — use seed limpo para probe comum" };
  }

  const { data, error } = await vitima.client.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: vitima.userId,
  });
  if (error) return { ok: false, detail: error.message };

  const check = assertCalorJsonPayload(data);
  if (!check.ok) return check;

  const allFalse = SOVEREIGN_JSON_KEYS.every((k) => data[k]?.is_frozen === false);
  return { ok: allFalse, detail: `frozen=${SOVEREIGN_JSON_KEYS.filter((k) => data[k]?.is_frozen).length}` };
});

// ---------------------------------------------------------------------------
// BLOCO 5 · MIDAS get_muscular_evolution (auth.uid only)
// ---------------------------------------------------------------------------

function assertMidasPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, detail: "payload inválido" };
  }
  if (payload.error === "unauthorized") {
    return { ok: true, detail: "401 esperado sem sessão" };
  }
  if (typeof payload.ignition_index !== "number") {
    return { ok: false, detail: "ignition_index ausente" };
  }
  const muscles = payload.muscles;
  if (!muscles || typeof muscles !== "object") {
    return { ok: false, detail: "muscles ausente" };
  }
  for (const key of SOVEREIGN_JSON_KEYS) {
    const group = muscles[key];
    if (!group || typeof group !== "object") {
      return { ok: false, detail: `${key} ausente` };
    }
    if (typeof group.thermal_level !== "string") {
      return { ok: false, detail: `thermal_level inválido em ${key}` };
    }
    if ("is_frozen" in group) {
      return { ok: false, detail: `is_frozen banido em ${key}` };
    }
  }
  return { ok: true, detail: "6 grupos MIDAS" };
}

await record(5, "RPC get_muscular_evolution bloqueada para anon", async () => {
  const { data, error } = await anon.rpc("get_muscular_evolution");
  const blocked = isAuthOrPermissionBlocked(error) || data?.code === 401;
  return { ok: blocked, detail: error?.message ?? String(data?.code ?? "ok") };
});

await record(6, "cliente autenticado — get_muscular_evolution retorna 6 músculos", async () => {
  const { data, error } = await cliente.client.rpc("get_muscular_evolution");
  if (error) return { ok: false, detail: error.message };
  const check = assertMidasPayload(data);
  return check;
});

// ---------------------------------------------------------------------------
// Cleanup probes
// ---------------------------------------------------------------------------

if (probeRxIds.length > 0) {
  await service.from("historico_treinos_personais").delete().in("id", probeRxIds);
}

if (probeBondId && !hadBondBefore) {
  await service.from("forger_client_bonds").delete().eq("id", probeBondId);
}

console.log(`\nARGOS Purity & Evolution: ${passed} pass · ${failed} fail · ${skipped} skip\n`);

if (vulnerabilities.length > 0) {
  console.log("Falhas:");
  for (const name of vulnerabilities) {
    console.log(`  · ${name}`);
  }
  console.log("");
}

process.exit(failed > 0 ? 3 : 0);
