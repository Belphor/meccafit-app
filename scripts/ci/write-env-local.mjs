/**
 * CI helper — escreve .env.local a partir de process.env (GitHub Actions secrets).
 * Uso local: export vars e `node scripts/ci/write-env-local.mjs`
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || anonKey;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const forgeKey = process.env.FORGE_KEY?.trim();

if (!url || !anonKey) {
  console.error("write-env-local: NEXT_PUBLIC_SUPABASE_URL e chave pública ausentes.");
  console.error(
    "Secrets GitHub: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (ou PUBLISHABLE_KEY).",
  );
  process.exit(1);
}

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
];
if (publishableKey) lines.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`);
if (serviceRole) lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`);
if (forgeKey) lines.push(`FORGE_KEY=${forgeKey}`);

const target = resolve(process.cwd(), ".env.local");
writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(`write-env-local: ${target} (${lines.length} chaves, sem valores no log)`);
