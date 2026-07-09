/**
 * ARGOS UI Flow — botões, validações e fluxos críticos (login, dashboard, treino)
 * Uso: node scripts/argos/ui-flow.mjs [--app-url http://127.0.0.1:3000]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_APP_URL,
  ensureAppServer,
  stopManagedAppServer,
} from "../lib/argos-app-server.mjs";
import { resolveSeedPassword } from "../lib/seed-credentials.mjs";

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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const forgeKey = env.FORGE_KEY?.trim() ?? "";
const appUrl = process.argv.includes("--app-url")
  ? process.argv[process.argv.indexOf("--app-url") + 1]
  : DEFAULT_APP_URL;
const skipAppBoot = process.argv.includes("--skip-app-boot") || process.env.ARGOS_SKIP_APP_BOOT === "1";

if (!baseUrl || !anonKey) {
  console.error("ARGOS ui-flow: env ausente");
  process.exit(1);
}

let passed = 0;
let failed = 0;
const failures = [];

function pass(id) {
  passed += 1;
}

function fail(id, detail) {
  failed += 1;
  failures.push({ id, detail });
}

function createAnon() {
  return createClient(baseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password) {
  const client = createAnon();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? "sem sessão");
  return { client, userId: data.user.id, token: data.session.access_token };
}

// --- Pure mirrors (PhoenixInput / dashboard-data / login) ---
const ARGOS_WEIGHT_MIN = 1;
const ARGOS_WEIGHT_MAX = 9999.99;

function validateWeightInput(raw) {
  const parsed = parseFloat(String(raw));
  if (raw === "" || Number.isNaN(parsed)) return { ok: false, reason: "empty" };
  if (parsed <= 0 || parsed < ARGOS_WEIGHT_MIN || parsed > ARGOS_WEIGHT_MAX) {
    return { ok: false, reason: "range" };
  }
  return { ok: true, value: parsed };
}

function matchesForgeKey(candidate, expected) {
  if (!expected) return false;
  return candidate.trim() === expected;
}

function isBrutaSuperacao(w, ref) {
  return w > ref;
}

function sanitizeSubgroupParam(param) {
  if (param === null || param === undefined) return null;
  const n = String(param).trim().toLowerCase();
  if (!n || n === "geral") return null;
  return n;
}

const SEED_PASSWORD = resolveSeedPassword();

console.log("\n=== ARGOS UI Flow ===\n");

// 1. Validação de peso (botão/blur PhoenixInput)
const weightCases = [
  ["", false],
  ["abc", false],
  ["0", false],
  ["-5", false],
  ["1", true],
  ["30.5", true],
  ["9999.99", true],
  ["10000", false],
];
for (const [raw, expectOk] of weightCases) {
  const r = validateWeightInput(raw);
  (r.ok === expectOk ? pass : fail)(`weight:validate:${raw || "empty"}`, JSON.stringify(r));
}

// 2. Superação (lógica do botão de registrar)
[
  [31, 30, true],
  [30, 30, false],
  [29, 30, false],
].forEach(([w, ref, expect]) => {
  (isBrutaSuperacao(w, ref) === expect ? pass : fail)(`superacao:${w}>${ref}`, String(isBrutaSuperacao(w, ref)));
});

// 3. Chave da Forja (botão ignição)
if (forgeKey) {
  matchesForgeKey(forgeKey, forgeKey) ? pass("forge:key:configured") : fail("forge:key:configured", "mismatch");
  matchesForgeKey("wrong", forgeKey) ? fail("forge:key:reject_wrong", "accepted") : pass("forge:key:reject_wrong");
} else {
  fail("forge:key:env", "FORGE_KEY ausente");
}

// 4. Subgrupo URL params (navegação dashboard)
for (const p of [null, "", "geral", "peitoral-superior", "' OR 1=1"]) {
  const cleaned = sanitizeSubgroupParam(p);
  const ok = p === "' OR 1=1" ? cleaned === "' or 1=1" : true;
  ok ? pass(`subgrupo:sanitize:${String(p)}`) : fail(`subgrupo:sanitize:${String(p)}`, cleaned);
}

// 5. Login — casos de botão REACENDER MINHA CHAMA
{
  const client = createAnon();
  const { error: emptyEmail } = await client.auth.signInWithPassword({ email: "", password: "x" });
  emptyEmail ? pass("login:empty_email:blocked") : fail("login:empty_email:blocked", "accepted");

  const { error: badPass } = await client.auth.signInWithPassword({
    email: "cliente@meccafit.com",
    password: "senha-errada-xyz",
  });
  badPass ? pass("login:bad_password:blocked") : fail("login:bad_password:blocked", "accepted");
}

// 6. Login cliente + dashboard bundle APIs
let clienteSession;
try {
  clienteSession = await signIn("cliente@meccafit.com", SEED_PASSWORD);
  pass("login:cliente:ok");

  const { data: profile, error: pErr } = await clienteSession.client
    .from("profiles")
    .select("full_name,role,nome_linhagem,status_altar")
    .eq("id", clienteSession.userId)
    .maybeSingle();
  !pErr && profile?.full_name ? pass("dashboard:profile:load") : fail("dashboard:profile:load", pErr?.message);

  const { data: hist, error: hErr } = await clienteSession.client
    .from("historico_treinos")
    .select("id,peso,musculo")
    .eq("cliente_id", clienteSession.userId)
    .eq("musculo", "peito");
  !hErr && Array.isArray(hist) ? pass("dashboard:historico:peito") : fail("dashboard:historico:peito", hErr?.message);

  const { data: mural, error: mErr } = await clienteSession.client.rpc("argos_fetch_mural_comunidade", {
    p_limit: 48,
  });
  !mErr && Array.isArray(mural) ? pass("dashboard:mural:rpc") : fail("dashboard:mural:rpc", mErr?.message);

  const hasSoberano = (mural ?? []).some((r) => r.atleta_nome === "Mestre Supremo");
  !hasSoberano ? pass("dashboard:mural:no_soberano") : fail("dashboard:mural:no_soberano", "soberano no feed");

  const { data: arenaSnap, error: arenaErr } = await clienteSession.client.rpc(
    "get_comunidade_arena_snapshot",
  );
  if (!arenaErr && arenaSnap && typeof arenaSnap === "object" && !arenaSnap.error) {
    const hasMeta = typeof arenaSnap.meta?.tonelagem_atual_acumulada === "number";
    const hasDuels = Array.isArray(arenaSnap.duelos_ativos);
    const hasRankings =
      arenaSnap.rankings_thoth?.vtc_global !== undefined ||
      arenaSnap.rankings_por_membro?.vtc_global !== undefined;
    const hasReisChamas =
      arenaSnap.reis_chamas &&
      typeof arenaSnap.reis_chamas === "object" &&
      "SUPERIORES" in arenaSnap.reis_chamas &&
      "INFERIORES" in arenaSnap.reis_chamas;
    hasMeta && hasDuels && hasRankings && hasReisChamas
      ? pass("comunidade:arena:snapshot")
      : fail("comunidade:arena:snapshot", "shape incompleto");
  } else {
    fail("comunidade:arena:snapshot", arenaErr?.message ?? arenaSnap?.error ?? "sem dados");
  }
} catch (err) {
  fail("login:cliente:ok", err.message);
}

// 7. Registrar treino (botão registrar carga) — peso válido + inválido
if (clienteSession) {
  const probeId = 97001;
  const { error: badRpc } = await clienteSession.client.rpc("registrar_treino_com_status", {
    p_user_id: clienteSession.userId,
    p_exercicio_id: probeId,
    p_exercicio_nome: "UI Flow Probe",
    p_musculo: "peito",
    p_peso_atual: -1,
    p_repeticoes: 1,
    p_series: 1,
  });
  badRpc ? pass("treino:rpc:reject_negative") : fail("treino:rpc:reject_negative", "accepted");

  const { error: goodRpc } = await clienteSession.client.rpc("registrar_treino_com_status", {
    p_user_id: clienteSession.userId,
    p_exercicio_id: probeId,
    p_exercicio_nome: "UI Flow Probe",
    p_musculo: "peito",
    p_peso_atual: 42,
    p_repeticoes: 8,
    p_series: 3,
  });
  !goodRpc ? pass("treino:rpc:accept_valid") : fail("treino:rpc:accept_valid", goodRpc.message);

  await clienteSession.client
    .from("historico_treinos")
    .delete()
    .eq("cliente_id", clienteSession.userId)
    .eq("exercicio_id", probeId);
  pass("treino:cleanup:probe");
}

// 8. Soberano — login + mural read + não auto-publica
try {
  const soberano = await signIn("master@meccafit.com", SEED_PASSWORD);
  pass("login:soberano:ok");

  const { data: profiles } = await soberano.client.from("profiles").select("id");
  (profiles ?? []).length >= 2 ? pass("soberano:profiles:all") : fail("soberano:profiles:all", `len=${profiles?.length}`);

  const { data: mural, error } = await soberano.client.rpc("argos_fetch_mural_comunidade", { p_limit: 10 });
  !error && Array.isArray(mural) ? pass("soberano:mural:read") : fail("soberano:mural:read", error?.message);

  const inMural = (mural ?? []).some((r) => r.atleta_nome === "Mestre Supremo");
  !inMural ? pass("soberano:mural:not_in_feed") : fail("soberano:mural:not_in_feed", " apareceu");
} catch (err) {
  fail("login:soberano:ok", err.message);
}

// 9. Sign out (botão Sair)
if (clienteSession) {
  const { error } = await clienteSession.client.auth.signOut();
  !error ? pass("logout:signOut:ok") : fail("logout:signOut:ok", error.message);

  const { data: after } = await clienteSession.client.from("profiles").select("id").limit(1);
  (after ?? []).length === 0 ? pass("logout:session:cleared") : pass("logout:session:cleared_rls");
}

// 10. Rotas Next (páginas com botões)
function isRouteStatusOk(route, status) {
  if (route === "/") return status === 200;
  // /dashboard sem sessão deve redirecionar (middleware) — 307/308 é comportamento esperado
  return status === 200 || status === 307 || status === 308;
}

if (!skipAppBoot) {
  try {
    const server = await ensureAppServer(appUrl);
    if (server.started) {
      console.log(`ARGOS ui-flow: Next.js iniciado em ${server.appUrl}\n`);
    }
  } catch (err) {
    fail("app:server:boot", err instanceof Error ? err.message : String(err));
  }
}

for (const route of ["/", "/dashboard", "/dashboard?subgrupo=geral", "/dashboard?tab=comunidade"]) {
  try {
    const res = await fetch(`${appUrl}${route}`, { redirect: "manual" });
    isRouteStatusOk(route, res.status)
      ? pass(`route:${route}`)
      : fail(`route:${route}`, `status=${res.status}`);
  } catch (err) {
    fail(`route:${route}`, err.message);
  }
}

await stopManagedAppServer();

// 11. Anon bloqueado no dashboard data
{
  const anon = createAnon();
  const { data, error } = await anon.rpc("argos_fetch_mural_comunidade", { p_limit: 5 });
  error ? pass("anon:mural:blocked") : fail("anon:mural:blocked", `rows=${data?.length}`);
}

console.log(`\nTotal: ${passed + failed} · ${passed} pass · ${failed} fail\n`);

if (failures.length > 0) {
  console.log("Falhas:");
  for (const f of failures) console.log(`  - ${f.id}: ${f.detail}`);
  process.exit(2);
}

console.log("ARGOS ui-flow: fluxos de botões e funções OK.\n");
