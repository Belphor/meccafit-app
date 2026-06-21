/**
 * PLUTUS · Monitor de infraestrutura, alertas e tolerância (free tier)
 * Uso: node scripts/argos/plutus-infra-monitor.mjs [--probe-latency]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  HERMES_LATENCY_BUDGETS,
  SUPABASE_FREE_LIMITS,
  evaluateLatencyTolerance,
  evaluateUsageTolerance,
  summarizePlutusAlerts,
} from "../lib/plutus-infra-alerts.mjs";

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

function parseArgs(argv) {
  const args = { probeLatency: true, samples: 6 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--no-latency") args.probeLatency = false;
    if (argv[i] === "--samples") args.samples = Number(argv[i + 1] ?? args.samples);
  }
  return args;
}

const env = loadEnv();
const { probeLatency, samples } = parseArgs(process.argv);
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = env.SUPABASE_DB_URL?.trim();

/** Overrides manuais · docs/PLUTUS-INFRA-SNAPSHOT.md */
const dbSizeMbOverride = Number(env.PLUTUS_DB_SIZE_MB ?? "");
const egressGbOverride = Number(env.PLUTUS_EGRESS_GB ?? "");

console.log("\n=== PLUTUS · Infra Monitor ===\n");

const evaluations = [];

async function measureDbSizeMb() {
  if (Number.isFinite(dbSizeMbOverride) && dbSizeMbOverride > 0) {
    return dbSizeMbOverride;
  }

  if (!dbUrl) return null;

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const result = await client.query(
      "SELECT pg_database_size(current_database()) / (1024.0 * 1024.0) AS size_mb",
    );
    await client.end();
    const size = Number(result.rows?.[0]?.size_mb ?? 0);
    return Number.isFinite(size) ? Math.round(size * 100) / 100 : null;
  } catch (error) {
    console.warn(`PLUTUS: DB size probe falhou — ${error.message ?? error}`);
    return null;
  }
}

async function probeRpcLatency() {
  if (!baseUrl || !anonKey) return null;

  const client = createClient(baseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: "cliente@meccafit.com",
    password: "senha123",
  });

  if (error || !data.session?.access_token) {
    console.warn(`PLUTUS: login probe falhou — ${error?.message ?? "sem token"}`);
    return null;
  }

  const token = data.session.access_token;
  const latencies = [];

  for (let i = 0; i < samples; i += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}/rest/v1/rpc/fetch_dashboard_bundle`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_musculo: "peito", p_mural_limit: 24 }),
    });
    await response.text();
    if (response.ok) latencies.push(Math.round(performance.now() - started));
  }

  await client.auth.signOut();
  return latencies.length > 0 ? percentile(latencies, 95) : null;
}

async function estimateEgressSampleMb() {
  if (Number.isFinite(egressGbOverride) && egressGbOverride > 0) {
    return egressGbOverride * 1024;
  }

  if (!baseUrl || !serviceKey) return null;

  try {
    const admin = createClient(baseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc("get_comunidade_arena_snapshot", {
      p_skip_side_effects: true,
    });

    if (error || !data) return null;

    const bytes = Buffer.byteLength(JSON.stringify(data), "utf8");
    /** Amostra única · extrapolação conservadora 10k req/dia */
    const dailyEstimateMb = Math.round(((bytes * 10_000) / (1024 * 1024)) * 100) / 100;
    return dailyEstimateMb;
  } catch {
    return null;
  }
}

const dbSizeMb = await measureDbSizeMb();
if (dbSizeMb !== null) {
  evaluations.push(
    evaluateUsageTolerance({
      id: "supabase_db_size",
      label: "Supabase · tamanho DB",
      used: dbSizeMb,
      limit: SUPABASE_FREE_LIMITS.dbSizeMb,
      unit: "MB",
    }),
  );
} else {
  console.warn("PLUTUS: tamanho DB não medido — defina PLUTUS_DB_SIZE_MB ou SUPABASE_DB_URL");
}

const egressSampleMb = await estimateEgressSampleMb();
if (egressSampleMb !== null) {
  const limitMb = SUPABASE_FREE_LIMITS.egressGb * 1024;
  evaluations.push(
    evaluateUsageTolerance({
      id: "supabase_egress_estimate",
      label: "Supabase · egress estimado (amostra)",
      used: egressSampleMb,
      limit: limitMb,
      unit: "MB/mês est.",
    }),
  );
}

if (probeLatency) {
  const rpcP95 = await probeRpcLatency();
  if (rpcP95 !== null) {
    evaluations.push(
      evaluateLatencyTolerance({
        id: "hermes_rpc_warm",
        label: "HERMES · RPC bundle warm",
        observedMs: rpcP95,
        budgetMs: HERMES_LATENCY_BUDGETS.rpcWarmP95Ms,
      }),
    );
  }
}

const summary = summarizePlutusAlerts(evaluations);

console.log("Tolerância PLUTUS: WARN ≥ 80% · CRITICAL ≥ 95% do teto free\n");

for (const row of evaluations) {
  const badge = row.level === "critical" ? "[CRIT]" : row.level === "warn" ? "[WARN]" : "[ OK ]";
  console.log(`${badge} ${row.message}`);
}

console.log("");

if (summary.ok) {
  console.log("PLUTUS infra monitor: todos os indicadores dentro da tolerância.");
  process.exit(0);
}

console.log(`PLUTUS infra monitor: ${summary.alerts.length} alerta(s) · pior nível: ${summary.worst}`);

if (summary.worst === "critical") {
  process.exit(2);
}

process.exit(1);
