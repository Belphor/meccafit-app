/**
 * ARGOS Latency Probe — mede cold/warm ping do dashboard bundle
 * Uso: node scripts/argos/latency-probe.mjs [--app-url http://127.0.0.1:3000] [--budget 100]
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

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

function parseArgs(argv) {
  const args = { appUrl: "http://127.0.0.1:3000", budget: 100, samples: 12 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--app-url") args.appUrl = argv[i + 1] ?? args.appUrl;
    if (argv[i] === "--budget") args.budget = Number(argv[i + 1] ?? args.budget);
    if (argv[i] === "--samples") args.samples = Number(argv[i + 1] ?? args.samples);
  }
  return args;
}

const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const { appUrl, budget, samples } = parseArgs(process.argv);

if (!baseUrl || !anonKey) {
  console.error("ARGOS latency-probe: env ausente");
  process.exit(1);
}

async function signIn() {
  const client = createClient(baseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: "cliente@meccafit.com",
    password: "senha123",
  });
  if (error || !data.session) throw new Error(error?.message ?? "login falhou");
  return data.session.access_token;
}

async function probeSupabaseCold(token) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/rest/v1/rpc/fetch_dashboard_bundle`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ p_musculo: "peito", p_mural_limit: 48 }),
  });
  await response.text();
  return {
    ms: Math.round(performance.now() - started),
    status: response.status,
    mode: response.status === 404 ? "rpc_missing" : "supabase_cold",
  };
}

async function probeSupabaseParallel(token) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${token}` };
  const started = performance.now();
  await Promise.all([
    fetch(`${baseUrl}/rest/v1/profiles?select=full_name,role&limit=1`, { headers }),
    fetch(
      `${baseUrl}/rest/v1/historico_treinos?select=id,exercicio_id,peso,status&musculo=eq.peito&order=registrado_em.desc&limit=12`,
      { headers },
    ),
    fetch(`${baseUrl}/rest/v1/rpc/argos_fetch_mural_comunidade`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_limit: 48 }),
    }),
  ]);
  return { ms: Math.round(performance.now() - started), mode: "supabase_parallel" };
}

async function probeAppBundle(token, warm = false) {
  const url = `${appUrl}/api/dashboard/bundle?subgrupo=peitoral-superior`;
  const started = performance.now();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: warm ? "default" : "no-store",
  });
  const cacheHeader = response.headers.get("x-cache") ?? "n/a";
  const latencyHeader = response.headers.get("x-latency-ms") ?? "n/a";
  await response.text();
  return {
    ms: Math.round(performance.now() - started),
    status: response.status,
    cache: cacheHeader,
    serverMs: latencyHeader,
    mode: warm ? "app_warm" : "app_cold",
  };
}

console.log("\n=== ARGOS Latency Probe ===\n");
console.log(`Budget p95 warm: ${budget}ms · app=${appUrl}\n`);

const token = await signIn();

const coldRpc = await probeSupabaseCold(token);
if (coldRpc.mode === "rpc_missing") {
  const coldParallel = await probeSupabaseParallel(token);
  console.log(`Supabase cold (3 parallel): ${coldParallel.ms}ms`);
  console.log("RPC fetch_dashboard_bundle: ausente — rode scripts/apply-latency-migration.mjs");
} else {
  console.log(`Supabase cold (bundle RPC): ${coldRpc.ms}ms · HTTP ${coldRpc.status}`);
}

let appOnline = false;
try {
  const coldApp = await probeAppBundle(token, false);
  appOnline = coldApp.status === 200;
  console.log(
    `App cold (/api/dashboard/bundle): ${coldApp.ms}ms · cache=${coldApp.cache} · server=${coldApp.serverMs}ms`,
  );

  if (appOnline) {
    await probeAppBundle(token, true);
    const warmSamples = [];
    for (let i = 0; i < samples; i += 1) {
      const hit = await probeAppBundle(token, true);
      if (hit.status === 200) warmSamples.push(hit.ms);
    }

    const p50 = percentile(warmSamples, 50);
    const p95 = percentile(warmSamples, 95);
    const p99 = percentile(warmSamples, 99);

    console.log(`\nApp warm (${samples} hits, server cache):`);
    console.log(`  p50/p95/p99: ${p50}/${p95}/${p99} ms`);

    if (p95 <= budget) {
      console.log(`\nARGOS latency-probe: warm p95 dentro do budget (${budget}ms).`);
      process.exit(0);
    }

    console.error(`\nARGOS latency-probe: warm p95 ${p95}ms > budget ${budget}ms.`);
    process.exit(2);
  }
} catch (error) {
  console.warn(`App offline (${appUrl}): ${error.message ?? error}`);
}

if (!appOnline) {
  console.log("\nApp offline — budget warm não medido. Inicie: npm run dev");
  console.log("Supabase cold permanece limitado pelo RTT (~250ms+ fora de sa-east-1).");
  process.exit(coldRpc.ms <= budget ? 0 : 1);
}
