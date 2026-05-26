/**
 * ARGOS — usuários simulados para testes de segurança e carga.
 * Uso: node scripts/seed-test-users.mjs
 *
 * Senha padrão de todos: senha123 (apenas ambiente de teste)
 */
import { readFileSync, writeFileSync } from "node:fs";
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

/** Pool ARGOS — simula atletas, forjador e admin soberano */
const TEST_USERS = [
  {
    email: "cliente@meccafit.com",
    password: "senha123",
    label: "cliente_principal",
    user_metadata: {
      full_name: "Cliente Teste",
      data_nascimento: "1990-01-01",
      role: "cliente",
      nome_linhagem: "Linhagem Meccafit",
    },
  },
  {
    email: "atleta2@meccafit.com",
    password: "senha123",
    label: "atleta_vitima",
    user_metadata: {
      full_name: "Atleta Dois",
      data_nascimento: "1992-06-15",
      role: "cliente",
      nome_linhagem: "Linhagem Argos B",
    },
  },
  {
    email: "atleta3@meccafit.com",
    password: "senha123",
    label: "atleta_carga",
    user_metadata: {
      full_name: "Atleta Três",
      data_nascimento: "1988-03-20",
      role: "cliente",
      nome_linhagem: "Linhagem Argos C",
    },
  },
  {
    email: "atleta4@meccafit.com",
    password: "senha123",
    label: "atleta_carga",
    user_metadata: {
      full_name: "Atleta Quatro",
      data_nascimento: "1995-11-08",
      role: "cliente",
      nome_linhagem: "Linhagem Argos D",
    },
  },
  {
    email: "forjador@meccafit.com",
    password: "senha123",
    label: "forjador_linhagem",
    user_metadata: {
      full_name: "Forjador Linhagem",
      data_nascimento: "1987-07-01",
      role: "forjador",
      nome_linhagem: "Forja da Linhagem",
    },
  },
  {
    email: "master@meccafit.com",
    password: "senha123",
    label: "forjador_soberano",
    user_metadata: {
      full_name: "Mestre Supremo",
      data_nascimento: "1985-01-01",
      role: "forjador_soberano",
      nome_linhagem: "Forja Soberana",
    },
  },
];

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("seed-test-users: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(account) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
  );

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: account.user_metadata,
    });
    if (updateError) throw updateError;
    console.log(`OK · atualizado: ${account.email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: account.user_metadata,
  });

  if (error) throw error;
  console.log(`OK · criado: ${account.email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfileRole(userId, role) {
  if (role === "forjador_soberano") {
    const { error } = await admin.rpc("argos_bootstrap_soberano", { p_user_id: userId });
    if (error?.code === "PGRST202") {
      console.warn("argos_bootstrap_soberano ausente — rode migration 20260524220000.");
      return;
    }
    if (error) throw error;
    return;
  }

  if (role === "forjador") {
    const { error } = await admin.rpc("argos_bootstrap_forjador", { p_user_id: userId });
    if (error?.code === "PGRST202") {
      const { error: fallback } = await admin.from("profiles").update({ role: "forjador" }).eq("id", userId);
      if (fallback) throw fallback;
      return;
    }
    if (error) throw error;
    return;
  }

  const { error } = await admin.from("profiles").update({ role: "cliente" }).eq("id", userId);
  if (error) throw error;
}

console.log("seed-test-users · projeto:", url, "\n");

try {
  const registry = {};

  for (const account of TEST_USERS) {
    const userId = await ensureUser(account);
    registry[account.label] = { email: account.email, userId };
    const expectedRole = account.user_metadata.role;
    if (expectedRole && expectedRole !== "cliente") {
      await ensureProfileRole(userId, expectedRole);
      console.log(`OK · role ${expectedRole} → ${account.email}`);
    }
  }

  const ids = Object.values(registry).map((entry) => entry.userId);
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, role, data_nascimento")
    .in("id", ids);

  if (profileError) {
    console.warn("profiles:", profileError.message);
  } else {
    console.log("\nProfiles:");
    for (const row of profiles ?? []) {
      console.log(`  - ${row.full_name} · ${row.role} · ${row.data_nascimento}`);
    }
  }

  const registryPath = resolve(process.cwd(), "scripts/argos/test-users.json");
  writeFileSync(registryPath, JSON.stringify({ generatedAt: new Date().toISOString(), users: registry }, null, 2));
  console.log(`\nRegistro ARGOS salvo: scripts/argos/test-users.json`);
  console.log("seed-test-users: concluído.");
} catch (error) {
  console.error("\nseed-test-users FALHOU:", error.message ?? error);
  process.exit(1);
}
