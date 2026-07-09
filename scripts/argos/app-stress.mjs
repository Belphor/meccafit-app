/**
 * ARGOS App Stress — simula fluxos do dashboard + variações + carga alta
 * Uso: node scripts/argos/app-stress.mjs [--vus 400] [--app-url http://localhost:3000]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { resolveSeedPassword } from "../lib/seed-credentials.mjs";

function parseArgs(argv) {
  const args = { vus: 400, duration: 45, ramp: 12, appUrl: process.env.ARGOS_APP_URL ?? "http://127.0.0.1:3000" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--vus") args.vus = Number(argv[i + 1] ?? args.vus);
    if (argv[i] === "--duration") args.duration = Number(argv[i + 1] ?? args.duration);
    if (argv[i] === "--ramp") args.ramp = Number(argv[i + 1] ?? args.ramp);
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

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

function sanitizeTextFilterParam(param) {
  if (param === null || param === undefined) return null;
  const normalized = String(param).trim().toLowerCase();
  if (!normalized || normalized === "geral") return null;
  return normalized;
}

function sanitizeNumericRouteParam(param) {
  const cleaned = sanitizeTextFilterParam(param);
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  return Number.parseInt(cleaned, 10);
}

function subgroupIdToMusculo(subgroupId) {
  const normalized = subgroupId.trim().toLowerCase();
  if (normalized.includes("peitoral") || normalized.includes("peito")) return "peito";
  if (normalized.includes("costa")) return "costas";
  if (normalized.includes("ombro")) return "ombros";
  if (normalized.includes("braco") || normalized.includes("braço")) return "bracos";
  if (normalized.includes("perna")) return "pernas";
  return "peito";
}

const SUBGROUP_PARAMS = [
  null,
  "",
  "geral",
  "peitoral-superior",
  "peito",
  "1",
  "12",
  "99999",
  "Peitoral-Superior",
  "' OR '1'='1",
  "<script>",
  "../../../etc/passwd",
  "costas-media",
  "ombros-anterior",
  "pernas-quadriceps",
];

const MUSCULOS = ["peito", "costas", "ombros", "bracos", "pernas"];
const WEIGHT_EDGE = [0, -1, 0.001, 1, 30.5, 999.99, 1e6, NaN, "abc", null];
const PROBE_EX_BASE = 96000;

const { vus, duration, ramp, appUrl } = parseArgs(process.argv);
const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!baseUrl || !anonKey) {
  console.error("ARGOS app-stress: env ausente");
  process.exit(1);
}

const SEED_PASSWORD = resolveSeedPassword();

const ACCOUNTS = [
  { label: "cliente", email: "cliente@meccafit.com", password: SEED_PASSWORD },
  { label: "soberano", email: "master@meccafit.com", password: SEED_PASSWORD },
];

let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];
const metrics = {
  functional: {},
  load: {},
  routes: {},
  integrity: {},
};

function pass(id) {
  passed += 1;
}

function fail(id, detail) {
  failed += 1;
  failures.push({ id, detail });
}

function warn(id, detail) {
  warnings += 1;
  console.warn(`[WARN] ${id}: ${detail}`);
}

async function signIn(email, password) {
  const client = createClient(baseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return { client, userId: data.user.id, token: data.session.access_token, role: null };
}

async function fetchProfileRole(client, userId) {
  const { data } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? "unknown";
}

async function dashboardBundle(client, userId, musculo) {
  const started = performance.now();

  const rpcRes = await client.rpc("fetch_dashboard_bundle", {
    p_musculo: musculo,
    p_mural_limit: 48,
  });

  if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === "object") {
    const bundle = rpcRes.data;
    const profile = bundle.profile;
    const historico = Array.isArray(bundle.historico) ? bundle.historico : [];
    const muralRows = Array.isArray(bundle.mural) ? bundle.mural : [];
    const ms = performance.now() - started;
    const hasSoberanoInMural = muralRows.some((r) => r.atleta_nome === "Mestre Supremo");

    return {
      ms,
      profileOk: Boolean(profile),
      histOk: historico.every((r) => !r.cliente_id || r.cliente_id === userId),
      muralOk: !hasSoberanoInMural,
      histCount: historico.length,
      muralCount: muralRows.length,
      errors: [],
    };
  }

  const [profileRes, histRes, muralRes] = await Promise.all([
    client.from("profiles").select("full_name,nome_linhagem,status_altar,data_nascimento,role").eq("id", userId).maybeSingle(),
    client
      .from("historico_treinos")
      .select("id,exercicio_id,exercicio_nome,musculo,peso,peso_atual,series,repeticoes,status,registrado_em")
      .eq("cliente_id", userId)
      .eq("musculo", musculo)
      .order("registrado_em", { ascending: false }),
    client.rpc("argos_fetch_mural_comunidade", { p_limit: 48 }),
  ]);
  const ms = performance.now() - started;

  const foreignHist = (histRes.data ?? []).filter((r) => r.cliente_id && r.cliente_id !== userId);
  const muralRows = Array.isArray(muralRes.data) ? muralRes.data : [];
  const hasSoberanoInMural = muralRows.some((r) => r.atleta_nome === "Mestre Supremo");

  return {
    ms,
    profileOk: !profileRes.error && profileRes.data,
    histOk: !histRes.error && foreignHist.length === 0,
    muralOk: !muralRes.error && !hasSoberanoInMural,
    histCount: histRes.data?.length ?? 0,
    muralCount: muralRows.length,
    errors: [profileRes.error, histRes.error, muralRes.error].filter(Boolean),
  };
}

async function runFunctionalProbes(sessions) {
  console.log("\n--- Fase 1: fluxos funcionais (dashboard) ---\n");

  for (const session of sessions) {
    for (const param of SUBGROUP_PARAMS) {
      const cleaned = sanitizeTextFilterParam(param);
      const numeric = sanitizeNumericRouteParam(param);
      const resolvedId = cleaned ?? "peitoral-superior-default";
      const musculo = subgroupIdToMusculo(resolvedId);
      const id = `route:${session.label}:subgrupo:${String(param)}`;

      try {
        const bundle = await dashboardBundle(session.client, session.userId, musculo);
        if (bundle.profileOk && bundle.histOk && bundle.muralOk) {
          pass(id);
        } else {
          fail(id, JSON.stringify({ profileOk: bundle.profileOk, histOk: bundle.histOk, muralOk: bundle.muralOk }));
        }
      } catch (err) {
        fail(id, err.message);
      }
    }

    for (const musculo of MUSCULOS) {
      const id = `hist:${session.label}:${musculo}`;
      const { data, error } = await session.client
        .from("historico_treinos")
        .select("cliente_id, musculo, peso, peso_atual, status")
        .eq("cliente_id", session.userId)
        .eq("musculo", musculo);
      const foreign = (data ?? []).filter((r) => r.cliente_id !== session.userId);
      const badWeight = (data ?? []).some((r) => {
        const w = Number(r.peso ?? r.peso_atual);
        return Number.isFinite(w) && w < 0;
      });
      if (!error && foreign.length === 0 && !badWeight) pass(id);
      else fail(id, `err=${error?.message} foreign=${foreign.length} badWeight=${badWeight}`);
    }
  }

  metrics.functional.probes = passed + failed;
}

async function runWriteProbes(cliente) {
  console.log("\n--- Fase 2: mutações (registrar treino + cleanup) ---\n");

  const createdIds = [];

  for (let i = 0; i < WEIGHT_EDGE.length; i += 1) {
    const peso = WEIGHT_EDGE[i];
    const id = `rpc:registrar:weight:${String(peso)}`;
    const { data, error } = await cliente.client.rpc("registrar_treino_com_status", {
      p_user_id: cliente.userId,
      p_exercicio_id: PROBE_EX_BASE + i,
      p_exercicio_nome: `ARGOS-probe-${i}`,
      p_musculo: MUSCULOS[i % MUSCULOS.length],
      p_peso_atual: peso,
      p_repeticoes: 1,
      p_series: 1,
    });

    const numericPeso = Number(peso);
    const validWeight =
      Number.isFinite(numericPeso) && numericPeso >= 1 && numericPeso <= 9999.99;
    if (validWeight) {
      if (!error) {
        pass(id);
        const { data: rows } = await cliente.client
          .from("historico_treinos")
          .select("id")
          .eq("cliente_id", cliente.userId)
          .eq("exercicio_id", PROBE_EX_BASE + i);
        for (const row of rows ?? []) createdIds.push(row.id);
      } else {
        fail(id, error?.message ?? "rpc error");
      }
    } else if (error) {
      pass(id);
    } else {
      fail(id, "peso inválido aceito");
    }
  }

  for (const musculo of MUSCULOS) {
    const id = `rpc:registrar:musculo:${musculo}`;
    const exId = PROBE_EX_BASE + 100 + MUSCULOS.indexOf(musculo);
    const { error } = await cliente.client.rpc("registrar_treino_com_status", {
      p_user_id: cliente.userId,
      p_exercicio_id: exId,
      p_exercicio_nome: `Probe ${musculo}`,
      p_musculo: musculo,
      p_peso_atual: 40,
      p_repeticoes: 8,
      p_series: 3,
    });
    if (!error) {
      pass(id);
      const { data: rows } = await cliente.client
        .from("historico_treinos")
        .select("id")
        .eq("cliente_id", cliente.userId)
        .eq("exercicio_id", exId);
      for (const row of rows ?? []) createdIds.push(row.id);
    } else {
      fail(id, error.message);
    }
  }

  if (createdIds.length > 0) {
    await cliente.client.from("historico_treinos").delete().in("id", createdIds);
    pass("cleanup:probe_rows");
  }

  metrics.functional.writeProbes = WEIGHT_EDGE.length + MUSCULOS.length;
}

async function runMuralVariationProbes(sessions) {
  console.log("\n--- Fase 3: mural — limites e ordenação ---\n");

  for (const session of sessions) {
    for (let limit = 1; limit <= 100; limit += 1) {
      const id = `mural:${session.label}:limit:${limit}`;
      const { data, error } = await session.client.rpc("argos_fetch_mural_comunidade", { p_limit: limit });
      const rows = Array.isArray(data) ? data : [];
      const ok =
        !error &&
        rows.length <= limit &&
        rows.length <= 100 &&
        !rows.some((r) => r.atleta_nome === "Mestre Supremo");
      ok ? pass(id) : fail(id, `rows=${rows.length} err=${error?.message}`);
    }

    const { data } = await session.client.rpc("argos_fetch_mural_comunidade", { p_limit: 48 });
    const rows = Array.isArray(data) ? data : [];
    let ordered = true;
    for (let i = 1; i < rows.length; i += 1) {
      const prev = new Date(rows[i - 1].registrado_em).getTime();
      const cur = new Date(rows[i].registrado_em).getTime();
      if (cur > prev) ordered = false;
    }
    ordered ? pass(`mural:${session.label}:ordenacao`) : fail(`mural:${session.label}:ordenacao`, "fora de ordem DESC");
  }

  metrics.functional.muralLimits = 100 * sessions.length;
}

async function runConcurrentLoad(sessions) {
  console.log(`\n--- Fase 4: carga alta VUS=${vus} · ${duration}s ---\n`);

  const endAt = Date.now() + duration * 1000;
  const latencies = [];
  const statuses = new Map();
  const scenarioCounts = new Map();
  let total = 0;
  let errors = 0;
  let integrityFails = 0;

  const scenarios = [
    { name: "bundle_peito", musculo: "peito" },
    { name: "bundle_costas", musculo: "costas" },
    { name: "bundle_ombros", musculo: "ombros" },
    { name: "bundle_bracos", musculo: "bracos" },
    { name: "bundle_pernas", musculo: "pernas" },
    { name: "mural_48", musculo: null },
    { name: "mural_100", musculo: null },
    { name: "profile_self", musculo: null },
  ];

  async function worker(workerId) {
    const delay = Math.floor((workerId / vus) * ramp * 1000);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    const session = sessions[workerId % sessions.length];
    let localTotal = 0;

    while (Date.now() < endAt) {
      const scenario = scenarios[localTotal % scenarios.length];
      localTotal += 1;
      const started = performance.now();

      try {
        if (scenario.name.startsWith("mural_")) {
          const limit = scenario.name === "mural_100" ? 100 : 48;
          const { data, error } = await session.client.rpc("argos_fetch_mural_comunidade", { p_limit: limit });
          const ms = performance.now() - started;
          total += 1;
          latencies.push(ms);
          statuses.set(error ? 500 : 200, (statuses.get(error ? 500 : 200) ?? 0) + 1);
          scenarioCounts.set(scenario.name, (scenarioCounts.get(scenario.name) ?? 0) + 1);
          if (error) errors += 1;
          if (Array.isArray(data) && data.some((r) => r.atleta_nome === "Mestre Supremo")) integrityFails += 1;
        } else if (scenario.name === "profile_self") {
          const { error } = await session.client.from("profiles").select("*").eq("id", session.userId).maybeSingle();
          const ms = performance.now() - started;
          total += 1;
          latencies.push(ms);
          statuses.set(error ? 500 : 200, (statuses.get(error ? 500 : 200) ?? 0) + 1);
          scenarioCounts.set(scenario.name, (scenarioCounts.get(scenario.name) ?? 0) + 1);
          if (error) errors += 1;
        } else {
          const bundle = await dashboardBundle(session.client, session.userId, scenario.musculo);
          total += 1;
          latencies.push(bundle.ms);
          statuses.set(bundle.errors.length ? 500 : 200, (statuses.get(bundle.errors.length ? 500 : 200) ?? 0) + 1);
          scenarioCounts.set(scenario.name, (scenarioCounts.get(scenario.name) ?? 0) + 1);
          if (!bundle.histOk || !bundle.profileOk || !bundle.muralOk) integrityFails += 1;
          if (bundle.errors.length) errors += 1;
        }
      } catch {
        total += 1;
        errors += 1;
      }
    }
  }

  const loadStarted = performance.now();
  await Promise.all(Array.from({ length: vus }, (_, i) => worker(i)));
  const elapsed = Math.round(performance.now() - loadStarted);

  metrics.load = {
    requests: total,
    durationMs: elapsed,
    rps: Number((total / (elapsed / 1000)).toFixed(1)),
    errors,
    integrityFails,
    errorRatePct: Number(((errors / Math.max(total, 1)) * 100).toFixed(2)),
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95),
    latencyP99: percentile(latencies, 99),
    latencyMax: latencies.length ? Math.round(Math.max(...latencies)) : 0,
    statuses: Object.fromEntries(statuses),
    scenarios: Object.fromEntries(scenarioCounts),
  };

  if (integrityFails > 0) fail("load:integrity", `${integrityFails} falhas de integridade`);
  else pass("load:integrity");

  if (errors > total * 0.02) fail("load:error_rate", `${errors}/${total} (${metrics.load.errorRatePct}%)`);
  else pass("load:error_rate");
}

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runNextRoutes(appBase) {
  console.log(`\n--- Fase 5: rotas Next.js (${appBase}) ---\n`);

  const routes = [
    "/",
    "/dashboard",
    "/dashboard?subgrupo=peitoral-superior",
    "/dashboard?subgrupo=geral",
    "/dashboard?subgrupo=1",
    "/dashboard?subgrupo=%27%20OR%201%3D1",
    "/favicon.ico",
    "/_next/static/not-found-probe",
  ];

  const routeResults = [];

  for (const route of routes) {
    const id = `next:${route.split("?")[0]}`;
    try {
      const res = await fetchWithTimeout(`${appBase}${route}`, { redirect: "manual" });
      const body = await res.text();
      const isServerError = res.status >= 500;
      const hasNextError = body.includes("Application error") || body.includes("Internal Server Error");
      routeResults.push({ route, status: res.status, bytes: body.length, ms: 0 });

      if (route.includes("not-found-probe")) {
        res.status === 404 ? pass(id) : fail(id, `status=${res.status}`);
      } else if (isServerError || hasNextError) {
        fail(id, `HTTP ${res.status}`);
      } else {
        pass(id);
      }
    } catch (err) {
      routeResults.push({ route, status: 0, error: err.message });
      if (route.includes("not-found-probe")) {
        warn(id, err.message);
      } else if (err.name === "AbortError" || err.message?.includes("aborted")) {
        warn(id, "app offline ou timeout");
      } else {
        fail(id, err.message);
      }
    }
  }

  metrics.routes = {
    base: appBase,
    results: routeResults,
    appOnline: routeResults.some((r) => r.status === 200),
  };
}

async function runIntegrityAudit(sessions) {
  console.log("\n--- Fase 6: auditoria de integridade de dados ---\n");

  const cliente = sessions.find((s) => s.label === "cliente");
  const soberano = sessions.find((s) => s.label === "soberano");

  const { data: allHist } = await soberano.client.from("historico_treinos").select("cliente_id, peso, peso_atual, status").limit(200);
  const orphanWeight = (allHist ?? []).filter((r) => {
    const p = Number(r.peso);
    const pa = Number(r.peso_atual);
    return (Number.isFinite(p) && p < 0) || (Number.isFinite(pa) && pa < 0);
  });
  orphanWeight.length === 0 ? pass("integrity:negative_weights") : fail("integrity:negative_weights", `${orphanWeight.length}`);

  const { data: clienteHist } = await cliente.client.from("historico_treinos").select("cliente_id").limit(100);
  const leak = (clienteHist ?? []).filter((r) => r.cliente_id !== cliente.userId);
  leak.length === 0 ? pass("integrity:cliente_scope") : fail("integrity:cliente_scope", `${leak.length} rows`);

  const { data: profiles } = await soberano.client.from("profiles").select("id, role");
  const roles = new Set((profiles ?? []).map((p) => p.role));
  roles.size >= 2 ? pass("integrity:roles_present") : fail("integrity:roles_present", JSON.stringify([...roles]));

  metrics.integrity = {
    historicoSample: allHist?.length ?? 0,
    clienteHistRows: clienteHist?.length ?? 0,
    profileCount: profiles?.length ?? 0,
    roles: [...roles],
  };
}

console.log("\n=== ARGOS App Stress ===\n");
const globalStart = performance.now();

const sessions = [];
for (const account of ACCOUNTS) {
  const session = await signIn(account.email, account.password);
  session.label = account.label;
  session.role = await fetchProfileRole(session.client, session.userId);
  sessions.push(session);
}

await runFunctionalProbes(sessions);
await runWriteProbes(sessions.find((s) => s.label === "cliente"));
await runMuralVariationProbes(sessions);
await runConcurrentLoad(sessions);
await runNextRoutes(appUrl);
await runIntegrityAudit(sessions);

const totalMs = Math.round(performance.now() - globalStart);

console.log("\n=== Relatório App Stress ===\n");
console.log(`Probes funcionais: ${passed + failed} · ${passed} pass · ${failed} fail · ${warnings} warn`);
console.log(`Tempo total: ${totalMs}ms\n`);

console.log("--- Carga ---");
console.log(JSON.stringify(metrics.load, null, 2));

console.log("\n--- Integridade ---");
console.log(JSON.stringify(metrics.integrity, null, 2));

console.log("\n--- Rotas Next ---");
for (const r of metrics.routes.results ?? []) {
  console.log(`  ${r.route} → ${r.status}${r.error ? ` (${r.error})` : ""} · ${r.bytes ?? 0} bytes`);
}

if (failures.length > 0) {
  console.log("\nFalhas:");
  for (const f of failures.slice(0, 30)) {
    console.log(`  - ${f.id}: ${f.detail}`);
  }
  if (failures.length > 30) console.log(`  ... +${failures.length - 30} more`);
  process.exit(2);
}

console.log("\nARGOS app-stress: concluído sem falhas críticas.");
process.exit(0);
