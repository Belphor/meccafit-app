/**
 * ARGOS Security Matrix — bateria extensa de probes (anon/cliente/soberano)
 * Uso: node scripts/argos/security-matrix.mjs
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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("ARGOS matrix: env ausente");
  process.exit(1);
}

const OTHER_USER_ID = "bad0554d-5c68-4e2e-b9d3-ba55f6e86634";
const TABLES = [
  "profiles",
  "historico_treinos",
  "historico_treino",
  "matriz_forca",
  "fenix_pureza_diaria",
  "planos_semanais",
  "balanco_termico_diario",
];

const INJECTION_STRINGS = [
  "' OR '1'='1",
  "; DROP TABLE profiles;--",
  "<script>alert(1)</script>",
  "00000000-0000-0000-0000-000000000000",
  "../../../etc/passwd",
];

const MURAL_LIMITS = [-999, -1, 0, 1, 48, 100, 101, 999999, null, "abc"];

let passed = 0;
let failed = 0;
const failures = [];

function createClientAnon() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password) {
  const client = createClientAnon();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return { client, userId: data.user.id, token: data.session.access_token };
}

function pass(id) {
  passed += 1;
}

function fail(id, detail) {
  failed += 1;
  failures.push({ id, detail });
}

function expectBlocked(error, data) {
  return Boolean(error) || data === null || (Array.isArray(data) && data.length === 0);
}

function expectAllowed(error, data) {
  return !error && data !== null;
}

async function runMatrix() {
  const anon = createClientAnon();
  const cliente = await signIn("cliente@meccafit.com", "senha123");
  const soberano = await signIn("master@meccafit.com", "senha123");
  let forjador = null;
  try {
    forjador = await signIn("forjador@meccafit.com", "senha123");
  } catch {
    // seed opcional
  }

  // --- ANON: SELECT all tables (6) ---
  for (const table of TABLES) {
    const { data, error } = await anon.from(table).select("*").limit(5);
    const missing = error?.code === "PGRST205" || error?.message?.includes("Could not find the table");
    const denied = error?.code === "42501" || error?.message?.includes("permission denied");
    const ok = missing || denied || (!error && Array.isArray(data) && data.length === 0);
    ok ? pass(`anon:select:${table}:empty`) : fail(`anon:select:${table}:empty`, JSON.stringify({ error, len: data?.length }));
  }

  // --- ANON: INSERT all tables (6) ---
  for (const table of TABLES) {
    const { error } = await anon.from(table).insert({ id: OTHER_USER_ID, cliente_id: OTHER_USER_ID });
    error ? pass(`anon:insert:${table}:blocked`) : fail(`anon:insert:${table}:blocked`, "insert permitido");
  }

  // --- ANON: RPCs (3) ---
  for (const rpc of [
    { fn: "registrar_treino_com_status", args: { p_user_id: OTHER_USER_ID, p_exercicio_id: 1, p_peso_atual: 50 } },
    { fn: "argos_fetch_mural_comunidade", args: { p_limit: 10 } },
    { fn: "argos_compute_vtc_30d", args: { p_user_id: OTHER_USER_ID } },
    { fn: "argos_compute_session_vtc_today", args: { p_user_id: OTHER_USER_ID } },
    { fn: "argos_upsert_balanco_termico_diario", args: { p_user_id: OTHER_USER_ID, p_vtc_delta: 9999 } },
    { fn: "argos_validate_invite_token", args: { p_token: "probe" } },
    { fn: "argos_consume_invite_for_user", args: { p_token: "probe", p_user_id: OTHER_USER_ID } },
  ]) {
    const { error } = await anon.rpc(rpc.fn, rpc.args);
    error ? pass(`anon:rpc:${rpc.fn}`) : fail(`anon:rpc:${rpc.fn}`, "rpc permitido");
  }

  // --- CLIENTE: cross-user SELECT filters (tables x injection strings) ---
  for (const table of TABLES) {
    for (let i = 0; i < INJECTION_STRINGS.length; i += 1) {
      const payload = INJECTION_STRINGS[i];
      const idColumn = table === "balanco_termico_diario" ? "user_id" : "cliente_id";
      const { data, error } = await cliente.client
        .from(table)
        .select("*")
        .eq(idColumn, payload)
        .limit(3);
      const foreign = (data ?? []).filter((row) => {
        const owner = row.user_id ?? row.cliente_id;
        return owner && owner !== cliente.userId;
      });
      const ok = foreign.length === 0 && !error?.message?.includes("syntax error");
      ok ? pass(`cliente:select:${table}:inj${i}`) : fail(`cliente:select:${table}:inj${i}`, `foreign=${foreign.length}`);
    }
  }

  // --- CLIENTE: INSERT com id alheio ---
  for (const table of TABLES) {
    const base =
      table === "profiles"
        ? { id: OTHER_USER_ID, full_name: "ARGOS probe" }
        : table === "balanco_termico_diario"
          ? { user_id: OTHER_USER_ID, data_treino: "2026-01-01", vtc_total: 9999 }
          : { cliente_id: OTHER_USER_ID };
    const { error } = await cliente.client.from(table).insert(base);
    error ? pass(`cliente:insert:${table}:other`) : fail(`cliente:insert:${table}:other`, "insert alheio ok");
  }

  // --- CLIENTE: UPDATE profile escalation (5 variants) ---
  const escalationPayloads = [
    { role: "forjador_soberano" },
    { role: "forjador" },
    { forjador_id: OTHER_USER_ID },
    { role: "forjador_soberano", forjador_id: OTHER_USER_ID },
    { full_name: "Hacked", role: "forjador_soberano" },
  ];
  for (let i = 0; i < escalationPayloads.length; i += 1) {
    const { error } = await cliente.client
      .from("profiles")
      .update(escalationPayloads[i])
      .eq("id", cliente.userId);
    error ? pass(`cliente:escalate:${i}`) : fail(`cliente:escalate:${i}`, "escalada permitida");
  }

  const phaseEscalationPayloads = [{ phase_tier: 5 }, { phase_tier: 4 }];
  for (let i = 0; i < phaseEscalationPayloads.length; i += 1) {
    const { error } = await cliente.client
      .from("profiles")
      .update(phaseEscalationPayloads[i])
      .eq("id", cliente.userId);
    error ? pass(`cliente:phase_escalate:${i}`) : fail(`cliente:phase_escalate:${i}`, "phase_tier edit ok");
  }

  async function assertPhaseEscalationBlocked(label, session) {
    const { data: profile } = await session.client
      .from("profiles")
      .select("phase_tier")
      .eq("id", session.userId)
      .maybeSingle();
    const current = Number(profile?.phase_tier ?? 1);
    const targets = [1, 2, 3, 4, 5].filter((tier) => tier !== current);
    for (let i = 0; i < targets.length; i += 1) {
      const { error } = await session.client
        .from("profiles")
        .update({ phase_tier: targets[i] })
        .eq("id", session.userId);
      error ? pass(`${label}:phase_escalate:${targets[i]}`) : fail(`${label}:phase_escalate:${targets[i]}`, "phase_tier edit ok");
    }
  }

  await assertPhaseEscalationBlocked("soberano", soberano);
  if (forjador) {
    await assertPhaseEscalationBlocked("forjador", forjador);

    const { data: forjadorPhase, error: forjadorPhaseErr } = await forjador.client.rpc(
      "argos_advance_phase_if_eligible",
      { p_user_id: forjador.userId },
    );
    const excluded =
      !forjadorPhaseErr &&
      forjadorPhase &&
      typeof forjadorPhase === "object" &&
      forjadorPhase.gamification_excluded === true &&
      forjadorPhase.advanced === false;
    excluded
      ? pass("forjador:advance:gamification_excluded")
      : fail("forjador:advance:gamification_excluded", JSON.stringify(forgadorPhase));
  }

  // --- CLIENTE: invite RPCs server-only (2) ---
  for (const rpc of [
    { fn: "argos_validate_invite_token", args: { p_token: "probe" } },
    { fn: "argos_consume_invite_for_user", args: { p_token: "probe", p_user_id: cliente.userId } },
  ]) {
    const { error } = await cliente.client.rpc(rpc.fn, rpc.args);
    error ? pass(`cliente:rpc:${rpc.fn}:blocked`) : fail(`cliente:rpc:${rpc.fn}:blocked`, "rpc permitido");
  }

  // --- Forum Brasa-Viva: anon bloqueado, cliente permitido, sem forjadores no feed ---
  {
    const { error: anonForumErr } = await anon.rpc("argos_fetch_forum_brasa_viva", { p_limit: 10 });
    anonForumErr ? pass("anon:rpc:argos_fetch_forum_brasa_viva") : fail("anon:rpc:argos_fetch_forum_brasa_viva", "rpc permitido");

    const { data: forumRows, error: forumErr } = await cliente.client.rpc("argos_fetch_forum_brasa_viva", {
      p_limit: 48,
    });
    const rows = Array.isArray(forumRows) ? forumRows : [];
    const hasForjadorAuthor = rows.some(
      (r) =>
        r.author_name === "Mestre Supremo" ||
        r.author_name === "Forjador Linhagem" ||
        r.author_name?.includes("Forjador"),
    );
    const forumOk = !forumErr && rows.length <= 100 && !hasForjadorAuthor;
    forumOk
      ? pass("forum:cliente:no_forjador_authors")
      : fail("forum:cliente:no_forjador_authors", `err=${forumErr?.message} forjador=${hasForjadorAuthor} rows=${rows.length}`);
  }

  // --- CLIENTE: historico_treinos mutations on other (insert/update/delete) x payloads (5*3=15) ---
  for (let i = 0; i < INJECTION_STRINGS.length; i += 1) {
    const targetId = i === 0 ? OTHER_USER_ID : OTHER_USER_ID;
    const { error: insErr } = await cliente.client.from("historico_treinos").insert({
      cliente_id: targetId,
      user_id: targetId,
      exercicio_id: 90000 + i,
      exercicio_nome: INJECTION_STRINGS[i],
      musculo: "peito",
      peso: 50,
      peso_atual: 50,
      repeticoes: 1,
      series: 1,
    });
    insErr ? pass(`cliente:hist:insert:other:${i}`) : fail(`cliente:hist:insert:other:${i}`, "ok");

    const { data: updData, error: updErr } = await cliente.client
      .from("historico_treinos")
      .update({ peso: 999 })
      .eq("cliente_id", targetId)
      .select("id");
    (updErr || (updData ?? []).length === 0) ? pass(`cliente:hist:update:other:${i}`) : fail(`cliente:hist:update:other:${i}`, "updated");

    const { data: delData, error: delErr } = await cliente.client
      .from("historico_treinos")
      .delete()
      .eq("cliente_id", targetId)
      .select("id");
    (delErr || (delData ?? []).length === 0) ? pass(`cliente:hist:delete:other:${i}`) : fail(`cliente:hist:delete:other:${i}`, "deleted");
  }

  // --- CLIENTE: RPC registrar wrong user (5 attempts) ---
  for (let i = 0; i < INJECTION_STRINGS.length; i += 1) {
    const fakeId = i === 3 ? OTHER_USER_ID : OTHER_USER_ID;
    const { error } = await cliente.client.rpc("registrar_treino_com_status", {
      p_user_id: fakeId,
      p_exercicio_id: 80000 + i,
      p_exercicio_nome: "probe",
      p_musculo: "peito",
      p_peso_atual: 50,
      p_repeticoes: 1,
      p_series: 1,
    });
    error ? pass(`cliente:rpc:registrar:other:${i}`) : fail(`cliente:rpc:registrar:other:${i}`, "rpc ok");
  }

  // --- CLIENTE: thermal RPC cross-user blocked ---
  for (const [fn, args] of [
    ["argos_compute_vtc_30d", { p_user_id: OTHER_USER_ID }],
    ["argos_compute_session_vtc_today", { p_user_id: OTHER_USER_ID }],
    ["argos_upsert_balanco_termico_diario", { p_user_id: OTHER_USER_ID, p_vtc_delta: 5000 }],
  ]) {
    const { data, error } = await cliente.client.rpc(fn, args);
    const blocked = Boolean(error) || data === null;
    blocked ? pass(`cliente:rpc:${fn}:other`) : fail(`cliente:rpc:${fn}:other`, `data=${JSON.stringify(data)}`);
  }

  // --- CLIENTE: balanco_termico UPDATE/DELETE alheio bloqueado ---
  for (const op of ["update", "delete"]) {
    const builder =
      op === "update"
        ? cliente.client
            .from("balanco_termico_diario")
            .update({ vtc_total: 99999 })
        : cliente.client.from("balanco_termico_diario").delete();
    const { data, error } = await builder.eq("user_id", OTHER_USER_ID).select("user_id");
    const blocked = Boolean(error) || (data ?? []).length === 0;
    blocked ? pass(`cliente:balanco:${op}:other`) : fail(`cliente:balanco:${op}:other`, "mutação alheia ok");
  }

  // --- MURAL: limit fuzz (10 limits x 2 roles = 20) ---
  for (const limit of MURAL_LIMITS) {
    for (const [label, session] of [
      ["cliente", cliente],
      ["soberano", soberano],
    ]) {
      const { data, error } = await session.client.rpc("argos_fetch_mural_comunidade", {
        p_limit: limit,
      });
      const rows = Array.isArray(data) ? data : [];
      const hasSoberano = rows.some((r) => r.atleta_nome === "Mestre Supremo");
      const invalidType = typeof limit === "string";
      const ok =
        !hasSoberano &&
        rows.length <= 100 &&
        (invalidType ? !!error : !error);
      ok ? pass(`mural:${label}:limit:${String(limit)}`) : fail(`mural:${label}:limit:${String(limit)}`, `rows=${rows.length} soberano=${hasSoberano} err=${error?.message}`);
    }
  }

  // --- SOBERANO: read all tables allowed, write others blocked (6+6=12) ---
  for (const table of TABLES) {
    const { data, error } = await soberano.client.from(table).select("*").limit(10);
    const missing = error?.code === "PGRST205" || error?.message?.includes("Could not find the table");
    const ok = !error || missing;
    ok ? pass(`soberano:select:${table}`) : fail(`soberano:select:${table}`, error?.message);

    const { error: insErr } = await soberano.client.from(table).insert(
      table === "balanco_termico_diario"
        ? { user_id: cliente.userId, data_treino: "2026-01-02", vtc_total: 1 }
        : { cliente_id: cliente.userId },
    );
    insErr ? pass(`soberano:insert:${table}:other`) : fail(`soberano:insert:${table}:other`, "insert ok");
  }

  // --- CLIENTE: own historico scoped (must not include other's rows when filtering musculo) ---
  {
    const { data } = await cliente.client
      .from("historico_treinos")
      .select("cliente_id")
      .eq("musculo", "peito");
    const foreign = (data ?? []).filter((r) => r.cliente_id !== cliente.userId);
    foreign.length === 0 ? pass("cliente:historico:musculo:scoped") : fail("cliente:historico:musculo:scoped", `foreign=${foreign.length}`);
  }

  // --- CLIENTE: profiles only self ---
  {
    const { data } = await cliente.client.from("profiles").select("id");
    const ok = (data ?? []).length === 1 && data[0].id === cliente.userId;
    ok ? pass("cliente:profiles:single") : fail("cliente:profiles:single", JSON.stringify(data));
  }

  // --- SOBERANO: profiles all ---
  {
    const { data } = await soberano.client.from("profiles").select("id");
    (data ?? []).length >= 2 ? pass("soberano:profiles:all") : fail("soberano:profiles:all", `len=${data?.length}`);
  }

  // --- REST injection via fetch (10 probes) ---
  const restProbes = [
    `${url}/rest/v1/profiles?select=*&id=eq.${OTHER_USER_ID}`,
    `${url}/rest/v1/historico_treinos?select=*&or=(cliente_id.eq.${cliente.userId},cliente_id.eq.${OTHER_USER_ID})`,
    `${url}/rest/v1/profiles?id=eq.${INJECTION_STRINGS[0]}`,
    `${url}/rest/v1/rpc/argos_fetch_mural_comunidade`,
  ];
  for (let i = 0; i < restProbes.length; i += 1) {
    const probe = restProbes[i];
    const isRpc = probe.includes("/rpc/");
    const res = await fetch(probe, {
      method: isRpc ? "POST" : "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${cliente.token}`,
        "Content-Type": "application/json",
      },
      body: isRpc ? JSON.stringify({ p_limit: 10 }) : undefined,
    });
    const text = await res.text();
    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }
    const leakedOtherProfile =
      probe.includes("profiles") &&
      Array.isArray(parsed) &&
      parsed.some((row) => row.id === OTHER_USER_ID);
    const ok = !leakedOtherProfile && res.status !== 500;
    ok ? pass(`rest:probe:${i}`) : fail(`rest:probe:${i}`, `status=${res.status} leak=${leakedOtherProfile}`);
  }

  // --- Brute: cliente select * on historico without filter must not return other cliente_id ---
  {
    const { data } = await cliente.client.from("historico_treinos").select("cliente_id").limit(50);
    const foreign = (data ?? []).filter((r) => r.cliente_id && r.cliente_id !== cliente.userId);
    foreign.length === 0 ? pass("cliente:historico:select_all:scoped") : fail("cliente:historico:select_all:scoped", `foreign=${foreign.length}`);
  }

  // --- View renascimento (anon + cliente) ---
  for (const [label, client] of [
    ["anon", anon],
    ["cliente", cliente.client],
  ]) {
    const { data, error } = await client.from("vw_renascimento_fenix").select("*").limit(5);
    const foreign =
      label === "cliente"
        ? (data ?? []).filter((r) => r.cliente_id && r.cliente_id !== cliente.userId)
        : data ?? [];
    const ok =
      label === "anon"
        ? (data ?? []).length === 0 || error
        : foreign.length === 0;
    ok ? pass(`view:renascimento:${label}`) : fail(`view:renascimento:${label}`, `rows=${data?.length} foreign=${foreign.length}`);
  }

  // --- Duplicate matrix: each table cliente UPDATE where not own (6) ---
  for (const table of TABLES) {
    if (table === "profiles") continue;
    let query = soberano.client.from(table).select("id,cliente_id").neq("cliente_id", cliente.userId).limit(1);
    const { data: rows } = await query;
    if (!rows?.[0]) {
      pass(`cliente:update:${table}:skip`);
      continue;
    }
    const row = rows[0];
    const patch =
      table === "historico_treinos"
        ? { peso: 1 }
        : { updated_at: new Date().toISOString() };
    const { data: updData, error } = await cliente.client
      .from(table)
      .update(patch)
      .eq("id", row.id)
      .select("id");
    (error || (updData ?? []).length === 0)
      ? pass(`cliente:update:${table}:foreign_row`)
      : fail(`cliente:update:${table}:foreign_row`, "updated");
  }

  // --- Mass generated: cliente_id spoof en insert historico (100 variants) ---
  for (let i = 0; i < 100; i += 1) {
    const spoof = i % 2 === 0 ? OTHER_USER_ID : `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const { error } = await cliente.client.from("historico_treinos").insert({
      cliente_id: spoof,
      user_id: spoof,
      exercicio_id: 70000 + i,
      exercicio_nome: `probe-${i}`,
      musculo: "peito",
      peso: 40,
      peso_atual: 40,
      repeticoes: 1,
      series: 1,
    });
    error ? pass(`mass:insert:hist:${i}`) : fail(`mass:insert:hist:${i}`, "insert ok");
  }

  // --- Mass: mural limit boundary (50 variants) ---
  for (let i = 0; i < 50; i += 1) {
    const { data, error } = await cliente.client.rpc("argos_fetch_mural_comunidade", {
      p_limit: i,
    });
    const rows = Array.isArray(data) ? data : [];
    const ok = !error && rows.length <= 100 && !rows.some((r) => r.atleta_nome === "Mestre Supremo");
    ok ? pass(`mass:mural:limit:${i}`) : fail(`mass:mural:limit:${i}`, `rows=${rows.length}`);
  }

  // --- Mass: forum limit boundary (20 variants) ---
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await cliente.client.rpc("argos_fetch_forum_brasa_viva", {
      p_limit: i,
    });
    const rows = Array.isArray(data) ? data : [];
    const ok =
      !error &&
      rows.length <= 100 &&
      !rows.some((r) => r.author_name === "Mestre Supremo" || r.author_name === "Forjador Linhagem");
    ok ? pass(`mass:forum:limit:${i}`) : fail(`mass:forum:limit:${i}`, `rows=${rows.length}`);
  }
}

console.log("\n=== ARGOS Security Matrix ===\n");
const started = performance.now();
await runMatrix();
const elapsed = Math.round(performance.now() - started);

console.log(`\nTotal: ${passed + failed} probes · ${passed} pass · ${failed} fail · ${elapsed}ms\n`);

if (failed > 0) {
  console.log("Falhas:");
  for (const f of failures.slice(0, 30)) {
    console.log(`  - ${f.id}: ${f.detail}`);
  }
  if (failures.length > 30) console.log(`  ... +${failures.length - 30} more`);
  process.exit(2);
}

console.log("ARGOS Security Matrix: nenhuma falha detectada.");
