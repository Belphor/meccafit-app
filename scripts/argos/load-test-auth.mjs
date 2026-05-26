/**
 * ARGOS — carga autenticada (simula 200+ clientes no dashboard)
 * Uso: node scripts/argos/load-test-auth.mjs --vus 200 --duration 30
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = { vus: 200, duration: 30, ramp: 8, latencyBudget: 0, appUrl: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--vus") args.vus = Number(argv[i + 1] ?? args.vus);
    if (argv[i] === "--duration") args.duration = Number(argv[i + 1] ?? args.duration);
    if (argv[i] === "--ramp") args.ramp = Number(argv[i + 1] ?? args.ramp);
    if (argv[i] === "--latency-budget") args.latencyBudget = Number(argv[i + 1] ?? args.latencyBudget);
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

const { vus, duration, ramp, latencyBudget, appUrl } = parseArgs(process.argv);
const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!baseUrl || !anonKey) {
  console.error("ARGOS load-test-auth: env ausente");
  process.exit(1);
}

const POOL = [
  { email: "cliente@meccafit.com", password: "senha123" },
  { email: "atleta2@meccafit.com", password: "senha123" },
  { email: "atleta3@meccafit.com", password: "senha123" },
  { email: "atleta4@meccafit.com", password: "senha123" },
  { email: "master@meccafit.com", password: "senha123" },
];

const SUPERACAO_STATUS = encodeURIComponent("SUPERAÇÃO");

async function createSession(email, password) {
  const client = createClient(baseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`login falhou (${email}): ${error?.message ?? "sem token"}`);
  }
  return data.session.access_token;
}

console.log("ARGOS load-test-auth · autenticando pool...");
const tokenPool = [];
for (const account of POOL) {
  tokenPool.push(await createSession(account.email, account.password));
}

const probeToken = tokenPool[0];
const bundleRpcProbe = await fetch(`${baseUrl}/rest/v1/rpc/fetch_dashboard_bundle`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${probeToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ p_musculo: "peito", p_mural_limit: 48 }),
});
const bundleRpcAvailable = bundleRpcProbe.status !== 404;

const scenarios = [
  ...(bundleRpcAvailable
    ? [
        {
          name: "dashboard_bundle_rpc",
          run: (token) =>
            fetch(`${baseUrl}/rest/v1/rpc/fetch_dashboard_bundle`, {
              method: "POST",
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ p_musculo: "peito", p_mural_limit: 48 }),
            }),
        },
      ]
    : []),
  ...(appUrl
    ? [
        {
          name: "app_dashboard_bundle",
          run: (token) =>
            fetch(`${appUrl.replace(/\/$/, "")}/api/dashboard/bundle?subgrupo=peitoral-superior`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
        },
      ]
    : []),
  {
    name: "profiles_self",
    run: (token) =>
      fetch(`${baseUrl}/rest/v1/profiles?select=full_name,nome_linhagem,status_altar,data_nascimento&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }),
  },
  {
    name: "historico_peito",
    run: (token) =>
      fetch(
        `${baseUrl}/rest/v1/historico_treinos?select=id,exercicio_id,peso,peso_atual,status,musculo&musculo=eq.peito&order=registrado_em.desc&limit=12`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
      ),
  },
  {
    name: "mural_comunidade_rpc",
    run: (token) =>
      fetch(`${baseUrl}/rest/v1/rpc/argos_fetch_mural_comunidade`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_limit: 48 }),
      }),
  },
  {
    name: "auth_health",
    run: () =>
      fetch(`${baseUrl}/auth/v1/health`, {
        headers: { apikey: anonKey },
      }),
  },
];

console.log(`ARGOS load-test-auth · VUS=${vus} · duration=${duration}s · ramp=${ramp}s`);

const endAt = Date.now() + duration * 1000;
const latencies = [];
const scenarioLatencies = new Map();
const statuses = new Map();
const scenarioCounts = new Map();
let total = 0;
let errors = 0;
let rlsViolations = 0;
let authFailures = 0;

function isRlsBody(body) {
  const normalized = body.toLowerCase();
  return (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("42501")
  );
}

async function worker(workerId) {
  const delay = Math.floor((workerId / vus) * ramp * 1000);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  const account = POOL[workerId % POOL.length];
  let token = tokenPool[workerId % tokenPool.length];

  let workerTotal = 0;

  while (Date.now() < endAt) {
    const scenario = scenarios[workerTotal % scenarios.length];
    workerTotal += 1;
    const started = performance.now();

    try {
      const response = await scenario.run(token);
      const body = await response.text();
      const ms = performance.now() - started;

      total += 1;
      latencies.push(ms);
      scenarioLatencies.set(scenario.name, [...(scenarioLatencies.get(scenario.name) ?? []), ms]);
      if (scenario.name === "app_dashboard_bundle" && response.headers.get("x-cache") === "HIT") {
        scenarioLatencies.set(
          "app_dashboard_bundle_cache_hit",
          [...(scenarioLatencies.get("app_dashboard_bundle_cache_hit") ?? []), ms],
        );
      }
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      scenarioCounts.set(scenario.name, (scenarioCounts.get(scenario.name) ?? 0) + 1);

      if (response.status === 401 || response.status === 403) {
        if (isRlsBody(body)) {
          rlsViolations += 1;
        } else if (scenario.name !== "auth_health") {
          authFailures += 1;
          if (authFailures % 25 === 1) {
            try {
              token = await createSession(account.email, account.password);
            } catch {
              // mantém token anterior
            }
          }
        }
      }

      if (!response.ok && response.status !== 401 && response.status !== 403 && response.status !== 429) {
        errors += 1;
      }

      if (scenario.name.startsWith("historico_") && response.ok) {
        try {
          const rows = JSON.parse(body);
          if (Array.isArray(rows) && rows.some((row) => typeof row.cliente_id === "string")) {
            rlsViolations += 1;
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      total += 1;
      errors += 1;
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: vus }, (_, i) => worker(i)));
const elapsed = Math.round(performance.now() - startedAt);

console.log("\n=== Resultado autenticado ===");
console.log(`Requisições: ${total}`);
console.log(`Duração real: ${elapsed}ms`);
console.log(`RPS médio: ${(total / (elapsed / 1000)).toFixed(1)}`);
console.log(`Erros HTTP: ${errors}`);
console.log(`Renovações/suspeitas auth (401 sem RLS): ${authFailures}`);
console.log(`Violações RLS confirmadas: ${rlsViolations}`);
console.log(`Latência p50/p95/p99: ${percentile(latencies, 50)}/${percentile(latencies, 95)}/${percentile(latencies, 99)} ms`);
console.log("Status HTTP:", Object.fromEntries(statuses));
console.log("Cenários:", Object.fromEntries(scenarioCounts));

if (scenarioLatencies.size > 0) {
  console.log("\nLatência por cenário (p95):");
  for (const [name, values] of scenarioLatencies.entries()) {
    console.log(`  ${name}: p95=${percentile(values, 95)}ms (n=${values.length})`);
  }
}

if (latencyBudget > 0) {
  const cacheHits = scenarioLatencies.get("app_dashboard_bundle_cache_hit") ?? [];
  if (cacheHits.length < 5) {
    console.warn(
      `\nARGOS: poucos cache HIT no app (${cacheHits.length}) — budget medido nos hits disponíveis.`,
    );
  }
  if (cacheHits.length === 0) {
    console.error("\nARGOS: nenhum cache HIT no app — verifique /api/dashboard/bundle.");
    process.exit(4);
  }
  const p95 = percentile(cacheHits, 95);
  if (p95 > latencyBudget) {
    console.error(`\nARGOS: app cache HIT p95 ${p95}ms acima do budget ${latencyBudget}ms`);
    process.exit(4);
  }
  console.log(
    `\nBudget latência (app X-Cache:HIT, n=${cacheHits.length}): p95=${p95}ms <= ${latencyBudget}ms`,
  );
}

if (rlsViolations > 0) {
  console.error("\nARGOS: violação RLS confirmada durante carga autenticada.");
  process.exit(2);
}

if (errors > total * 0.05) {
  console.error("\nARGOS: taxa de erro acima de 5% na carga autenticada.");
  process.exit(3);
}

console.log("\nARGOS load-test-auth: carga autenticada estável.");
