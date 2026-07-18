/**
 * TESTE — cria um 2º cliente VIP dedicado a testar o botão "Pular apresentação".
 * Reutiliza o forjador de teste (cria se faltar) e vincula um novo VIP.
 * A conta nasce em 1ª visita (has_accepted_terms=false) para que a tela de
 * Diretrizes (com o botão "Pular apresentação") apareça no 1º login.
 *
 * Uso: node scripts/seed-vip-pular.mjs
 *
 * Credenciais:
 *   Forjador: forjador-teste@meccafit.com / senha123
 *   VIP:      vip-pular@meccafit.com      / vip123
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";
import { ensurePlanilhasForAtletaProbe } from "./lib/planilhas-seed.mjs";
import { assertAllowSeedTestUsers } from "./lib/seed-credentials.mjs";

assertAllowSeedTestUsers("seed-vip-pular");

const env = loadEnvLocal();
requireEnv(env, [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FORJADOR = {
  email: "forjador-teste@meccafit.com",
  password: "senha123",
  metadata: {
    full_name: "Forjador Teste",
    data_nascimento: "1987-07-01",
    role: "forjador",
    nome_linhagem: "Forja de Teste",
  },
};

const VIP = {
  email: "vip-pular@meccafit.com",
  password: "vip123",
  metadata: {
    full_name: "Atleta VIP · Pular",
    data_nascimento: "1993-09-08",
    role: "cliente",
    nome_linhagem: "Linhagem VIP · Pular Apresentação",
    // 1ª visita → Diretrizes + botão "Pular apresentação" aparecem no 1º login.
    has_accepted_terms: false,
  },
  vtcBaseline: 980,
};

async function ensureUser(account) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase(),
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: account.metadata,
    });
    if (error) throw error;
    console.log(`OK · atualizado: ${account.email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: account.metadata,
  });
  if (error) throw error;
  console.log(`OK · criado: ${account.email}`);
  return data.user.id;
}

async function setForjadorRole(userId) {
  const { error } = await admin.rpc("argos_bootstrap_forjador", { p_user_id: userId });
  if (error?.code === "PGRST202") {
    const { error: fb } = await admin.from("profiles").update({ role: "forjador" }).eq("id", userId);
    if (fb) throw fb;
    return;
  }
  if (error) throw error;
}

async function resetFirstRun(userId) {
  // Zera o pós-cerimônia no banco (identidade/tour) para reteste limpo.
  await admin
    .from("profiles")
    .update({
      perfil_identidade_confirmada: false,
      anima_portal_visto: false,
      ecossistema_tour_concluido: false,
      sexo: null,
    })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) console.warn("reset first-run (profiles):", error.message);
    });
}

async function main() {
  console.log("seed-vip-pular · projeto:", url, "\n");

  const forjadorId = await ensureUser(FORJADOR);
  await setForjadorRole(forjadorId);
  console.log(`OK · role forjador → ${FORJADOR.email}`);

  const vipId = await ensureUser(VIP);
  await admin.from("profiles").update({ role: "cliente" }).eq("id", vipId);
  await resetFirstRun(vipId);

  await admin
    .from("profiles")
    .update({ status_altar: "Ativo" })
    .eq("id", vipId)
    .then(({ error }) => {
      if (error && !error.message.includes("permission")) console.warn("status_altar:", error.message);
    });
  await admin
    .from("profiles")
    .update({ vtc_atual: VIP.vtcBaseline, vtc_total: VIP.vtcBaseline })
    .eq("id", vipId)
    .then(({ error }) => {
      if (error && !error.message.includes("Could not find")) console.warn("vtc:", error.message);
    });

  // Vínculo forjador ↔ VIP (torna o cliente VIP de fato).
  await admin.from("forger_client_bonds").delete().eq("client_id", vipId);
  const { data: bond, error: bondErr } = await admin
    .from("forger_client_bonds")
    .insert({ forger_id: forjadorId, client_id: vipId })
    .select("id")
    .single();
  if (bondErr) throw bondErr;
  console.log(`OK · vínculo VIP ${bond.id.slice(0, 8)}…`);

  // Planilha Seg–Sáb para o dashboard ter conteúdo após pular.
  const planilha = await ensurePlanilhasForAtletaProbe({ admin, url, anonKey, atletaId: vipId });
  console.log(`OK · planilha (${planilha.count}/6) · ${planilha.attempts.join(" · ")}`);

  console.log("\n=== VIP (Pular apresentação) pronto ===");
  console.log(`  Forjador: ${FORJADOR.email} / ${FORJADOR.password}`);
  console.log(`  VIP:      ${VIP.email} / ${VIP.password}`);
  console.log("\nNo 1º login: tela de Diretrizes → botão 'Pular apresentação'.");
}

main().catch((err) => {
  console.error("\nseed-vip-pular FALHOU:", err.message ?? err);
  process.exit(1);
});
