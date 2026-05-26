/**
 * ARGOS — teste de carga (fetch concorrente)
 * Uso:
 *   node scripts/argos/load-test.mjs
 *   node scripts/argos/load-test.mjs --vus 5000 --duration 30
 *
 * Alvos read-only: auth health + REST profiles (anon deve falhar após ARGOS)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = { vus: 200, duration: 15, ramp: 5 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--vus") args.vus = Number(argv[i + 1] ?? args.vus);
    if (argv[i] === "--duration") args.duration = Number(argv[i + 1] ?? args.duration);
    if (argv[i] === "--ramp") args.ramp = Number(argv[i + 1] ?? args.ramp);
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

const { vus, duration, ramp } = parseArgs(process.argv);
const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!baseUrl || !anonKey) {
  console.error("ARGOS load-test: env ausente");
  process.exit(1);
}

const targets = [
  `${baseUrl}/auth/v1/health`,
  `${baseUrl}/rest/v1/profiles?select=id&limit=1`,
];

async function hit(url) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status, ms: performance.now() - started };
  } catch {
    return { ok: false, status: 0, ms: performance.now() - started };
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

console.log(`ARGOS load-test · VUS=${vus} · duration=${duration}s · ramp=${ramp}s`);

const endAt = Date.now() + duration * 1000;
const latencies = [];
const statuses = new Map();
let total = 0;
let errors = 0;

async function worker(workerId) {
  const delay = Math.floor((workerId / vus) * ramp * 1000);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  while (Date.now() < endAt) {
    const url = targets[total % targets.length];
    const result = await hit(url);
    total += 1;
    latencies.push(result.ms);
    statuses.set(result.status, (statuses.get(result.status) ?? 0) + 1);
    if (!result.ok && result.status !== 401 && result.status !== 403) errors += 1;
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: vus }, (_, i) => worker(i)));
const elapsed = Math.round(performance.now() - startedAt);

console.log("\n=== Resultado ===");
console.log(`Requisições: ${total}`);
console.log(`Duração real: ${elapsed}ms`);
console.log(`RPS médio: ${(total / (elapsed / 1000)).toFixed(1)}`);
console.log(`Erros (exc. 401/403): ${errors}`);
console.log(`Latência p50/p95/p99: ${percentile(latencies, 50)}/${percentile(latencies, 95)}/${percentile(latencies, 99)} ms`);
console.log("Status HTTP:", Object.fromEntries(statuses));

if (vus >= 5000) {
  console.log("\nNota: 5000 VUS exige plano Supabase proporcional. Monitore rate limits no dashboard.");
}
