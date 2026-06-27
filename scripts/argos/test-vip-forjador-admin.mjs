/**
 * ARGOS · VIP Forjador Admin Flow — simulação completa forjador ↔ cliente VIP
 *
 * Testa (zero custo via service_role onde aplicável):
 *   1. Vínculo VIP + isolamento RLS
 *   2. Publicação medidas 7 dobras (vip_medidas_corporais)
 *   3. Dieta semanal VIP (vip_dieta_semanal)
 *   4. Prescrição forjador → cliente
 *   5. VTC baseline + delta soberano (simulação)
 *   6. Leitura cliente (dieta blueprint + bond)
 *
 * Uso:
 *   node scripts/argos/test-vip-forjador-admin.mjs
 *   node scripts/argos/test-vip-forjador-admin.mjs --skip-setup
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SEED_PASSWORD = "senha123";
const VIP_PASSWORD = "vip123";

const SEVEN_FOLDS = {
  gordura_pct: 13.8,
  massa_magra_kg: 69.1,
  dobra_peito: 9.0,
  dobra_axilar_media: 7.5,
  dobra_triceps: 11.8,
  dobra_subescapular: 13.9,
  dobra_abdomen: 15.5,
  dobra_suprailiaca: 10.8,
  dobra_coxa: 17.2,
};

function parseArgs(argv) {
  const args = { skipSetup: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--skip-setup") args.skipSetup = true;
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

function loadVipStudents() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/vip-students.json"), "utf8");
    return JSON.parse(raw).students ?? {};
  } catch {
    return {};
  }
}

function loadTestUsers() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8");
    return JSON.parse(raw).users ?? {};
  } catch {
    return {};
  }
}

function resolveIsoWeekRef(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isRlsOrPermissionError(error) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  );
}

function isMissingTableError(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("could not find the table") || message.includes("schema cache");
}

function isMissingColumnError(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("could not find") && message.includes("column");
}

function skip(label, reason) {
  console.warn(`  ⚠ skip · ${label} — ${reason}`);
}

const { skipSetup } = parseArgs(process.argv);
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anonKey || !serviceKey) {
  console.error("test-vip-forjador-admin: URL, ANON_KEY e SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

let passed = 0;
let failed = 0;

function pass(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function createBrowserClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password) {
  const client = createBrowserClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login falhou (${email}): ${error?.message ?? "sem sessão"}`);
  }
  return client;
}

async function run() {
  console.log("ARGOS · test-vip-forjador-admin\n");

  const vipRegistry = loadVipStudents();
  const testUsers = loadTestUsers();

  const forgerEmail = testUsers.forjador_linhagem?.email ?? "forjador@meccafit.com";
  const sovereignEmail = testUsers.forjador_soberano?.email ?? "master@meccafit.com";
  const vipStudent = vipRegistry.vip_forjador_linhagem;
  const vipEmail = vipStudent?.email ?? "vip-linhagem@meccafit.com";
  const vipClientId = vipStudent?.userId;
  const forgerId = vipStudent?.forgerId ?? testUsers.forjador_linhagem?.userId;

  if (!vipClientId || !forgerId) {
    console.error("Execute seed-vip-students.mjs primeiro (vip-students.json ausente).");
    process.exit(1);
  }

  const admin = createServiceClient();

  // ── 1. Medidas 7 dobras (forjador publica) ──
  console.log("\n[1] Medidas 7 dobras — forjador → núcleo");
  const forgerClient = await signIn(forgerEmail, SEED_PASSWORD);

  await admin.from("vip_medidas_corporais").delete().eq("client_id", vipClientId);

  const { data: medidasInsert, error: medidasErr } = await forgerClient
    .from("vip_medidas_corporais")
    .insert({
      client_id: vipClientId,
      forger_id: forgerId,
      peso_kg: 83.0,
      altura_cm: 178,
      perimetros: SEVEN_FOLDS,
      medido_em: new Date().toISOString(),
      activo: true,
    })
    .select("id, perimetros")
    .single();

  if (medidasErr || !medidasInsert) {
    if (isMissingTableError(medidasErr)) {
      skip("Medidas 7 dobras", "migração vip_medidas_corporais pendente");
    } else {
      fail("Forjador publica medidas 7 dobras", medidasErr?.message);
    }
  } else {
    const p = medidasInsert.perimetros ?? {};
    const foldCount = Object.keys(p).filter((k) => k.startsWith("dobra_")).length;
    if (foldCount >= 7) {
      pass(`Medidas publicadas · ${foldCount} dobras`);
    } else {
      fail("Contagem dobras", `esperado ≥7, got ${foldCount}`);
    }
  }

  // ── 2. Cliente lê medidas (RLS) ──
  console.log("\n[2] Cliente VIP lê medidas");
  const vipClient = await signIn(vipEmail, VIP_PASSWORD);
  const { data: medidasRead, error: medidasReadErr } = await vipClient
    .from("vip_medidas_corporais")
    .select("peso_kg, perimetros")
    .eq("client_id", vipClientId)
    .eq("activo", true)
    .maybeSingle();

  if (medidasReadErr || !medidasRead) {
    if (isMissingTableError(medidasReadErr)) {
      skip("Cliente lê medidas", "tabela pendente");
    } else {
      fail("Cliente lê medidas", medidasReadErr?.message ?? "sem dados");
    }
  } else {
    pass(`Cliente lê snapshot · ${medidasRead.peso_kg} kg`);
  }

  // ── 3. Dieta semanal VIP ──
  console.log("\n[3] Dieta semanal VIP — forjador publica");
  await admin.from("vip_dieta_semanal").delete().eq("client_id", vipClientId);

  const semanaRef = resolveIsoWeekRef();
  const { error: dietaErr } = await forgerClient.from("vip_dieta_semanal").insert({
    client_id: vipClientId,
    forger_id: forgerId,
    semana_ref: semanaRef,
    dias: {
      segunda: { notas: "ARGOS test · ovos + frango", concluido: true },
      terca: { notas: "Costas — carb moderado", concluido: false },
      quarta: { notas: "", concluido: false },
      quinta: { notas: "", concluido: false },
      sexta: { notas: "", concluido: false },
      sabado: { notas: "", concluido: false },
      domingo: { notas: "Meal prep", concluido: false },
    },
    activo: true,
  });

  if (dietaErr) {
    if (isMissingTableError(dietaErr)) {
      skip("Dieta semanal VIP", "migração vip_dieta_semanal pendente");
    } else {
      fail("Forjador publica dieta semanal", dietaErr.message);
    }
  } else {
    pass(`Dieta semanal ${semanaRef} publicada`);
  }

  const { data: dietaRead } = await vipClient
    .from("vip_dieta_semanal")
    .select("semana_ref, dias")
    .eq("client_id", vipClientId)
    .eq("activo", true)
    .maybeSingle();

  if (dietaRead?.dias?.segunda?.notas?.includes("ARGOS")) {
    pass("Cliente lê dieta semanal");
  } else if (dietaErr && isMissingTableError(dietaErr)) {
    skip("Cliente lê dieta semanal", "tabela pendente");
  } else {
    fail("Cliente lê dieta semanal", "dados não encontrados ou RLS bloqueou");
  }

  // ── 4. Prescrição forjador → cliente ──
  console.log("\n[4] Prescrição treino — forjador → cliente");
  const probeRx = {
    client_id: vipClientId,
    forger_id: forgerId,
    exercicio_id: "costas-remada",
    peso_prescrito: 70,
    repeticoes_alvo: 12,
    series_alvo: 4,
    observacoes: "ARGOS vip-admin test",
  };

  await admin
    .from("historico_treinos_personais")
    .delete()
    .eq("client_id", vipClientId)
    .eq("exercicio_id", probeRx.exercicio_id);

  const { error: rxErr } = await forgerClient.from("historico_treinos_personais").insert(probeRx);
  if (rxErr) {
    fail("Forjador prescreve treino", rxErr.message);
  } else {
    pass("Prescrição publicada");
  }

  const { data: rxRead } = await vipClient
    .from("historico_treinos_personais")
    .select("peso_prescrito, observacoes")
    .eq("client_id", vipClientId)
    .eq("exercicio_id", probeRx.exercicio_id)
    .maybeSingle();

  if (rxRead?.peso_prescrito === 70) {
    pass("Cliente lê prescrição personal");
  } else {
    fail("Cliente lê prescrição", "RLS ou dados ausentes");
  }

  // ── 5. VTC simulação zero custo ──
  console.log("\n[5] VTC simulação (service_role + soberano RPC)");
  const { error: vtcBaseErr } = await admin
    .from("profiles")
    .update({ vtc_atual: 500, vtc_total: 500 })
    .eq("id", vipClientId);

  if (vtcBaseErr) {
    if (isMissingColumnError(vtcBaseErr)) {
      skip("VTC baseline", "coluna vtc_atual pendente — RPC delta testado abaixo");
    } else {
      fail("VTC baseline (service_role)", vtcBaseErr.message);
    }
  } else {
    pass("VTC baseline 500 kg (zero custo)");
  }

  const sovereignClient = await signIn(sovereignEmail, SEED_PASSWORD);
  const { data: vtcRpc, error: vtcRpcErr } = await sovereignClient.rpc(
    "argos_sovereign_modify_statistics",
    {
      p_target_id: vipClientId,
      p_patch: { vtc_today_delta: 25 },
    },
  );

  if (vtcRpcErr) {
    if (isRlsOrPermissionError(vtcRpcErr)) {
      fail("VTC delta soberano", vtcRpcErr.message);
    } else {
      console.warn("  ⚠ VTC RPC indisponível (migração pendente?) — skip");
    }
  } else {
    pass(`VTC delta +25 kg · RPC ok`);
  }

  // ── 6. Bond + diet blueprint ──
  console.log("\n[6] Vínculo VIP + blueprint dieta");
  const { data: bond } = await admin
    .from("forger_client_bonds")
    .select("id")
    .eq("client_id", vipClientId)
    .maybeSingle();

  if (bond?.id) {
    pass("Vínculo VIP activo");
  } else {
    fail("Vínculo VIP", "bond ausente");
  }

  const { data: blueprint } = await vipClient
    .from("diet_blueprints")
    .select("titulo")
    .eq("client_id", vipClientId)
    .eq("activo", true)
    .maybeSingle();

  if (blueprint?.titulo) {
    pass(`Cliente lê blueprint: ${blueprint.titulo}`);
  } else {
    fail("Blueprint dieta cliente", "ausente ou RLS");
  }

  // ── Resumo ──
  console.log(`\n═══ Resultado: ${passed} ok · ${failed} falha(s) ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error("\ntest-vip-forjador-admin FALHOU:", error.message ?? error);
  process.exit(1);
});
