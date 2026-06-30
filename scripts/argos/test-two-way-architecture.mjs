/**
 * ARGOS · Two-Way Architecture — testes adversariais + stress
 *
 * Valida a arquitectura dual-track FENYXIA:
 *   · Via comum  → historico_treinos_comuns + registrar_treino_com_status + Mecca
 *   · Via personal → historico_treinos_personais + forger_client_bonds
 *   · Dieta VIP    → diet_blueprints (RLS — array vazio ou erro)
 *
 * Credenciais seed: cliente@meccafit.com · atleta2@meccafit.com · forjador@meccafit.com
 *
 * Uso:
 *   node scripts/argos/test-two-way-architecture.mjs
 *   node scripts/argos/test-two-way-architecture.mjs --app-url http://127.0.0.1:3000
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SEED_PASSWORD = "senha123";
const MECCA_SINGLETON_ID = "00000000-0000-4000-8000-000000000001";
const CONCURRENT_RPC_CALLS = 10;

function parseArgs(argv) {
  const args = { appUrl: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--app-url") args.appUrl = argv[i + 1] ?? args.appUrl;
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
    code === "403" ||
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
    message.includes("schema cache") ||
    message.includes("vínculo activo") ||
    message.includes("vinculo activo") ||
    message.includes("prescrição personal") ||
    message.includes("prescricao personal")
  );
}

function computeMeccaContributionKg(peso) {
  const vtc = Number(peso);
  return Math.min(Math.max(Math.floor(vtc), 1), 99999);
}

const { appUrl } = parseArgs(process.argv);
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const registry = loadTestUsers();

if (!url || !anonKey) {
  console.error("ARGOS two-way: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes em .env.local");
  process.exit(1);
}

const RUN_ID = Date.now();
const PROBE_PREFIX = `argos-two-way-${RUN_ID}`;

let passed = 0;
let failed = 0;
let skipped = 0;
const vulnerabilities = [];

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
  return { client, userId: data.user.id, token: data.session.access_token, email };
}

async function tableExists(client, tableName) {
  const { error } = await client.from(tableName).select("id").limit(1);
  if (!error) return true;
  const message = error.message ?? "";
  return !message.includes("does not exist") && error.code !== "42P01";
}

async function fetchMeccaTotal(client) {
  const { data, error } = await client
    .from("mecca_global_metrics")
    .select("total_weight_lifted")
    .eq("id", MECCA_SINGLETON_ID)
    .maybeSingle();
  if (error) throw new Error(`mecca_global_metrics: ${error.message}`);
  return Number(data?.total_weight_lifted ?? 0);
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

async function expectBlocked(name, fn) {
  await record(name, async () => {
    const blocked = await fn();
    return {
      ok: blocked === true,
      detail: blocked ? "RLS/permission negou operação" : "brecha: operação permitida",
    };
  });
}

console.log("\n=== ARGOS Two-Way Architecture (adversarial QA) ===\n");

const service = createServiceClient();
const probeClient = service ?? createBrowserClient();

const hasDualTrack =
  (await tableExists(probeClient, "forger_client_bonds")) &&
  (await tableExists(probeClient, "historico_treinos_comuns")) &&
  (await tableExists(probeClient, "historico_treinos_personais"));

if (!hasDualTrack) {
  console.error(
    "ARGOS two-way: aplique 20260529100000_dual_track_training_architecture.sql antes de correr este script.",
  );
  process.exit(2);
}

const hasMecca = await tableExists(probeClient, "mecca_global_metrics");
if (!hasMecca) {
  console.error(
    "ARGOS two-way: tabela mecca_global_metrics ausente — aplique 20260527240000_create_mecca_global_metrics.sql",
  );
  process.exit(2);
}

let cliente;
let atletaVip;
let forjador;

try {
  cliente = await signIn(registry.cliente_principal?.email ?? "cliente@meccafit.com");
} catch (error) {
  console.error(`ARGOS two-way: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

try {
  atletaVip = await signIn(registry.atleta_vitima?.email ?? "atleta2@meccafit.com");
} catch {
  console.warn("ARGOS two-way: atleta2@ ausente — bloco VIP será ignorado");
}

try {
  forjador = await signIn(registry.forjador_linhagem?.email ?? "forjador@meccafit.com");
} catch {
  console.warn("ARGOS two-way: forjador@ ausente — vínculo fictício VIP limitado");
}

// =============================================================================
// Setup · cliente@ na via comum (limpar bond residual de dual-vip / forger-lifecycle)
// =============================================================================

if (service) {
  const { error: bondCleanupError } = await service
    .from("forger_client_bonds")
    .delete()
    .eq("client_id", cliente.userId);

  if (bondCleanupError) {
    console.warn(
      `ARGOS two-way: não foi possível limpar bond de cliente@ — ${bondCleanupError.message}`,
    );
  }
} else {
  console.warn(
    "ARGOS two-way: SUPABASE_SERVICE_ROLE_KEY ausente — bond residual de testes VIP não será removido",
  );
}

// =============================================================================
// BLOCO 1 · cliente@meccafit.com — role cliente, sem vínculo Personal
// =============================================================================

console.log("\n--- Bloco 1 · cliente comum (sem vínculo) ---\n");

await record("1.0 · Pré-condição: cliente sem bond Personal", async () => {
  const { data: hasBond, error } = await cliente.client.rpc("argos_has_forger_bond", {
    p_client_id: cliente.userId,
  });
  if (error) return { ok: false, detail: error.message };
  if (hasBond === true) {
    return {
      ok: false,
      detail: service
        ? "cliente@ ainda possui bond após cleanup — verifique RLS/service_role"
        : "cliente@ possui bond — defina SUPABASE_SERVICE_ROLE_KEY para prep da via comum",
    };
  }
  const { data: isCommon } = await cliente.client.rpc("argos_is_common_training_client", {
    p_user_id: cliente.userId,
  });
  return { ok: isCommon === true, detail: `bond=false common=${isCommon}` };
});

/**
 * Asserção 1.1
 * Escalada directa na via personal: cliente comum NÃO pode INSERT em
 * historico_treinos_personais (policy exige forger bonded; cliente não é forger).
 */
