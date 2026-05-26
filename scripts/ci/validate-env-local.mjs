/**
 * Valida .env.local no disco (CI ou local). Nunca imprime valores secretos.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.local");

function parseEnvBlock(raw) {
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) map.set(key, value);
  }
  return map;
}

function firstValue(map, ...keys) {
  for (const key of keys) {
    const value = map.get(key)?.trim();
    if (value) return { key, value };
  }
  return null;
}

if (!existsSync(target)) {
  console.error("validate-env-local: .env.local não existe.");
  process.exit(1);
}

const raw = readFileSync(target, "utf8").replace(/^\uFEFF/, "");
const map = parseEnvBlock(raw);

console.log("validate-env-local: chaves encontradas no ficheiro:");
for (const key of map.keys()) {
  const value = map.get(key) ?? "";
  console.log(`  ${key}: ${value ? "definido" : "vazio"}`);
}

const urlHit = firstValue(map, "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const keyHit = firstValue(
  map,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);

if (!urlHit || !keyHit) {
  console.error("\nvalidate-env-local: falta URL ou chave pública Supabase.");
  console.error(`  URL: ${urlHit ? `ok (${urlHit.key})` : "ausente"}`);
  console.error(`  Chave: ${keyHit ? `ok (${keyHit.key})` : "ausente"}`);
  console.error("\nSe usou ENV_LOCAL no GitHub, o conteúdo pode ter sido colado numa linha só.");
  console.error("Tente de novo copiando linha a linha, ou crie secrets individuais.");
  process.exit(1);
}

console.log(`\nvalidate-env-local: OK (${map.size} chaves, URL via ${urlHit.key}, chave via ${keyHit.key})`);
