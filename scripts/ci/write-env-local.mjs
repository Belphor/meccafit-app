/**
 * CI helper — escreve .env.local a partir de process.env (GitHub Actions secrets).
 * Uso local: export vars e `node scripts/ci/write-env-local.mjs`
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const OPTIONAL = ["SUPABASE_SERVICE_ROLE_KEY", "FORGE_KEY"];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("write-env-local: variáveis obrigatórias ausentes:", missing.join(", "));
  console.error("Configure GitHub Secrets ou exporte no shell antes de correr.");
  process.exit(1);
}

const lines = [];
for (const key of [...REQUIRED, ...OPTIONAL]) {
  const value = process.env[key]?.trim();
  if (value) lines.push(`${key}=${value}`);
}

const target = resolve(process.cwd(), ".env.local");
writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(`write-env-local: ${target} (${lines.length} chaves, sem valores no log)`);
