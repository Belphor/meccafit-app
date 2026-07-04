/**
 * ARGOS · garante planilhas_forjador para cliente@ (falha o CI se não conseguir).
 * Uso: node scripts/argos/seed-planilhas-ci.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ensurePlanilhasForAtletaProbe, hasFullPlanilhaWeek } from "../lib/planilhas-seed.mjs";

const SEED_PASSWORD = "senha123";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anonKey || !serviceKey) {
  console.error("seed-planilhas-ci: NEXT_PUBLIC_SUPABASE_URL, anon key e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clienteClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: loginData, error: loginErr } = await clienteClient.auth.signInWithPassword({
  email: "cliente@meccafit.com",
  password: SEED_PASSWORD,
});

if (loginErr || !loginData.user?.id) {
  console.error(`seed-planilhas-ci: login cliente@ falhou — ${loginErr?.message ?? "sem user"}`);
  console.error("Rode: npm run seed:test-users");
  process.exit(1);
}

const atletaId = loginData.user.id;
console.log(`seed-planilhas-ci: cliente@ → ${atletaId}`);

try {
  const result = await ensurePlanilhasForAtletaProbe({ admin, url, anonKey, atletaId });
  console.log(`seed-planilhas-ci: service_role/RPC ok · ${result.count} linha(s) · ${result.attempts.join(" · ")}`);
} catch (error) {
  console.error(`seed-planilhas-ci: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const { data: ownRows, error: ownErr } = await clienteClient
  .from("planilhas_forjador")
  .select("dia_semana, grupo_muscular")
  .eq("atleta_id", atletaId);

await clienteClient.auth.signOut();

if (ownErr) {
  console.error(`seed-planilhas-ci: leitura autenticada falhou — ${ownErr.message}`);
  process.exit(1);
}

if (!hasFullPlanilhaWeek(ownRows)) {
  console.error(`seed-planilhas-ci: cliente não enxerga grade Seg–Sáb (${(ownRows ?? []).length} linha(s))`);
  process.exit(1);
}

console.log("seed-planilhas-ci: grade Seg–Sáb visível para cliente@");
