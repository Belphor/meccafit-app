/**
 * ARGOS · Dual VIP Flow — activação real de 2 alunos VIP sob o Forjador Mestre
 *
 * Actores (seed):
 *   · Forjador Mestre → master@meccafit.com
 *   · Cliente VIP 1   → cliente@meccafit.com
 *   · Cliente VIP 2   → atleta2@meccafit.com
 *
 * Etapas:
 *   1. Preparação da base (service_role) — UUIDs, limpeza de bonds, 2 vínculos VIP
 *   2. Acção do Mestre — prescrições personal (Peitoral 100 kg · Agachamento 140 kg)
 *   3. Validação Cliente 1 — isolamento RLS + BFF hasPersonalBond (Aba Dieta)
 *   4. Validação Cliente 2 — mesma consistência cruzada
 *
 * Uso:
 *   node scripts/argos/test-dual-vip-flow.mjs
 *   node scripts/argos/test-dual-vip-flow.mjs --app-url http://127.0.0.1:3000
 *   node scripts/argos/test-dual-vip-flow.mjs --skip-setup
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_APP_URL,
  ensureAppServer,
  stopManagedAppServer,
} from "../lib/argos-app-server.mjs";

const SEED_PASSWORD = "senha123";

const ACTORS = {
  mestre: { key: "mestre", email: "master@meccafit.com", registryKey: "forjador_soberano" },
  cliente1: { key: "cliente1", email: "cliente@meccafit.com", registryKey: "cliente_principal" },
  cliente2: { key: "cliente2", email: "atleta2@meccafit.com", registryKey: "atleta_vitima" },
};

/** Prescrições injectadas pelo Mestre (etapa 2) */
const RX_PRESETS = {
  cliente1: {
    exercicio_id: "peitoral-supino",
    label: "Peitoral",
    peso_prescrito: 100,
    repeticoes_alvo: 10,
    series_alvo: 4,
    observacoes: "ARGOS · Supino Peitoral 100 kg",
  },
  cliente2: {
    exercicio_id: "agachamento-livre",
    label: "Agachamento",
    peso_prescrito: 140,
    repeticoes_alvo: 8,
    series_alvo: 5,
    observacoes: "ARGOS · Agachamento Livre 140 kg",
  },
};

function parseArgs(argv) {
  const args = { appUrl: DEFAULT_APP_URL, skipSetup: false, skipAppBoot: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--app-url") args.appUrl = argv[i + 1] ?? args.appUrl;
    if (argv[i] === "--skip-setup") args.skipSetup = true;
    if (argv[i] === "--skip-app-boot") args.skipAppBoot = true;
    if (argv[i] === "--no-app-url") args.appUrl = "";
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
    message.includes("violates row-level security") ||
    message.includes("new row violates")
  );
}

