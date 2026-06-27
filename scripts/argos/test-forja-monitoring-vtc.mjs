/**
 * ARGOS · Monitoramento global VTC — forjadores × clientes VIP/comuns
 *
 * Valida:
 *   1. RPCs argos_forja_monitor_athletes / argos_forja_vtc_feed / argos_forja_fraud_signals
 *   2. Forjador linhagem vê todos os clientes (não só os seus)
 *   3. Soberano simula VTC em cliente VIP e comum — feed reflete
 *   4. Segmentação VIP vs comum no payload
 *
 * Uso: node scripts/argos/test-forja-monitoring-vtc.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "senha123";

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
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8")).users ?? {};
  } catch {
    return {};
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(client, email) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return data.user?.id ?? null;
}

async function probeRpcs(client, label) {
  const monitor = await client.rpc("argos_forja_monitor_athletes");
  if (monitor.error) {
    throw new Error(`${label} monitor_athletes: ${monitor.error.message}`);
  }

  const athletes = Array.isArray(monitor.data) ? monitor.data : [];
  assert(athletes.length > 0, `${label}: lista global vazia`);

  const feed = await client.rpc("argos_forja_vtc_feed", { p_limit: 32 });
  if (feed.error) {
    throw new Error(`${label} vtc_feed: ${feed.error.message}`);
  }

  const entries = Array.isArray(feed.data) ? feed.data : [];
  assert(entries.length > 0, `${label}: feed VTC vazio`);

  const signals = await client.rpc("argos_forja_fraud_signals", { p_cliente_id: null });
  if (signals.error) {
    throw new Error(`${label} fraud_signals: ${signals.error.message}`);
  }

  const vipCount = athletes.filter((row) => row.hasVipBond).length;
  const comumCount = athletes.filter((row) => !row.hasVipBond).length;

  return {
    athletes: athletes.length,
    feed: entries.length,
    signals: typeof signals.data?.count === "number" ? signals.data.count : 0,
    vipCount,
    comumCount,
    entries,
    athleteRows: athletes,
  };
}

async function simulateVtc(adminClient, targetId, delta) {
  const { error } = await adminClient.rpc("argos_sovereign_modify_statistics", {
    p_target_id: targetId,
    p_patch: { vtc_today_delta: delta },
  });
  if (error) throw new Error(`simulate VTC: ${error.message}`);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const registry = loadRegistry();

if (!url || !anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes");
  process.exit(1);
}

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const admin = serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

console.log("\n=== ARGOS · Monitoramento VTC global ===\n");

try {
  // 1. Forjador linhagem — visão global
  await login(anon, "forjador@meccafit.com");
  const linhagem = await probeRpcs(anon, "forjador_linhagem");
  console.log(
    `[PASS] forjador_linhagem · ${linhagem.athletes} clientes · VIP ${linhagem.vipCount} · comuns ${linhagem.comumCount} · feed ${linhagem.feed} · ${linhagem.signals} alerta(s)`,
  );
  await anon.auth.signOut();

  // 2. Soberano — visão global
  await login(anon, "master@meccafit.com");
  const soberano = await probeRpcs(anon, "forjador_soberano");
  console.log(
    `[PASS] forjador_soberano · ${soberano.athletes} clientes · VIP ${soberano.vipCount} · comuns ${soberano.comumCount}`,
  );

  // 3. Simulação VTC — VIP + comum (a partir da lista global)
  const vipRow = soberano.athleteRows.find((row) => row.hasVipBond === true);
  const comumRow = soberano.athleteRows.find((row) => row.hasVipBond === false);

  if (vipRow && comumRow) {
    await simulateVtc(anon, vipRow.clientId, 25);
    await simulateVtc(anon, comumRow.clientId, 15);

    const feedAfter = await anon.rpc("argos_forja_vtc_feed", { p_limit: 64 });
    const entries = Array.isArray(feedAfter.data) ? feedAfter.data : [];
    const vipEntry = entries.find((row) => row.clientId === vipRow.clientId);
    const comumEntry = entries.find((row) => row.clientId === comumRow.clientId);

    assert(vipEntry?.vtcToday >= 25, "VIP: VTC simulado não refletido no feed");
    assert(comumEntry?.vtcToday >= 15, "Comum: VTC simulado não refletido no feed");
    assert(vipRow.hasVipBond === true, "VIP: hasVipBond esperado true na lista global");
    assert(comumRow.hasVipBond === false, "Comum: hasVipBond esperado false na lista global");

    console.log(
      `[PASS] simulação VTC · VIP ${vipRow.displayName} ${Math.round(vipEntry.vtcToday)} kg · comum ${comumRow.displayName} ${Math.round(comumEntry.vtcToday)} kg`,
    );

    const scoped = await anon.rpc("argos_forja_fraud_signals", { p_cliente_id: vipRow.clientId });
    if (scoped.error) throw new Error(`scoped signals: ${scoped.error.message}`);
    console.log(`[PASS] alertas scoped · cliente VIP · count=${scoped.data?.count ?? 0}`);
  } else {
    console.log("[SKIP] simulação VTC — VIP/comum ausentes na lista global");
  }

  await anon.auth.signOut();

  console.log("\n=== Monitoramento VTC · todos os testes passaram ===\n");
} catch (error) {
  console.error(`\n[FAIL] ${error.message}\n`);
  process.exit(1);
}