await expectBlocked("1.1 · INSERT historico_treinos_personais bloqueado (RLS)", async () => {
  const probeExercicio = `${PROBE_PREFIX}-rx-escalada`;
  const { error } = await cliente.client.from("historico_treinos_personais").insert({
    client_id: cliente.userId,
    forger_id: forjador?.userId ?? "00000000-0000-4000-8000-000000000099",
    exercicio_id: probeExercicio,
    peso_prescrito: 80,
    repeticoes_alvo: 10,
    series_alvo: 4,
  });

  if (error) {
    return isAccessDeniedError(error);
  }

  // PostgREST ocasionalmente não propaga RLS — confirmar que nenhuma linha persistiu
  const { data: leaked, error: readError } = await cliente.client
    .from("historico_treinos_personais")
    .select("id")
    .eq("client_id", cliente.userId)
    .eq("exercicio_id", probeExercicio)
    .limit(1);

  if (readError) return isAccessDeniedError(readError);
  return (leaked ?? []).length === 0;
});

/**
 * Asserção 1.2
 * diet_blueprints é exclusivo da via VIP/Dieta: cliente sem bond não deve
 * receber linhas (array vazio) ou erro de permissão explícito.
 */
await record("1.2 · SELECT diet_blueprints isolado (vazio ou erro)", async () => {
  const { data, error } = await cliente.client.from("diet_blueprints").select("*").limit(16);

  if (error) {
    return {
      ok: isAccessDeniedError(error),
      detail: `acesso negado/indisponível: ${error.message}`,
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const foreignOwned = rows.filter(
    (row) => row.client_id && row.client_id !== cliente.userId,
  );
  return {
    ok: rows.length === 0 || foreignOwned.length === 0,
    detail: `linhas=${rows.length}`,
  };
});

/**
 * Asserção 1.3
 * RPC registrar_treino_com_status (carga válida) deve:
 *   a) retornar status do treino (CONCLUÍDO | SUPERAÇÃO)
 *   b) incrementar mecca_global_metrics.total_weight_lifted atomicamente
 */
await record("1.3 · registrar_treino_com_status + incremento Mecca", async () => {
  const probeExercicioId = 990_000 + (RUN_ID % 9000);
  const peso = 42.5;
  const repeticoes = 10;
  const series = 3;
  const expectedMeccaDelta = computeMeccaContributionKg(peso);

  const meccaBefore = await fetchMeccaTotal(cliente.client);

  const { data, error } = await cliente.client.rpc("registrar_treino_com_status", {
    p_user_id: cliente.userId,
    p_exercicio_id: String(probeExercicioId),
    p_exercicio_nome: `${PROBE_PREFIX} mecca-probe`,
    p_musculo: "peito",
    p_peso_atual: peso,
    p_repeticoes: repeticoes,
    p_series: series,
  });

  if (error) {
    return { ok: false, detail: `RPC falhou: ${error.message}` };
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) {
    return { ok: false, detail: "RPC não retornou linhas" };
  }

  const row = rows[0];
  const status = String(row.status ?? "").trim();
  const validStatus = status === "CONCLUÍDO" || status === "SUPERAÇÃO";
  if (!validStatus) {
    return { ok: false, detail: `status inválido: ${status || "(vazio)"}` };
  }

  const payload = row.payload ?? {};
  const payloadMeccaTotal = Number(payload.mecca_total_weight_lifted ?? NaN);
  const payloadContribution = Number(payload.mecca_contribution_kg ?? NaN);

  const meccaAfter = await fetchMeccaTotal(cliente.client);
  const observedDelta = meccaAfter - meccaBefore;

  if (observedDelta !== expectedMeccaDelta) {
    return {
      ok: false,
      detail: `Mecca delta=${observedDelta} esperado=${expectedMeccaDelta} (antes=${meccaBefore} depois=${meccaAfter})`,
    };
  }

  if (Number.isFinite(payloadMeccaTotal) && payloadMeccaTotal !== meccaAfter) {
    return {
      ok: false,
      detail: `payload.mecca_total_weight_lifted=${payloadMeccaTotal} ≠ DB=${meccaAfter}`,
    };
  }

  if (payloadContribution !== expectedMeccaDelta) {
    return {
      ok: false,
      detail: `payload.mecca_contribution_kg=${payloadContribution} ≠ esperado=${expectedMeccaDelta}`,
    };
  }

  return {
    ok: true,
    detail: `status=${status} vtc=${row.vtc_gerado} mecca+${observedDelta} total=${meccaAfter}`,
  };
});

// =============================================================================
// BLOCO 2 · atleta2@ — cliente VIP com vínculo fictício (service_role)
// =============================================================================

console.log("\n--- Bloco 2 · atleta2 VIP (vínculo fictício) ---\n");

if (!atletaVip) {
  console.log("[SKIP] Bloco 2 inteiro — atleta2@ indisponível\n");
  skipped += 1;
} else {
  let fictitiousBondId = null;

  if (service && forjador) {
    await service
      .from("forger_client_bonds")
      .delete()
      .eq("client_id", atletaVip.userId);

    const { data: bondRow, error: bondError } = await service
      .from("forger_client_bonds")
      .insert({
        forger_id: forjador.userId,
        client_id: atletaVip.userId,
      })
      .select("id")
      .single();

    if (bondError) {
      console.warn(`ARGOS two-way: não foi possível criar bond fictício — ${bondError.message}`);
    } else {
      fictitiousBondId = bondRow?.id ?? null;
    }
  } else {
    console.warn(
      "ARGOS two-way: SUPABASE_SERVICE_ROLE_KEY ou forjador@ ausente — bond fictício não injectado",
    );
  }

  await record("2.0 · Pré-condição: atleta2 com bond Personal activo", async () => {
    const { data: hasBond, error } = await atletaVip.client.rpc("argos_has_forger_bond", {
      p_client_id: atletaVip.userId,
    });
    if (error) return { ok: false, detail: error.message };
    if (!hasBond && !fictitiousBondId) {
      return { skip: true, detail: "bond fictício não criado — verifique service_role" };
    }
    return { ok: hasBond === true, detail: `bond=${hasBond}` };
  });

  /**
   * Asserção 2.1
   * Cliente VIP pode executar SELECT em historico_treinos_comuns sem erro HTTP/SQL.
   * ARGOS oculta linhas de outras vias (array vazio) — query bem-sucedida ≠ dados expostos.
   */
  await record("2.1 · SELECT historico_treinos_comuns (leitura bem-sucedida)", async () => {
    const { data, error } = await atletaVip.client
      .from("historico_treinos_comuns")
      .select("id, user_id, exercicio_id, peso_atual, criado_em")
      .eq("user_id", atletaVip.userId)
      .limit(32);

    if (error) {
      return { ok: false, detail: error.message };
    }

    const rows = Array.isArray(data) ? data : [];
    const foreignRows = rows.filter((row) => row.user_id !== atletaVip.userId);

    return {
      ok: foreignRows.length === 0,
      detail: `query OK · linhas_visíveis=${rows.length} (via comum inactiva para VIP bonded)`,
    };
  });

  await record("2.2 · VIP bonded: INSERT comuns bloqueado (escrita)", async () => {
    const { error } = await atletaVip.client.from("historico_treinos_comuns").insert({
      user_id: atletaVip.userId,
      exercicio_id: `${PROBE_PREFIX}-vip-comum-block`,
      peso_atual: 50,
      repeticoes: 8,
      series: 3,
    });
    return {
      ok: Boolean(error) && isAccessDeniedError(error),
      detail: error ? error.message : "insert permitido — brecha",
    };
  });

  if (service && fictitiousBondId) {
    await service.from("forger_client_bonds").delete().eq("id", fictitiousBondId);
  }
}

// =============================================================================
// BLOCO 3 · Stress — 10 RPCs concorrentes vs singleton Mecca (race condition)
// =============================================================================

console.log(`\n--- Bloco 3 · Concorrência (${CONCURRENT_RPC_CALLS}× registrar_treino_com_status) ---\n`);

await record("3.1 · Integridade Mecca sob concorrência (Promise.all)", async () => {
  const baseExercicioId = 991_000 + (RUN_ID % 8000);
  const peso = 25;
  const repeticoes = 8;
  const series = 2;
  const perCallMecca = computeMeccaContributionKg(peso);
  const expectedTotalDelta = perCallMecca * CONCURRENT_RPC_CALLS;

  const meccaBefore = await fetchMeccaTotal(cliente.client);

  const started = performance.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_RPC_CALLS }, (_, index) =>
      cliente.client.rpc("registrar_treino_com_status", {
        p_user_id: cliente.userId,
        p_exercicio_id: String(baseExercicioId + index),
        p_exercicio_nome: `${PROBE_PREFIX}-race-${index}`,
        p_musculo: "costas",
        p_peso_atual: peso,
        p_repeticoes: repeticoes,
        p_series: series,
      }),
    ),
  );
  const elapsedMs = Math.round(performance.now() - started);

  const rpcErrors = results.filter((result) => result.error);
  if (rpcErrors.length > 0) {
    return {
      ok: false,
      detail: `${rpcErrors.length}/${CONCURRENT_RPC_CALLS} RPCs falharam: ${rpcErrors[0].error.message}`,
    };
  }

  const statuses = results.flatMap((result) => {
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    return rows.map((row) => String(row.status ?? ""));
  });

  const allStatusesValid = statuses.every(
    (status) => status === "CONCLUÍDO" || status === "SUPERAÇÃO",
  );
  if (!allStatusesValid) {
    return { ok: false, detail: `status inválidos: ${statuses.join(",")}` };
  }

  const meccaAfter = await fetchMeccaTotal(cliente.client);
  const observedDelta = meccaAfter - meccaBefore;

  if (observedDelta !== expectedTotalDelta) {
    return {
      ok: false,
      detail: `race Mecca: delta=${observedDelta} esperado=${expectedTotalDelta} (${elapsedMs}ms) — possível lost update`,
    };
  }

  return {
    ok: true,
    detail: `${CONCURRENT_RPC_CALLS} RPCs OK em ${elapsedMs}ms · mecca+${observedDelta} · statuses=${statuses.length}`,
  };
});