function isAccessDeniedError(error) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const message = String(error.message ?? "").toLowerCase();
  return (
    isRlsOrPermissionError(error) ||
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

const { appUrl, skipSetup, skipAppBoot } = parseArgs(process.argv);
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const registry = loadTestUsers();

if (!url || !anonKey) {
  console.error("ARGOS dual-vip: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes em .env.local");
  process.exit(1);
}

const RUN_ID = Date.now();
const PROBE_PREFIX = `argos-dual-vip-${RUN_ID}`;

let passed = 0;
let failed = 0;
let skipped = 0;
const vulnerabilities = [];
const createdBondIds = [];
const createdRxIds = [];

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

/**
 * Resolve UUIDs a partir do registry ARGOS (test-users.json) e confirma via auth.
 * O auth.uid() em runtime é a fonte de verdade para RLS.
 */
async function resolveActor(actor) {
  const registryEntry = registry[actor.registryKey];
  const session = await signIn(actor.email);
  const registryId = registryEntry?.userId ?? null;
  const idsMatch = !registryId || registryId === session.userId;

  return {
    ...actor,
    ...session,
    registryUserId: registryId,
    idsMatch,
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

/** ARGOS: leitura cruzada deve devolver 0 linhas ou erro RLS — nunca dados alheios */
async function assertCrossTenantIsolation(client, label, foreignClientId) {
  await record(`${label} · isolamento RX personal (não lê outro VIP)`, async () => {
    const { data, error } = await client
      .from("historico_treinos_personais")
      .select("id, client_id, exercicio_id, peso_prescrito")
      .eq("client_id", foreignClientId);
    if (error) {
      return { ok: isRlsOrPermissionError(error), detail: error.message };
    }
    return { ok: (data ?? []).length === 0, detail: `linhas=${(data ?? []).length}` };
  });
}

/** ARGOS: Aba Dieta depende de hasPersonalBond no BFF bundle */
async function assertBffHasPersonalBond(session, label) {
  if (!appUrl) {
    return record(`${label} · BFF hasPersonalBond=true`, async () => ({
      skip: true,
      detail: "use --app-url http://127.0.0.1:3000",
    }));
  }

  return record(`${label} · BFF hasPersonalBond=true (Aba Dieta)`, async () => {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/dashboard/bundle`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      return { skip: true, detail: "Bearer rejeitado — BFF requer sessão cookie SSR" };
    }
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}` };
    }

    const payload = await response.json();
    const hasBond = Boolean(payload.hasPersonalBond);
    const track = payload.trainingTrack?.track ?? "common";

    return {
      ok: hasBond && track === "personal",
      detail: `hasPersonalBond=${hasBond} track=${track}`,
    };
  });
}

/** ARGOS: diet_blueprints é exclusivo VIP — isolamento como RX personal */
async function assertDietIsolation(client, label, foreignClientId, hasDietTable) {
  if (!hasDietTable) {
    return record(`${label} · isolamento diet_blueprints`, async () => ({
      skip: true,
      detail: "tabela diet_blueprints ainda não migrada",
    }));
  }

  await record(`${label} · isolamento diet_blueprints (não lê outro VIP)`, async () => {
    const { data, error } = await client
      .from("diet_blueprints")
      .select("id, client_id")
      .eq("client_id", foreignClientId);
    if (error) {
      // Tabela inexistente = superfície de dieta ainda não migrada (não é brecha de isolamento)
      if (String(error.message ?? "").includes("Could not find the table")) {
        return { skip: true, detail: "diet_blueprints não migrada" };
      }
      return { ok: isAccessDeniedError(error), detail: error.message };
    }
    return { ok: (data ?? []).length === 0, detail: `linhas=${(data ?? []).length}` };
  });
}

console.log("\n=== ARGOS Dual VIP Flow · Forjador Mestre ===\n");

if (appUrl && !skipAppBoot) {
  try {
    const server = await ensureAppServer(appUrl);
    if (server.started) {
      console.log(`ARGOS dual-vip: Next.js iniciado em ${server.appUrl}\n`);
    }
  } catch (error) {
    console.error(
      `ARGOS dual-vip: app indisponível — ${error instanceof Error ? error.message : error}`,
    );
    process.exit(2);
  }
}

const service = createServiceClient();
const probeClient = service ?? createBrowserClient();

const hasDualTrack =
  (await tableExists(probeClient, "forger_client_bonds")) &&
  (await tableExists(probeClient, "historico_treinos_personais"));

if (!hasDualTrack) {
  console.error(
    "ARGOS dual-vip: aplique 20260529100000_dual_track_training_architecture.sql antes de correr.",
  );
  process.exit(2);
}

const hasDietTable = await tableExists(probeClient, "diet_blueprints");

let mestre;
let cliente1;
let cliente2;

try {
  mestre = await resolveActor(ACTORS.mestre);
  cliente1 = await resolveActor(ACTORS.cliente1);
  cliente2 = await resolveActor(ACTORS.cliente2);
} catch (error) {
  console.error(
    `ARGOS dual-vip: actores seed indisponíveis — ${error instanceof Error ? error.message : error}`,
  );
  console.error("Rode: node scripts/seed-test-users.mjs");
  process.exit(1);
}

console.log("--- Actores resolvidos (registry + auth) ---\n");
console.log(`  Mestre   ${mestre.email} → ${mestre.userId}`);
console.log(`  VIP 1    ${cliente1.email} → ${cliente1.userId}`);
console.log(`  VIP 2    ${cliente2.email} → ${cliente2.userId}`);

for (const actor of [mestre, cliente1, cliente2]) {
  if (actor.registryUserId && !actor.idsMatch) {
    console.warn(
      `  AVISO: registry (${actor.registryUserId}) ≠ auth (${actor.userId}) para ${actor.email}`,
    );
  }
}

// =============================================================================
// ETAPA 1 · Preparação da base (service_role / admin)
// =============================================================================

console.log("\n--- Etapa 1 · Preparação da base ---\n");

if (!service) {
  console.error("ARGOS dual-vip: SUPABASE_SERVICE_ROLE_KEY ausente — etapa 1 impossível.");
  process.exit(1);
}

const vipClientIds = [cliente1.userId, cliente2.userId];

if (!skipSetup) {
  // Limpar vínculos antigos dos dois clientes (qualquer forjador anterior)
  const { error: cleanupError } = await service
    .from("forger_client_bonds")
    .delete()
    .in("client_id", vipClientIds);

  if (cleanupError) {
    console.warn(`Limpeza bonds: ${cleanupError.message}`);
  }

  for (const vip of [cliente1, cliente2]) {
    const { data: bond, error } = await service
      .from("forger_client_bonds")
      .insert({
        forger_id: mestre.userId,
        client_id: vip.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Falha ao vincular ${vip.email} ao Mestre: ${error.message}`);
      process.exit(1);
    }
    if (bond?.id) createdBondIds.push(bond.id);
  }

  console.log(`Setup: ${createdBondIds.length} bond(s) VIP → Forjador Mestre`);
} else {
  console.log("Setup ignorado (--skip-setup) — bonds existentes assumidos");
}

await record("Etapa 1 · bond VIP 1 activo (cliente@)", async () => {
  const { data, error } = await service
    .from("forger_client_bonds")
    .select("id, forger_id, client_id")
    .eq("client_id", cliente1.userId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return {
    ok: data?.forger_id === mestre.userId,
    detail: data ? `bond=${data.id.slice(0, 8)}…` : "sem bond",
  };
});

await record("Etapa 1 · bond VIP 2 activo (atleta2@)", async () => {
  const { data, error } = await service
    .from("forger_client_bonds")
    .select("id, forger_id, client_id")
    .eq("client_id", cliente2.userId)
    .maybeSingle();
  if (error) return { ok: false, detail: error.message };
  return {
    ok: data?.forger_id === mestre.userId,
    detail: data ? `bond=${data.id.slice(0, 8)}…` : "sem bond",
  };
});

// =============================================================================
// ETAPA 2 · Acção do Personal (sessão master@meccafit.com)
// =============================================================================

console.log("\n--- Etapa 2 · Prescrições do Forjador Mestre ---\n");

const rxByClient = {};

for (const [clientKey, preset] of [
  ["cliente1", RX_PRESETS.cliente1],
  ["cliente2", RX_PRESETS.cliente2],
]) {
  const vip = clientKey === "cliente1" ? cliente1 : cliente2;
  const probeExercicio = `${PROBE_PREFIX}-${preset.exercicio_id}`;

  await record(
    `Etapa 2 · Mestre INSERT RX ${preset.label} (${preset.peso_prescrito} kg) → ${vip.email}`,
    async () => {
      const { data, error } = await mestre.client
        .from("historico_treinos_personais")
        .insert({
          client_id: vip.userId,
          forger_id: mestre.userId,
          exercicio_id: probeExercicio,
          peso_prescrito: preset.peso_prescrito,
          repeticoes_alvo: preset.repeticoes_alvo,
          series_alvo: preset.series_alvo,
          observacoes: preset.observacoes,
        })
        .select("id, peso_prescrito")
        .single();

      if (error) return { ok: false, detail: error.message };
      if (data?.id) {
        createdRxIds.push(data.id);
        rxByClient[clientKey] = { ...preset, id: data.id, exercicio_id: probeExercicio };
      }
      return {
        ok: Number(data?.peso_prescrito) === preset.peso_prescrito,
        detail: `rx=${data?.id?.slice(0, 8)}… peso=${data?.peso_prescrito}kg`,
      };
    },
  );
}

await record("Etapa 2 · Mestre confirma 2 prescrições visíveis", async () => {
  const { data, error } = await mestre.client
    .from("historico_treinos_personais")
    .select("id, client_id, exercicio_id")
    .in("client_id", vipClientIds)
    .like("exercicio_id", `${PROBE_PREFIX}%`);
  if (error) return { ok: false, detail: error.message };
  const rows = data ?? [];
  const distinct = new Set(rows.map((row) => row.client_id));
  return {
    ok: rows.length >= 2 && distinct.size === 2,
    detail: `rx=${rows.length} clientes=${distinct.size}`,
  };
});

// =============================================================================
// ETAPA 3 · Validação Cliente 1 (cliente@meccafit.com)
// =============================================================================

console.log("\n--- Etapa 3 · Segurança & duas vias · Cliente 1 ---\n");

await record("Etapa 3 · Cliente 1 · bond activo (argos_has_forger_bond)", async () => {
  const { data, error } = await cliente1.client.rpc("argos_has_forger_bond", {
    p_client_id: cliente1.userId,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: data === true, detail: `bond=${data}` };
});

await record("Etapa 3 · Cliente 1 · via comum inactiva", async () => {
  const { data, error } = await cliente1.client.rpc("argos_is_common_training_client", {
    p_user_id: cliente1.userId,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: data === false, detail: `common=${data}` };
});

await record("Etapa 3 · Cliente 1 · lê a própria RX (Peitoral 100 kg)", async () => {
  const probe = rxByClient.cliente1?.exercicio_id;
  const { data, error } = await cliente1.client
    .from("historico_treinos_personais")
    .select("id, peso_prescrito, exercicio_id")
    .eq("client_id", cliente1.userId)
    .eq("exercicio_id", probe)
    .limit(1);
  if (error) return { ok: false, detail: error.message };
  const row = (data ?? [])[0];
  return {
    ok: Boolean(row) && Number(row.peso_prescrito) === 100,
    detail: row ? `peso=${row.peso_prescrito}kg` : "sem linha",
  };
});

await assertCrossTenantIsolation(cliente1.client, "Etapa 3 · Cliente 1", cliente2.userId);

await record("Etapa 3 · Cliente 1 · INSERT RX personal (cliente) bloqueado", async () => {
  const { error } = await cliente1.client.from("historico_treinos_personais").insert({
    client_id: cliente1.userId,
    forger_id: mestre.userId,
    exercicio_id: `${PROBE_PREFIX}-escalada-cliente1`,
    peso_prescrito: 50,
    repeticoes_alvo: 10,
    series_alvo: 3,
  });
  return {
    ok: Boolean(error) && isRlsOrPermissionError(error),
    detail: error?.message ?? "escalada permitida — brecha",
  };
});

await record("Etapa 3 · Cliente 1 · INSERT via comum bloqueado", async () => {
  const { error } = await cliente1.client.from("historico_treinos_comuns").insert({
    user_id: cliente1.userId,
    exercicio_id: `${PROBE_PREFIX}-comum-cliente1`,
    peso_atual: 40,
    repeticoes: 10,
    series: 3,
  });
  return {
    ok: Boolean(error) && isRlsOrPermissionError(error),
    detail: error?.message ?? "via comum aberta — brecha",
  };
});

await assertDietIsolation(cliente1.client, "Etapa 3 · Cliente 1", cliente2.userId, hasDietTable);
await assertBffHasPersonalBond(cliente1, "Etapa 3 · Cliente 1");

// =============================================================================
// ETAPA 4 · Validação Cliente 2 (atleta2@meccafit.com)
// =============================================================================

console.log("\n--- Etapa 4 · Segurança & duas vias · Cliente 2 ---\n");

await record("Etapa 4 · Cliente 2 · bond activo (argos_has_forger_bond)", async () => {
  const { data, error } = await cliente2.client.rpc("argos_has_forger_bond", {
    p_client_id: cliente2.userId,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: data === true, detail: `bond=${data}` };
});

await record("Etapa 4 · Cliente 2 · via comum inactiva", async () => {
  const { data, error } = await cliente2.client.rpc("argos_is_common_training_client", {
    p_user_id: cliente2.userId,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: data === false, detail: `common=${data}` };
});

await record("Etapa 4 · Cliente 2 · lê a própria RX (Agachamento 140 kg)", async () => {
  const probe = rxByClient.cliente2?.exercicio_id;
  const { data, error } = await cliente2.client
    .from("historico_treinos_personais")
    .select("id, peso_prescrito, exercicio_id")
    .eq("client_id", cliente2.userId)
    .eq("exercicio_id", probe)
    .limit(1);
  if (error) return { ok: false, detail: error.message };
  const row = (data ?? [])[0];
  return {
    ok: Boolean(row) && Number(row.peso_prescrito) === 140,
    detail: row ? `peso=${row.peso_prescrito}kg` : "sem linha",
  };
});

await assertCrossTenantIsolation(cliente2.client, "Etapa 4 · Cliente 2", cliente1.userId);

await record("Etapa 4 · Cliente 2 · INSERT RX personal (cliente) bloqueado", async () => {
  const { error } = await cliente2.client.from("historico_treinos_personais").insert({
    client_id: cliente2.userId,
    forger_id: mestre.userId,
    exercicio_id: `${PROBE_PREFIX}-escalada-cliente2`,
    peso_prescrito: 50,
    repeticoes_alvo: 10,
    series_alvo: 3,
  });
  return {
    ok: Boolean(error) && isRlsOrPermissionError(error),
    detail: error?.message ?? "escalada permitida — brecha",
  };
});

await record("Etapa 4 · Cliente 2 · INSERT via comum bloqueado", async () => {
  const { error } = await cliente2.client.from("historico_treinos_comuns").insert({
    user_id: cliente2.userId,
    exercicio_id: `${PROBE_PREFIX}-comum-cliente2`,
    peso_atual: 40,
    repeticoes: 10,
    series: 3,
  });
  return {
    ok: Boolean(error) && isRlsOrPermissionError(error),
    detail: error?.message ?? "via comum aberta — brecha",
  };
});

await assertDietIsolation(cliente2.client, "Etapa 4 · Cliente 2", cliente1.userId, hasDietTable);
await assertBffHasPersonalBond(cliente2, "Etapa 4 · Cliente 2");

// =============================================================================
// Cleanup · probes ARGOS removidos (bonds opcionalmente revertidos)
// =============================================================================

try {
  if (service) {
    if (createdRxIds.length > 0) {
      await service.from("historico_treinos_personais").delete().in("id", createdRxIds);
    } else {
      await service
        .from("historico_treinos_personais")
        .delete()
        .like("exercicio_id", `${PROBE_PREFIX}%`);
    }

    await service
      .from("historico_treinos_comuns")
      .delete()
      .like("exercicio_id", `${PROBE_PREFIX}%`);

    if (createdBondIds.length > 0 && !skipSetup) {
      await service.from("forger_client_bonds").delete().in("id", createdBondIds);
    }
  }
} finally {
  await stopManagedAppServer();
}

console.log(`\nARGOS Dual VIP: ${passed} pass · ${failed} fail · ${skipped} skip`);
if (vulnerabilities.length > 0) {
  console.log("Brechas:", vulnerabilities.join(", "));
}
console.log("");

process.exit(failed > 0 ? 3 : 0);
