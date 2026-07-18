/**
 * ARGOS — alunos VIP dedicados (1 por forjador do projecto).
 * Cria conta cliente, vínculo forger_client_bonds, blueprint de dieta e prescrição inicial.
 *
 * Uso: node scripts/seed-vip-students.mjs
 * Pré-requisito: node scripts/seed-test-users.mjs (forjadores base)
 *
 * Senha padrão VIP: vip123
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertAllowSeedTestUsers } from "./lib/seed-credentials.mjs";

assertAllowSeedTestUsers("seed-vip-students");

const VIP_PASSWORD = "vip123";

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

function loadTestUsers() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "scripts/argos/test-users.json"), "utf8");
    return JSON.parse(raw).users ?? {};
  } catch {
    return {};
  }
}

/** 1 aluno VIP por forjador seedado */
const VIP_STUDENTS = [
  {
    label: "vip_forjador_linhagem",
    email: "vip-linhagem@meccafit.com",
    forgerRegistryKey: "forjador_linhagem",
    forgerFallbackEmail: "forjador@meccafit.com",
    full_name: "Atleta VIP Linhagem",
    nome_linhagem: "Linhagem VIP · Forja da Linhagem",
    data_nascimento: "1991-04-12",
    diet: {
      titulo: "Recomposição Termogénica · Linhagem",
      objetivo: "recomposicao",
      calorias_alvo: 2400,
      proteinas_g: 180,
      carboidratos_g: 240,
      gorduras_g: 70,
      agua_litros: 3.5,
      observacoes:
        "Priorizar proteína pós-treino de peito/costas. Carboidrato moderado nos dias de perna.",
      refeicoes: [
        {
          id: "cafe",
          nome: "Café da manhã",
          horario: "07:00",
          itens: [
            { alimento: "Ovos mexidos", quantidade: "3 un", calorias: 210, proteinas_g: 18 },
            { alimento: "Aveia", quantidade: "60g", calorias: 230, proteinas_g: 8 },
            { alimento: "Banana", quantidade: "1 un", calorias: 105, proteinas_g: 1 },
          ],
        },
        {
          id: "almoco",
          nome: "Almoço",
          horario: "12:30",
          itens: [
            { alimento: "Frango grelhado", quantidade: "200g", calorias: 330, proteinas_g: 62 },
            { alimento: "Arroz integral", quantidade: "150g", calorias: 180, proteinas_g: 4 },
            { alimento: "Brócolis", quantidade: "150g", calorias: 50, proteinas_g: 4 },
          ],
        },
        {
          id: "pre_treino",
          nome: "Pré-treino",
          horario: "17:00",
          itens: [
            { alimento: "Pão integral", quantidade: "2 fatias", calorias: 140, proteinas_g: 6 },
            { alimento: "Whey", quantidade: "30g", calorias: 120, proteinas_g: 24 },
          ],
        },
        {
          id: "jantar",
          nome: "Jantar",
          horario: "20:30",
          itens: [
            { alimento: "Salmão", quantidade: "180g", calorias: 370, proteinas_g: 40 },
            { alimento: "Batata-doce", quantidade: "200g", calorias: 180, proteinas_g: 3 },
            { alimento: "Salada verde", quantidade: "1 prato", calorias: 40, proteinas_g: 2 },
          ],
        },
      ],
    },
    rx: {
      exercicio_id: "peitoral-supino",
      peso_prescrito: 80,
      repeticoes_alvo: 10,
      series_alvo: 4,
      observacoes: "VIP Linhagem · Supino 80 kg",
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
      segunda: { notas: "Café: ovos + aveia · Almoço: frango + arroz · Jantar: salmão", concluido: true },
      terca: { notas: "Dia de costas — carboidrato moderado", concluido: false },
      quarta: { notas: "Pernas — pré-treino: pão + whey", concluido: false },
      quinta: { notas: "Ombros + braços", concluido: false },
      sexta: { notas: "Peito — refeição livre no jantar", concluido: false },
      sabado: { notas: "Cardio leve + proteína elevada", concluido: false },
      domingo: { notas: "Descanso activo — meal prep", concluido: false },
    },
    vtcBaseline: 1250,
  },
  {
    label: "vip_forjador_soberano",
    email: "vip-soberano@meccafit.com",
    forgerRegistryKey: "forjador_soberano",
    forgerFallbackEmail: "master@meccafit.com",
    full_name: "Atleta VIP Soberano",
    nome_linhagem: "Linhagem VIP · Forja Soberana",
    data_nascimento: "1989-08-25",
    diet: {
      titulo: "Hipertrofia Elite · Soberana",
      objetivo: "hipertrofia",
      calorias_alvo: 3200,
      proteinas_g: 220,
      carboidratos_g: 380,
      gorduras_g: 90,
      agua_litros: 4.0,
      observacoes:
        "Superávit controlado. Refeição extra pós-treino nos dias de agachamento e terra.",
      refeicoes: [
        {
          id: "cafe",
          nome: "Café da manhã",
          horario: "06:30",
          itens: [
            { alimento: "Omelete 4 ovos", quantidade: "1 un", calorias: 280, proteinas_g: 24 },
            { alimento: "Pão integral", quantidade: "3 fatias", calorias: 210, proteinas_g: 9 },
            { alimento: "Abacate", quantidade: "80g", calorias: 130, proteinas_g: 2 },
          ],
        },
        {
          id: "lanche",
          nome: "Lanche",
          horario: "10:00",
          itens: [
            { alimento: "Iogurte grego", quantidade: "200g", calorias: 130, proteinas_g: 20 },
            { alimento: "Granola", quantidade: "40g", calorias: 180, proteinas_g: 4 },
          ],
        },
        {
          id: "almoco",
          nome: "Almoço",
          horario: "13:00",
          itens: [
            { alimento: "Patinho moído", quantidade: "250g", calorias: 430, proteinas_g: 55 },
            { alimento: "Macarrão integral", quantidade: "200g", calorias: 280, proteinas_g: 10 },
            { alimento: "Legumes refogados", quantidade: "200g", calorias: 90, proteinas_g: 4 },
          ],
        },
        {
          id: "pos_treino",
          nome: "Pós-treino",
          horario: "18:30",
          itens: [
            { alimento: "Whey isolado", quantidade: "40g", calorias: 160, proteinas_g: 32 },
            { alimento: "Dextrose", quantidade: "50g", calorias: 200, proteinas_g: 0 },
            { alimento: "Creatina", quantidade: "5g", calorias: 0, proteinas_g: 0 },
          ],
        },
        {
          id: "jantar",
          nome: "Jantar",
          horario: "21:00",
          itens: [
            { alimento: "Contrafilé", quantidade: "220g", calorias: 440, proteinas_g: 48 },
            { alimento: "Arroz branco", quantidade: "250g", calorias: 325, proteinas_g: 6 },
            { alimento: "Feijão", quantidade: "150g", calorias: 130, proteinas_g: 9 },
          ],
        },
      ],
    },
    rx: {
      exercicio_id: "agachamento-livre",
      peso_prescrito: 120,
      repeticoes_alvo: 8,
      series_alvo: 5,
      observacoes: "VIP Soberano · Agachamento 120 kg",
    },
  },
];

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("seed-vip-students: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveForgerId(registry, student) {
  const fromRegistry = registry[student.forgerRegistryKey]?.userId;
  if (fromRegistry) return fromRegistry;

  const { data: listed, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const match = listed.users.find(
    (user) => user.email?.toLowerCase() === student.forgerFallbackEmail.toLowerCase(),
  );
  if (!match) {
    throw new Error(
      `Forjador não encontrado (${student.forgerFallbackEmail}). Rode seed-test-users.mjs primeiro.`,
    );
  }
  return match.id;
}

async function ensureVipUser(student) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === student.email.toLowerCase(),
  );

  const metadata = {
    full_name: student.full_name,
    data_nascimento: student.data_nascimento,
    role: "cliente",
    nome_linhagem: student.nome_linhagem,
  };

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: VIP_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updateError) throw updateError;
    console.log(`OK · VIP actualizado: ${student.email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: student.email,
    password: VIP_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  console.log(`OK · VIP criado: ${student.email}`);
  return data.user.id;
}

async function ensureBond(forgerId, clientId) {
  await admin.from("forger_client_bonds").delete().eq("client_id", clientId);

  const { data, error } = await admin
    .from("forger_client_bonds")
    .insert({ forger_id: forgerId, client_id: clientId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function ensureProfileActive(clientId) {
  const { error } = await admin
    .from("profiles")
    .update({ status_altar: "Ativo" })
    .eq("id", clientId);
  if (error && !error.message.includes("permission denied")) {
    throw error;
  }
}

async function ensureDietBlueprint(forgerId, clientId, diet) {
  await admin.from("diet_blueprints").delete().eq("client_id", clientId);

  const { error } = await admin.from("diet_blueprints").insert({
    client_id: clientId,
    forger_id: forgerId,
    titulo: diet.titulo,
    objetivo: diet.objetivo,
    calorias_alvo: diet.calorias_alvo,
    proteinas_g: diet.proteinas_g,
    carboidratos_g: diet.carboidratos_g,
    gorduras_g: diet.gorduras_g,
    agua_litros: diet.agua_litros,
    refeicoes: diet.refeicoes,
    observacoes: diet.observacoes,
    activo: true,
  });

  if (error) {
    if (error.message.includes("Could not find the table")) {
      console.warn("AVISO: diet_blueprints não migrada — blueprint ignorado.");
      return;
    }
    throw error;
  }
  console.log(`OK · blueprint dieta → ${diet.titulo}`);
}

async function ensurePersonalRx(forgerId, clientId, rx) {
  await admin
    .from("historico_treinos_personais")
    .delete()
    .eq("client_id", clientId)
    .eq("exercicio_id", rx.exercicio_id);

  const { error } = await admin.from("historico_treinos_personais").insert({
    client_id: clientId,
    forger_id: forgerId,
    exercicio_id: rx.exercicio_id,
    peso_prescrito: rx.peso_prescrito,
    repeticoes_alvo: rx.repeticoes_alvo,
    series_alvo: rx.series_alvo,
    observacoes: rx.observacoes,
  });

  if (error) throw error;
  console.log(`OK · prescrição personal ${rx.exercicio_id} ${rx.peso_prescrito}kg`);
}

function resolveIsoWeekRef(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Simulação antropometria — 7 dobras científicas (Jackson-Pollock). */
async function ensureScientificMedidas(forgerId, clientId, medidas) {
  await admin.from("vip_medidas_corporais").delete().eq("client_id", clientId);

  const { error } = await admin.from("vip_medidas_corporais").insert({
    client_id: clientId,
    forger_id: forgerId,
    peso_kg: medidas.peso_kg,
    altura_cm: medidas.altura_cm,
    perimetros: medidas.perimetros,
    medido_em: medidas.medido_em ?? new Date().toISOString(),
    activo: true,
  });

  if (error) {
    if (error.message.includes("Could not find the table")) {
      console.warn("AVISO: vip_medidas_corporais não migrada — medidas ignoradas.");
      return;
    }
    throw error;
  }
  console.log(`OK · medidas 7 dobras → ${medidas.peso_kg} kg`);
}

async function ensureWeeklyDiet(forgerId, clientId, dias) {
  await admin.from("vip_dieta_semanal").delete().eq("client_id", clientId);

  const { error } = await admin.from("vip_dieta_semanal").insert({
    client_id: clientId,
    forger_id: forgerId,
    semana_ref: resolveIsoWeekRef(),
    dias,
    activo: true,
  });

  if (error) {
    if (error.message.includes("Could not find the table")) {
      console.warn("AVISO: vip_dieta_semanal não migrada — dieta semanal ignorada.");
      return;
    }
    throw error;
  }
  console.log("OK · dieta semanal VIP publicada");
}

/** VTC de teste — zero custo (service_role directo, sem RPC pago). */
async function ensureVtcBaseline(clientId, vtcAtual = 1250) {
  const { error } = await admin
    .from("profiles")
    .update({ vtc_atual: vtcAtual, vtc_total: vtcAtual })
    .eq("id", clientId);

  if (error && !error.message.includes("Could not find")) {
    console.warn("AVISO: vtc_atual não actualizado:", error.message);
    return;
  }
  console.log(`OK · VTC baseline ${vtcAtual} kg (simulação)`);
}

console.log("seed-vip-students · projeto:", url, "\n");

const registry = loadTestUsers();
const vipRegistry = {};

try {
  for (const student of VIP_STUDENTS) {
    console.log(`\n--- ${student.email} ---`);
    const forgerId = await resolveForgerId(registry, student);
    const clientId = await ensureVipUser(student);
    await ensureProfileActive(clientId);
    const bondId = await ensureBond(forgerId, clientId);
    await ensureDietBlueprint(forgerId, clientId, student.diet);
    await ensurePersonalRx(forgerId, clientId, student.rx);

    if (student.medidas) {
      await ensureScientificMedidas(forgerId, clientId, student.medidas);
    }
    if (student.dietaSemanal) {
      await ensureWeeklyDiet(forgerId, clientId, student.dietaSemanal);
    }
    if (student.vtcBaseline) {
      await ensureVtcBaseline(clientId, student.vtcBaseline);
    }

    vipRegistry[student.label] = {
      email: student.email,
      password: VIP_PASSWORD,
      userId: clientId,
      forgerId,
      bondId,
    };
    console.log(`OK · vínculo VIP ${bondId.slice(0, 8)}… → forjador ${forgerId.slice(0, 8)}…`);
  }

  const registryPath = resolve(process.cwd(), "scripts/argos/vip-students.json");
  writeFileSync(
    registryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        password: VIP_PASSWORD,
        students: vipRegistry,
      },
      null,
      2,
    ),
  );

  console.log("\n=== Credenciais VIP ===\n");
  for (const student of VIP_STUDENTS) {
    console.log(`  ${student.full_name}`);
    console.log(`    Email:    ${student.email}`);
    console.log(`    Senha:    ${VIP_PASSWORD}`);
    console.log(`    Forjador: ${student.forgerFallbackEmail}\n`);
  }

  console.log(`Registro salvo: scripts/argos/vip-students.json`);
  console.log("seed-vip-students: concluído.");
} catch (error) {
  console.error("\nseed-vip-students FALHOU:", error.message ?? error);
  process.exit(1);
}