// =============================================================================
// BLOCO 4 · RLS complementar (dual-track hardening)
// =============================================================================

console.log("\n--- Bloco 4 · RLS complementar ---\n");

await expectBlocked("4.1 · cliente: INSERT bond alheio bloqueado", async () => {
  const { error } = await cliente.client.from("forger_client_bonds").insert({
    forger_id: forjador?.userId ?? cliente.userId,
    client_id: atletaVip?.userId ?? "bad0554d-5c68-4e2e-b9d3-ba55f6e86634",
  });
  return Boolean(error) && isAccessDeniedError(error);
});

if (atletaVip) {
  await expectBlocked("4.2 · atacante: SELECT RX personal da vitima bloqueado", async () => {
    const { data, error } = await cliente.client
      .from("historico_treinos_personais")
      .select("id")
      .eq("client_id", atletaVip.userId);
    if (error) return isAccessDeniedError(error);
    return (data ?? []).length === 0;
  });
}

// =============================================================================
// BLOCO 5 · BFF bundle (opcional)
// =============================================================================

if (appUrl) {
  console.log(`\n--- Bloco 5 · BFF (${appUrl}) ---\n`);

  await record("5.1 · hasPersonalBond coerente com bond DB", async () => {
    const { data: bondRows, error: bondError } = await cliente.client
      .from("forger_client_bonds")
      .select("id")
      .eq("client_id", cliente.userId)
      .limit(1);
    if (bondError) return { ok: false, detail: bondError.message };

    const expectedBond = (bondRows ?? []).length > 0;
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/dashboard/bundle`, {
      headers: { Authorization: `Bearer ${cliente.token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      return { skip: true, detail: "BFF exige cookie session — Bearer rejeitado" };
    }
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };

    const payload = await response.json();
    return {
      ok: Boolean(payload.hasPersonalBond) === expectedBond,
      detail: `DB bond=${expectedBond} bundle=${payload.hasPersonalBond} track=${payload.trainingTrack?.track}`,
    };
  });
}

// =============================================================================
// Cleanup (service_role)
// =============================================================================

if (service) {
  await service
    .from("historico_treinos_comuns")
    .delete()
    .like("exercicio_id", `${PROBE_PREFIX}%`);

  await service
    .from("historico_treinos_personais")
    .delete()
    .like("exercicio_id", `${PROBE_PREFIX}%`);

  const probeExercicioIds = [
    990_000 + (RUN_ID % 9000),
    ...Array.from({ length: CONCURRENT_RPC_CALLS }, (_, i) => 991_000 + (RUN_ID % 8000) + i),
  ];

  for (const exercicioId of probeExercicioIds) {
    await service
      .from("historico_treinos")
      .delete()
      .eq("cliente_id", cliente.userId)
      .eq("exercicio_id", exercicioId);
  }
}

console.log(`\nARGOS Two-Way: ${passed} pass · ${failed} fail · ${skipped} skip`);
if (vulnerabilities.length > 0) {
  console.log("Brechas:", vulnerabilities.join(", "));
}
console.log("");

process.exit(failed > 0 ? 3 : 0);
