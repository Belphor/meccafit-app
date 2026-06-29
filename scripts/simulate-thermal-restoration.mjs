/**
 * Simulação · Gravidade Térmica (degradação + restauração na sessão)
 *
 * Cenário: cliente com fase Labareda (tier 4), VTC 30d abaixo de 16 000 kg → layout
 * degradado (Faísca). Ao registrar ≥ 1 000 kg na sessão de hoje, a fase reativa e o
 * flash de restauração dispara na aba Treino.
 *
 * Uso:
 *   node scripts/simulate-thermal-restoration.mjs setup --user=cliente_principal
 *   node scripts/simulate-thermal-restoration.mjs restore --user=cliente_principal
 *   node scripts/simulate-thermal-restoration.mjs status --user=cliente_principal
 *   node scripts/simulate-thermal-restoration.mjs reset --user=cliente_principal
 *
 * Pré-requisito: npm run seed:test-users · conta master@ (soberano)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "senha123";
const MAINTENANCE_LABAREDA = 16_000;
const RESTORATION_SESSION_KG = 1_000;
const DEGRADED_VTC_30D_TOTAL = 8_000;

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

function loadRegistry() {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8"),
  ).users ?? {};
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args.find((item) => !item.startsWith("--")) ?? "status";
  const userFlag = args.find((item) => item.startsWith("--user="));
  const userLabel = userFlag?.slice("--user=".length) ?? "cliente_principal";
  return { command, userLabel };
}

function spTodayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function daysAgoIso(days) {
  const base = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  base.setDate(base.getDate() - days);
  return base.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

async function login(client, email) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return data.session;
}

async function sovereignPatch(anon, targetId, patch) {
  const { data, error } = await anon.rpc("argos_sovereign_modify_statistics", {
    p_target_id: targetId,
    p_patch: patch,
  });
  if (error) throw new Error(`sovereign patch ${JSON.stringify(patch)}: ${error.message}`);
  return data;
}

async function fetchMetrics(anon, userId) {
  const [vtc30, session] = await Promise.all([
    anon.rpc("argos_compute_vtc_30d", { p_user_id: userId }),
    anon.rpc("argos_compute_session_vtc_today", { p_user_id: userId }),
  ]);
  if (vtc30.error) throw new Error(`vtc_30d: ${vtc30.error.message}`);
  if (session.error) throw new Error(`session_vtc: ${session.error.message}`);
  return {
    vtc_30d: Number(vtc30.data ?? 0),
    session_vtc_today: Number(session.data ?? 0),
  };
}

async function fetchPhaseTier(admin, userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("phase_tier, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function describeState(phaseTier, metrics) {
  const degraded = phaseTier >= 4 && metrics.vtc_30d < MAINTENANCE_LABAREDA;
  const restored = degraded && metrics.session_vtc_today >= RESTORATION_SESSION_KG;
  const layout = restored ? "LABAREDA (restaurada na sessão)" : degraded ? "FAISCA (degradada)" : `tier ${phaseTier}`;

  console.log(`  Fase conquistada (tier): ${phaseTier}`);
  console.log(`  VTC 30d: ${metrics.vtc_30d.toLocaleString("pt-BR")} kg (manutenção Labareda: ${MAINTENANCE_LABAREDA.toLocaleString("pt-BR")} kg)`);
  console.log(`  VTC sessão hoje: ${metrics.session_vtc_today.toLocaleString("pt-BR")} kg (restauração: ≥ ${RESTORATION_SESSION_KG.toLocaleString("pt-BR")} kg)`);
  console.log(`  Layout activo esperado: ${layout}`);
  if (degraded && !restored) {
    console.log(`  → Abra /dashboard?tab=treino — deve ver véu térmico + aviso no canto.`);
    console.log(`  → Rode: node scripts/simulate-thermal-restoration.mjs restore --user=...`);
  }
  if (restored) {
    console.log(`  → Recarregue Treino — flash de restauração (~1,4 s) + layout Labareda na sessão.`);
  }
}

async function seedDegradedBalanco(admin, userId) {
  const cutoff = daysAgoIso(31);
  const { error: delError } = await admin
    .from("balanco_termico_diario")
    .delete()
    .eq("user_id", userId)
    .gte("data_treino", cutoff);
  if (delError) throw new Error(`limpar balanco: ${delError.message}`);

  const chunks = [3200, 2800, 2000];
  const rows = chunks.map((vtc, index) => ({
    user_id: userId,
    data_treino: daysAgoIso(10 - index * 3),
    vtc_total: vtc,
  }));

  const { error: insError } = await admin.from("balanco_termico_diario").insert(rows);
  if (insError) throw new Error(`inserir balanco degradado: ${insError.message}`);
}

async function main() {
  const { command, userLabel } = parseArgs();
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const registry = loadRegistry();

  if (!url || !anonKey || !serviceKey) {
    console.error("simulate-thermal-restoration: URL, anon key e service role obrigatórios (.env.local).");
    process.exit(1);
  }

  const target = registry[userLabel];
  if (!target?.userId || !target?.email) {
    console.error(`Utilizador '${userLabel}' ausente — rode npm run seed:test-users`);
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const sovereignEmail = registry.forjador_soberano?.email ?? "master@meccafit.com";
  await login(anon, sovereignEmail);

  console.log(`\n=== simulate-thermal-restoration · ${command} · ${target.email} ===\n`);

  if (command === "setup") {
    await sovereignPatch(anon, target.userId, { phase_tier: 4, reset_vtc_today: true });
    await seedDegradedBalanco(admin, target.userId);
    const metrics = await fetchMetrics(anon, target.userId);
    console.log("[OK] Cenário degradado preparado.");
    describeState(4, metrics);
    console.log(`\nLogin como ${target.email} / ${PASSWORD} e abra Treino.`);
    return;
  }

  if (command === "restore") {
    await sovereignPatch(anon, target.userId, { vtc_today_set: RESTORATION_SESSION_KG });
    const metrics = await fetchMetrics(anon, target.userId);
    console.log("[OK] VTC da sessão ajustado para restauração.");
    describeState(4, metrics);
    return;
  }

  if (command === "reset") {
    await sovereignPatch(anon, target.userId, { phase_tier: 2, reset_vtc_today: true });
    const { error } = await admin
      .from("balanco_termico_diario")
      .delete()
      .eq("user_id", target.userId)
      .gte("data_treino", daysAgoIso(31));
    if (error) throw new Error(`reset balanco: ${error.message}`);

    const metrics = await fetchMetrics(anon, target.userId);
    console.log("[OK] Estado térmico reposto (tier 2, balanço limpo).");
    describeState(2, metrics);
    return;
  }

  if (command === "status") {
    const profile = await fetchPhaseTier(admin, target.userId);
    const metrics = await fetchMetrics(anon, target.userId);
    console.log(`  Atleta: ${profile?.full_name ?? target.email}`);
    describeState(Number(profile?.phase_tier ?? 1), metrics);
    return;
  }

  console.error(`Comando desconhecido: ${command}. Use setup | restore | status | reset`);
  process.exit(1);
}

main().catch((error) => {
  console.error("\nsimulate-thermal-restoration FALHOU:", error.message ?? error);
  process.exit(1);
});
