/**
 * Local helper — monta .env.local a partir de variáveis de ambiente (dev/CI manual).
 * No GitHub Actions, o workflow escreve .env.local via bash e chama validate-env-local.mjs.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function firstNonEmpty(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

const url = firstNonEmpty("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const anonKey = firstNonEmpty(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
);
const publishableKey = firstNonEmpty(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);
const serviceRole = firstNonEmpty("SUPABASE_SERVICE_ROLE_KEY");
const forgeKey = firstNonEmpty("FORGE_KEY");

if (!url || !anonKey) {
  console.error("write-env-local: exporte NEXT_PUBLIC_SUPABASE_URL e chave pública antes de correr.");
  process.exit(1);
}

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
];
if (publishableKey) lines.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`);
if (serviceRole) lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`);
if (forgeKey) lines.push(`FORGE_KEY=${forgeKey}`);

writeFileSync(resolve(process.cwd(), ".env.local"), `${lines.join("\n")}\n`, "utf8");

const validate = spawnSync(process.execPath, ["scripts/ci/validate-env-local.mjs"], {
  stdio: "inherit",
});
process.exit(validate.status ?? 1);
