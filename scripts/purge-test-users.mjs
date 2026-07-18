/**
 * Remove definitivamente as contas ARGOS de teste do Supabase.
 * NÃO apaga contas reais (@gmail, jeu@, dodi@, sebben@, etc.).
 *
 * Uso: node scripts/purge-test-users.mjs --confirm
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const CONFIRM = process.argv.includes("--confirm");

/** Emails criados por seed-test-users / seed-ranking / seed-vip* */
const TEST_EMAILS = new Set(
  [
    "cliente@meccafit.com",
    "atleta2@meccafit.com",
    "atleta3@meccafit.com",
    "atleta4@meccafit.com",
    "atleta5@meccafit.com",
    "atleta6@meccafit.com",
    "atleta7@meccafit.com",
    "atleta8@meccafit.com",
    "atleta9@meccafit.com",
    "atleta10@meccafit.com",
    "forjador@meccafit.com",
    "master@meccafit.com",
    "forjador-teste@meccafit.com",
    "vip-pular@meccafit.com",
    "vip-teste@meccafit.com",
    "vip-linhagem@meccafit.com",
    "vip-soberano@meccafit.com",
    "qa@meccafit.com",
  ].map((email) => email.toLowerCase()),
);

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function main() {
  const env = loadEnvLocal();
  requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("purge-test-users · projeto:", url);

  const users = await listAllAuthUsers(admin);
  const targets = users.filter((user) =>
    TEST_EMAILS.has((user.email ?? "").toLowerCase()),
  );
  const kept = users.filter((user) => !TEST_EMAILS.has((user.email ?? "").toLowerCase()));

  console.log(`\nAlvos (${targets.length}):`);
  for (const user of targets) {
    console.log(`  - ${user.email}`);
  }
  console.log(`\nMantidos (${kept.length}):`);
  for (const user of kept) {
    console.log(`  - ${user.email}`);
  }

  if (!CONFIRM) {
    console.log("\nDry-run. Para apagar: node scripts/purge-test-users.mjs --confirm\n");
    process.exit(0);
  }

  let deleted = 0;
  let failed = 0;
  for (const user of targets) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      failed += 1;
      console.warn(`[FAIL] ${user.email}: ${error.message}`);
    } else {
      deleted += 1;
      console.log(`[OK] removido ${user.email}`);
    }
  }

  console.log(`\nConcluído: ${deleted} removido(s), ${failed} falha(s).\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("purge-test-users:", error.message ?? error);
  process.exit(1);
});
