/**
 * ARGOS — auditoria de segurança Supabase (read-only / anon probes)
 * Uso: node scripts/argos/security-audit.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!baseUrl || !anonKey) {
  console.error("ARGOS: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em .env.local");
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "Content-Type": "application/json",
};

async function probe(name, url, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const elapsed = Math.round(performance.now() - started);
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "";
    }
    return { name, status: response.status, elapsed, body: body.slice(0, 240) };
  } catch (error) {
    return { name, status: 0, elapsed: Math.round(performance.now() - started), body: String(error) };
  }
}

const tests = [
  probe("root_invalid_path", `${baseUrl}/`),
  probe("auth_health", `${baseUrl}/auth/v1/health`),
  probe("anon_select_historico_treinos", `${baseUrl}/rest/v1/historico_treinos?select=id,cliente_id&limit=5`),
  probe("anon_select_profiles", `${baseUrl}/rest/v1/profiles?select=id&limit=5`),
  probe("anon_rpc_registrar_treino", `${baseUrl}/rest/v1/rpc/registrar_treino_com_status`, {
    method: "POST",
    body: JSON.stringify({
      p_user_id: "00000000-0000-4000-8000-000000000001",
      p_exercicio_id: "1",
      p_peso_atual: 50,
    }),
  }),
  probe("anon_insert_historico_treinos", `${baseUrl}/rest/v1/historico_treinos`, {
    method: "POST",
    body: JSON.stringify({
      cliente_id: "00000000-0000-4000-8000-000000000001",
      exercicio_id: 1,
      exercicio_nome: "ARGOS probe",
      musculo: "peito",
      peso: 50,
      peso_atual: 50,
      repeticoes: 1,
      series: 1,
    }),
    headers: { Prefer: "return=minimal" },
  }),
];

const results = await Promise.all(tests);

console.log("\n=== ARGOS Security Audit ===\n");
for (const result of results) {
  const verdict =
    result.name === "root_invalid_path"
      ? result.body.includes("requested path is invalid")
        ? "EXPECTED"
        : "UNEXPECTED"
      : result.name.startsWith("anon_select_") && result.status === 200
        ? result.body.trim() === "[]"
          ? "RLS_EMPTY"
          : "VULNERABLE"
      : result.status === 401 || result.status === 403 || result.status === 404 || result.status === 400
        ? "BLOCKED"
        : result.status === 200 && result.name.startsWith("anon_")
          ? "VULNERABLE"
          : result.status === 200
            ? "OK"
            : "REVIEW";

  console.log(`[${verdict}] ${result.name}`);
  console.log(`  HTTP ${result.status} · ${result.elapsed}ms`);
  if (result.body) console.log(`  ${result.body.replace(/\s+/g, " ")}\n`);
}

const vulnerable = results.filter((r) => {
  if (!r.name.startsWith("anon_") || r.name === "auth_health") return false;
  if (r.name.startsWith("anon_select_") && r.status === 200 && r.body.trim() === "[]") return false;
  return r.status === 200;
});

if (vulnerable.length > 0) {
  console.error(`ARGOS: ${vulnerable.length} probe(s) anon com acesso indevido — aplique a migration ARGOS.`);
  process.exit(2);
}

console.log("ARGOS: probes anon bloqueados ou esperados.");
