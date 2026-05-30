/**
 * ARGOS · Forger Workout Lifecycle — Painel da Forja (adversarial DELETE)
 *
 * Cenário Painel da Forja / historico_treinos_personais (Supabase sa-east-1):
 *
 *   Etapa 1 · Adição legítima
 *     master@meccafit.com (Forjador Mestre) prescreve treino para cliente@meccafit.com
 *     → captura UUID da linha criada
 *
 *   Etapa 2 · Ataque — deleção cruzada
 *     forjador@meccafit.com (Segundo Personal de linhagem, NÃO criador do decreto)
 *     tenta DELETE sobre a RX do Mestre → RLS deve bloquear (0 linhas ou erro)
 *
 *     Nota ARGOS: a policy DELETE concede override a argos_is_forjador_soberano().
 *     Um segundo forjador_soberano apagaria a linha por design. O seed só tem master@
 *     como soberano; o proxy adversarial realista é forjador@ (linhagem).
 *
 *   Etapa 3 · Deleção legítima
 *     master@ remove a RX que criou → DELETE OK
 *     SELECT via service_role confirma ausência física no Postgres
 *
 * Uso:
 *   node scripts/argos/test-forger-workout-lifecycle.mjs
 *   node scripts/argos/test-forger-workout-lifecycle.mjs --skip-setup
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SEED_PASSWORD = "senha123";

const MESTRE_EMAIL = "master@meccafit.com";
const VIP_EMAIL = "cliente@meccafit.com";
/** Segundo Forjador — Personal de linhagem (atacante cross-delete) */
const SEGUNDO_PERSONAL_EMAIL = "forjador@meccafit.com";

function parseArgs(argv) {
  const args = { skipSetup: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--skip-setup") args.skipSetup = true;
  }
  return args;
}

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

function isRlsOrPermissionError(error) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("violates row-level security")
  );
}

/** ARGOS: DELETE bloqueado = erro RLS OU array vazio (PostgREST silent deny) */
function assertDeleteBlocked(result) {
  const { data, error } = result;
  if (error) {
    return { ok: isRlsOrPermissionError(error), detail: error.message };
  }
  const rows = Array.isArray(data) ? data : [];
  return {
    ok: rows.length === 0,
    detail: rows.length > 0 ? `${rows.length} linha(s) apagada(s) — brecha` : "0 linhas apagadas (RLS)",
  };
}

const { skipSetup } = parseArgs(process.argv);
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const registry = loadTestUsers();

if (!url || !anonKey) {
  console.error("ARGOS forger-lifecycle: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes em .env.local");
  process.exit(1);
}

const RUN_ID = Date.now();
const PROBE_PREFIX = `argos-forja-lifecycle-${RUN_ID}`;
const PROBE_EXERCICIO = `${PROBE_PREFIX}-peitoral-forja`;

let passed = 0;
let failed = 0;
let skipped = 0;
const vulnerabilities = [];
const createdBondIds = [];
let prescribedRxId = null;

function createBrowserClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient() {
  if (!serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password = SEED_PASSWORD) {
  const client = createBrowserClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login falhou (${email}): ${error?.message ?? "sem sessão"}`);
  }
  return {
    client,
    userId: data.user.id,
    token: data.session.access_token,
    email,
  };
}

async function tableExists(client, tableName) {
  const { error } = await client.from(tableName).select("id").limit(1);
  if (!error) return true;
  const message = error.message ?? "";
  return !message.includes("does not exist") && error.code !== "42P01";
}

async function record(name, fn) {
  try {
    const result = await fn();
    if (result?.skip) {
      skipped += 1;
      console.log(`[SKIP] ${name}${result.detail ? ` — ${result.detail}` : ""}`);
      return;
    }
    const ok = result === true || result?.ok === true;
    if (ok) {
      passed += 1;
      console.log(`[PASS] ${name}${result?.detail ? ` — ${result.detail}` : ""}`);
    } else {
      failed += 1;
      vulnerabilities.push(name);
      console.log(`[FAIL] ${name}${result?.detail ? ` — ${result.detail}` : ""}`);
    }
  } catch (error) {
    failed += 1;
    vulnerabilities.push(name);
    console.log(
      `[FAIL] ${name} — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log("\n=== ARGOS Forger Workout Lifecycle · Painel da Forja ===\n");
console.log(`Projeto Supabase: ${url}\n`);

const service = createServiceClient();
const probeClient = service ?? createBrowserClient();

if (
  !(await tableExists(probeClient, "forger_client_bonds")) ||
  !(await tableExists(probeClient, "historico_treinos_personais"))
) {
  console.error(
    "ARGOS forger-lifecycle: aplique 20260529100000_dual_track_training_architecture.sql.",
  );
  process.exit(2);
}

if (!service) {
  console.error("ARGOS forger-lifecycle: SUPABASE_SERVICE_ROLE_KEY ausente (setup + verificação física).");
  process.exit(1);
}

let mestre;
let vip;
let segundoPersonal;

try {
  mestre = await signIn(MESTRE_EMAIL);
  vip = await signIn(VIP_EMAIL);
  segundoPersonal = await signIn(SEGUNDO_PERSONAL_EMAIL);
} catch (error) {
  console.error(
    `ARGOS forger-lifecycle: actores seed indisponíveis — ${error instanceof Error ? error.message : error}`,
  );
  console.error("Rode: node scripts/seed-test-users.mjs");
  process.exit(1);
}

const registryMestre = registry.forjador_soberano?.userId;
const registryVip = registry.cliente_principal?.userId;
const registryPersonal = registry.forjador_linhagem?.userId;

console.log("--- Actores (registry + auth) ---\n");
console.log(`  Forjador Mestre     ${mestre.email} → ${mestre.userId}`);
console.log(`  VIP (cliente)       ${vip.email} → ${vip.userId}`);
console.log(`  Segundo Personal    ${segundoPersonal.email} → ${segundoPersonal.userId}`);

if (registryMestre && registryMestre !== mestre.userId) {
  console.warn(`  AVISO registry mestre: ${registryMestre}`);
}
if (registryVip && registryVip !== vip.userId) {
  console.warn(`  AVISO registry vip: ${registryVip}`);
}

// =============================================================================
// SETUP · vínculo Mestre ↔ cliente@ (service_role — pré-condição Painel Forja)
// =============================================================================

console.log("\n--- Setup · bond Forjador Mestre ↔ cliente@ ---\n");

if (!skipSetup) {
  await service.from("forger_client_bonds").delete().eq("client_id", vip.userId);

  const { data: bond, error } = await service
    .from("forger_client_bonds")
    .insert({ forger_id: mestre.userId, client_id: vip.userId })
    .select("id")
    .single();

  if (error) {
    console.error(`Setup bond falhou: ${error.message}`);
    process.exit(1);
  }
  if (bond?.id) createdBondIds.push(bond.id);
  console.log(`Bond provisionado: ${bond?.id?.slice(0, 8)}…`);
} else {
  console.log("Setup ignorado (--skip-setup)");
}

await record("Setup · VIP com bond activo", async () => {
  const { data, error } = await vip.client.rpc("argos_has_forger_bond", {
    p_client_id: vip.userId,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: data === true, detail: `bond=${data}` };
});

await record("Setup · Segundo Personal NÃO é o forger_id do bond", async () => {
  const { data, error } = await service
    .from("forger_client_bonds")
    .select("forger_id")
    .eq("client_id", vip.userId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return {
    ok: data?.forger_id === mestre.userId && data.forger_id !== segundoPersonal.userId,
    detail: `bond.forger=${data?.forger_id?.slice(0, 8)}…`,
  };
});

// =============================================================================
// ETAPA 1 · Adição legítima (sessão master@meccafit.com)
// =============================================================================

console.log("\n--- Etapa 1 · Adição legítima (Forjador Mestre) ---\n");

await record("1.1 · Mestre INSERT prescrição para cliente@", async () => {
  const { data, error } = await mestre.client
    .from("historico_treinos_personais")
    .insert({
      client_id: vip.userId,
      forger_id: mestre.userId,
      exercicio_id: PROBE_EXERCICIO,
      peso_prescrito: 100,
      repeticoes_alvo: 10,
      series_alvo: 4,
      observacoes: "ARGOS Forja · Peitoral 100 kg — decreto do Mestre",
    })
    .select("id, client_id, forger_id, peso_prescrito")
    .single();

  if (error) return { ok: false, detail: error.message };

  prescribedRxId = data?.id ?? null;
  return {
    ok:
      Boolean(prescribedRxId) &&
      data.client_id === vip.userId &&
      data.forger_id === mestre.userId &&
      Number(data.peso_prescrito) === 100,
    detail: `rx_id=${prescribedRxId}`,
  };
});

if (!prescribedRxId) {
  console.error("ARGOS forger-lifecycle: UUID não capturado na Etapa 1 — abortando.");
  process.exit(3);
}

console.log(`\n  → UUID capturado: ${prescribedRxId}\n`);

await record("1.2 · service_role confirma linha física no Postgres", async () => {
  const { data, error } = await service
    .from("historico_treinos_personais")
    .select("id, exercicio_id")
    .eq("id", prescribedRxId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return {
    ok: data?.id === prescribedRxId,
    detail: data ? `exercicio=${data.exercicio_id}` : "linha ausente",
  };
});

await record("1.3 · VIP lê prescrição injectada pelo Mestre", async () => {
  const { data, error } = await vip.client
    .from("historico_treinos_personais")
    .select("id, peso_prescrito")
    .eq("id", prescribedRxId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return {
    ok: Boolean(data) && Number(data.peso_prescrito) === 100,
    detail: data ? `peso=${data.peso_prescrito}kg` : "RLS ocultou",
  };
});

// =============================================================================
// ETAPA 2 · Ataque — deleção cruzada (segundo Personal fictício)
// =============================================================================

console.log("\n--- Etapa 2 · Ataque · deleção cruzada ---\n");

await record("2.0 · Pré-condição: atacante ≠ Forjador Mestre", async () => {
  const distinct =
    segundoPersonal.userId !== mestre.userId &&
    segundoPersonal.userId !== registryMestre;
  return {
    ok: distinct,
    detail: `atacante=${segundoPersonal.userId.slice(0, 8)}… mestre=${mestre.userId.slice(0, 8)}…`,
  };
});

/**
 * ARGOS adversarial core:
 * forjador@ não é forger_id da RX nem forjador_soberano → DELETE deve falhar silenciosamente.
 */
await record("2.1 · Segundo Personal DELETE RX alheia BLOQUEADO (RLS)", async () => {
  const result = await segundoPersonal.client
    .from("historico_treinos_personais")
    .delete()
    .eq("id", prescribedRxId)
    .select("id");

  return assertDeleteBlocked(result);
});

await record("2.2 · Pós-ataque: linha ainda existe (service_role)", async () => {
  const { data, error } = await service
    .from("historico_treinos_personais")
    .select("id")
    .eq("id", prescribedRxId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return { ok: data?.id === prescribedRxId, detail: "integridade preservada" };
});

await record("2.3 · VIP DELETE RX (cliente) também BLOQUEADO", async () => {
  const result = await vip.client
    .from("historico_treinos_personais")
    .delete()
    .eq("id", prescribedRxId)
    .select("id");

  return assertDeleteBlocked(result);
});

// =============================================================================
// ETAPA 3 · Deleção legítima (sessão master@meccafit.com)
// =============================================================================

console.log("\n--- Etapa 3 · Deleção legítima (Forjador Mestre) ---\n");

await record("3.1 · Mestre DELETE da própria prescrição", async () => {
  const { data, error } = await mestre.client
    .from("historico_treinos_personais")
    .delete()
    .eq("id", prescribedRxId)
    .select("id");

  if (error) return { ok: false, detail: error.message };
  const deleted = (data ?? []).length === 1;
  if (deleted) prescribedRxId = null;
  return {
    ok: deleted,
    detail: deleted ? `rx=${data[0].id.slice(0, 8)}… removida` : "0 linhas — falha",
  };
});

await record("3.2 · Mestre SELECT pós-DELETE (scoped vazio)", async () => {
  const { data, error } = await mestre.client
    .from("historico_treinos_personais")
    .select("id")
    .eq("exercicio_id", PROBE_EXERCICIO);
  if (error) return { ok: false, detail: error.message };
  return { ok: (data ?? []).length === 0, detail: `linhas=${(data ?? []).length}` };
});

/** Verificação física no Postgres (sa-east-1) — bypass RLS via service_role */
await record("3.3 · service_role: linha ausente no historico_treinos_personais", async () => {
  const { data, error } = await service
    .from("historico_treinos_personais")
    .select("id")
    .eq("exercicio_id", PROBE_EXERCICIO);
  if (error) return { ok: false, detail: error.message };
  return { ok: (data ?? []).length === 0, detail: `linhas_físicas=${(data ?? []).length}` };
});

await record("3.4 · VIP SELECT pós-DELETE do Mestre (histórico vazio)", async () => {
  const { data, error } = await vip.client
    .from("historico_treinos_personais")
    .select("id")
    .eq("exercicio_id", PROBE_EXERCICIO);
  if (error) return { ok: false, detail: error.message };
  return { ok: (data ?? []).length === 0, detail: `linhas=${(data ?? []).length}` };
});

// =============================================================================
// Cleanup
// =============================================================================

if (prescribedRxId) {
  await service.from("historico_treinos_personais").delete().eq("id", prescribedRxId);
}
await service
  .from("historico_treinos_personais")
  .delete()
  .like("exercicio_id", `${PROBE_PREFIX}%`);

if (createdBondIds.length > 0 && !skipSetup) {
  await service.from("forger_client_bonds").delete().in("id", createdBondIds);
}

console.log(`\nARGOS Forger Lifecycle: ${passed} pass · ${failed} fail · ${skipped} skip`);
if (vulnerabilities.length > 0) {
  console.log("Brechas:", vulnerabilities.join(", "));
}
console.log("");

process.exit(failed > 0 ? 3 : 0);
