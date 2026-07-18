/**
 * TESTE — cria 1 forjador + 1 cliente VIP vinculado, com dados completos
 * (planilha Seg–Sáb, dieta, prescrição, medidas 7 dobras, VTC).
 *
 * Uso: node scripts/seed-one-vip.mjs
 *
 * Credenciais:
 *   Forjador: forjador-teste@meccafit.com / senha123
 *   VIP:      vip-teste@meccafit.com      / vip123
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";
import { ensurePlanilhasForAtletaProbe } from "./lib/planilhas-seed.mjs";
import { assertAllowSeedTestUsers } from "./lib/seed-credentials.mjs";

assertAllowSeedTestUsers("seed-one-vip");

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

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
  email: "vip-teste@meccafit.com",
  password: "vip123",
  metadata: {
    full_name: "Atleta VIP Teste",
    data_nascimento: "1991-04-12",
    role: "cliente",
    nome_linhagem: "Linhagem VIP · Teste",
    // Diretrizes aparecem 1x no 1º login (igual ao cadastro público de cliente).
    has_accepted_terms: false,
  },
  diet: {
    titulo: "Recomposição Termogénica · Teste",
    objetivo: "recomposicao",
    calorias_alvo: 2400,
    proteinas_g: 180,
    carboidratos_g: 240,
    gorduras_g: 70,
    agua_litros: 3.5,
    observacoes: "VIP de teste — priorizar proteína pós-treino.",
    refeicoes: [
      {
        id: "cafe",
        nome: "Café da manhã",
        horario: "07:00",
        itens: [
          { alimento: "Ovos mexidos", quantidade: "3 un", calorias: 210, proteinas_g: 18 },
          { alimento: "Aveia", quantidade: "60g", calorias: 230, proteinas_g: 8 },
        ],
      },
      {
        id: "almoco",
        nome: "Almoço",
        horario: "12:30",
        itens: [
          { alimento: "Frango grelhado", quantidade: "200g", calorias: 330, proteinas_g: 62 },
          { alimento: "Arroz integral", quantidade: "150g", calorias: 180, proteinas_g: 4 },
        ],
      },
      {
        id: "jantar",
        nome: "Jantar",
        horario: "20:30",
        itens: [
          { alimento: "Salmão", quantidade: "180g", calorias: 370, proteinas_g: 40 },
          { alimento: "Batata-doce", quantidade: "200g", calorias: 180, proteinas_g: 3 },
        ],
      },
    ],
  },
  rx: {
    exercicio_id: "peitoral-supino",
    peso_prescrito: 80,
    repeticoes_alvo: 10,
    series_alvo: 4,
    observacoes: "VIP Teste · Supino 80 kg",
  },
  medidas: {
    peso_kg: 82.5,
    altura_cm: 178,
    perimetros: {
      gordura_pct: 14.2,
      massa_magra_kg: 68.4,
      dobra_peito: 8.5,
      dobra_axilar_media: 7.2,
      dobra_triceps: 12.1,
      dobra_subescapular: 14.3,
      dobra_abdomen: 16.2,
      dobra_suprailiaca: 11.4,
      dobra_coxa: 18.5,
    },
  },
  dietaSemanal: {
    segunda: { notas: "Café: ovos + aveia · Almoço: frango + arroz", concluido: true },
    terca: { notas: "Costas — carboidrato moderado", concluido: false },
    quarta: { notas: "Pernas", concluido: false },
    quinta: { notas: "Ombros + braços", concluido: false },
    sexta: { notas: "Peito", concluido: false },
    sabado: { notas: "Cardio leve", concluido: false },
    domingo: { notas: "Descanso", concluido: false },
  },
  vtcBaseline: 1250,
};

async function ensureUser(account) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const existing = listed.users.find((u) => u.email?.toLowerCase() === account.email.toLowerCase());

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

async function main() {
  console.log("seed-one-vip · projeto:", url, "\n");

  const forjadorId = await ensureUser(FORJADOR);
  await setForjadorRole(forjadorId);
  console.log(`OK · role forjador → ${FORJADOR.email}`);

  const vipId = await ensureUser(VIP);
  await admin.from("profiles").update({ role: "cliente" }).eq("id", vipId);

  // Perfil ativo + VTC
  await admin.from("profiles").update({ status_altar: "Ativo" }).eq("id", vipId).then(({ error }) => {
    if (error && !error.message.includes("permission")) console.warn("status_altar:", error.message);
  });
  await admin.from("profiles").update({ vtc_atual: VIP.vtcBaseline, vtc_total: VIP.vtcBaseline }).eq("id", vipId).then(({ error }) => {
    if (error && !error.message.includes("Could not find")) console.warn("vtc:", error.message);
  });

  // Vínculo forjador ↔ VIP
  await admin.from("forger_client_bonds").delete().eq("client_id", vipId);
  const { data: bond, error: bondErr } = await admin
    .from("forger_client_bonds")
    .insert({ forger_id: forjadorId, client_id: vipId })
    .select("id")
    .single();
  if (bondErr) throw bondErr;
  console.log(`OK · vínculo VIP ${bond.id.slice(0, 8)}…`);

  // Planilha Seg–Sáb
  const planilha = await ensurePlanilhasForAtletaProbe({ admin, url, anonKey, atletaId: vipId });
  console.log(`OK · planilha (${planilha.count}/6) · ${planilha.attempts.join(" · ")}`);

  // Dieta blueprint
  await admin.from("diet_blueprints").delete().eq("client_id", vipId);
  const { error: dietErr } = await admin.from("diet_blueprints").insert({
    client_id: vipId,
    forger_id: forjadorId,
    titulo: VIP.diet.titulo,
    objetivo: VIP.diet.objetivo,
    calorias_alvo: VIP.diet.calorias_alvo,
    proteinas_g: VIP.diet.proteinas_g,
    carboidratos_g: VIP.diet.carboidratos_g,
    gorduras_g: VIP.diet.gorduras_g,
    agua_litros: VIP.diet.agua_litros,
    refeicoes: VIP.diet.refeicoes,
    observacoes: VIP.diet.observacoes,
    activo: true,
  });
  if (dietErr && !dietErr.message.includes("Could not find the table")) throw dietErr;
  else console.log("OK · blueprint de dieta");

  // Prescrição personal
  await admin.from("historico_treinos_personais").delete().eq("client_id", vipId).eq("exercicio_id", VIP.rx.exercicio_id);
  const { error: rxErr } = await admin.from("historico_treinos_personais").insert({
    client_id: vipId,
    forger_id: forjadorId,
    exercicio_id: VIP.rx.exercicio_id,
    peso_prescrito: VIP.rx.peso_prescrito,
    repeticoes_alvo: VIP.rx.repeticoes_alvo,
    series_alvo: VIP.rx.series_alvo,
    observacoes: VIP.rx.observacoes,
  });
  if (rxErr) throw rxErr;
  console.log(`OK · prescrição ${VIP.rx.exercicio_id} ${VIP.rx.peso_prescrito}kg`);

  // Medidas 7 dobras
  await admin.from("vip_medidas_corporais").delete().eq("client_id", vipId);
  const { error: medErr } = await admin.from("vip_medidas_corporais").insert({
    client_id: vipId,
    forger_id: forjadorId,
    peso_kg: VIP.medidas.peso_kg,
    altura_cm: VIP.medidas.altura_cm,
    perimetros: VIP.medidas.perimetros,
    medido_em: new Date().toISOString(),
    activo: true,
  });
  if (medErr && !medErr.message.includes("Could not find the table")) throw medErr;
  else console.log("OK · medidas 7 dobras");

  console.log("\n=== VIP de teste pronto ===");
  console.log(`  Forjador: ${FORJADOR.email} / ${FORJADOR.password}`);
  console.log(`  VIP:      ${VIP.email} / ${VIP.password}`);
}

main().catch((err) => {
  console.error("\nseed-one-vip FALHOU:", err.message ?? err);
  process.exit(1);
});
