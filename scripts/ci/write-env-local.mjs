/**
 * CI helper — escreve .env.local a partir de process.env (GitHub Actions secrets).
 *
 * Opção A (recomendada para iniciantes): secret único ENV_LOCAL com o conteúdo
 * completo do .env.local (copiar/colar do PC).
 *
 * Opção B: secrets individuais com estes nomes exactos.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.local");

function firstNonEmpty(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function logPresence(label, ...keys) {
  const hit = keys.find((key) => Boolean(process.env[key]?.trim()));
  console.log(`  ${label}: ${hit ? `ok (${hit})` : "ausente"}`);
}

function parseEnvBlock(raw) {
  const map = new Map();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    map.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1));
  }
  return map;
}

function validateBlock(map) {
  const url = firstNonEmpty(
    ...["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"].map((k) => map.get(k) ?? ""),
  );
  const key = firstNonEmpty(
    ...[
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    ].map((k) => map.get(k) ?? ""),
  );
  return { url, key };
}

const envLocalRaw = process.env.ENV_LOCAL?.trim();

if (envLocalRaw) {
  const map = parseEnvBlock(envLocalRaw);
  const { url, key } = validateBlock(map);
  if (!url || !key) {
    console.error("write-env-local: ENV_LOCAL existe mas falta URL ou chave pública Supabase.");
    process.exit(1);
  }
  writeFileSync(target, `${envLocalRaw.replace(/\s+$/, "")}\n`, "utf8");
  console.log(`write-env-local: ${target} via secret ENV_LOCAL (${map.size} chaves)`);
  process.exit(0);
}

console.log("write-env-local: diagnóstico (valores nunca são impressos):");
logPresence("URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
logPresence(
  "Chave pública",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);
logPresence("Service role", "SUPABASE_SERVICE_ROLE_KEY");
logPresence("Forja", "FORGE_KEY");
logPresence("Bloco completo", "ENV_LOCAL");

const url = firstNonEmpty("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const anonKey = firstNonEmpty(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);
const publishableKey = firstNonEmpty(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
const serviceRole = firstNonEmpty("SUPABASE_SERVICE_ROLE_KEY");
const forgeKey = firstNonEmpty("FORGE_KEY");

if (!url || !anonKey) {
  console.error("\nwrite-env-local: não encontrou URL + chave pública.");
  console.error("Corrija em: Settings → Secrets and variables → Actions → Repository secrets");
  console.error("");
  console.error("Opção fácil — 1 secret só:");
  console.error("  Nome: ENV_LOCAL");
  console.error("  Valor: copie TODO o conteúdo do .env.local do seu PC");
  console.error("");
  console.error("Opção avançada — 4 secrets separados (nomes EXACTOS):");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY  (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  console.error("  FORGE_KEY");
  process.exit(1);
}

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
];
if (publishableKey) lines.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`);
if (serviceRole) lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`);
if (forgeKey) lines.push(`FORGE_KEY=${forgeKey}`);

writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(`\nwrite-env-local: ${target} (${lines.length} chaves montadas)`);
