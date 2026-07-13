/**
 * Reinicia todas as contas cliente como primeira visita (ANYMA, identidade, tour).
 *
 * Uso: node scripts/reset-onboarding-first-run.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: readError } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "cliente");

  if (readError) {
    console.error("reset-onboarding: leitura profiles falhou —", readError.message);
    process.exit(1);
  }

  const count = profiles?.length ?? 0;
  if (count === 0) {
    console.log("reset-onboarding: nenhum perfil cliente encontrado.");
    return;
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({
      perfil_identidade_confirmada: false,
      anima_portal_visto: false,
      ecossistema_tour_concluido: false,
      sexo: null,
    })
    .eq("role", "cliente");

  if (updateError) {
    console.error("reset-onboarding: update falhou —", updateError.message);
    process.exit(1);
  }

  let termsReset = 0;
  for (const profile of profiles ?? []) {
    const { data: authUser, error: getError } = await client.auth.admin.getUserById(profile.id);
    if (getError || !authUser.user) continue;

    const metadata = { ...(authUser.user.user_metadata ?? {}) };
    metadata.has_accepted_terms = false;

    const { error: metaError } = await client.auth.admin.updateUserById(profile.id, {
      user_metadata: metadata,
    });
    if (!metaError) termsReset += 1;
  }

  console.log(`reset-onboarding: OK — ${count} conta(s) cliente reiniciada(s) para 1ª visita.`);
  console.log(`reset-onboarding: has_accepted_terms limpo em ${termsReset} conta(s).`);
  console.log("");
  console.log("No navegador (F12 → Console), em cada aparelho de teste:");
  console.log(
    "  Object.keys(localStorage).filter(k=>k.startsWith('meccafit:')).forEach(k=>localStorage.removeItem(k));",
  );
  console.log(
    "  Object.keys(sessionStorage).filter(k=>k.startsWith('meccafit:')).forEach(k=>sessionStorage.removeItem(k));",
  );
  console.log(
    "Depois: Ctrl+F5 e login. Diretrizes só na 1ª vez; logo + manifesto em todo login.",
  );
}

main().catch((error) => {
  console.error("reset-onboarding: erro —", error);
  process.exit(1);
});
