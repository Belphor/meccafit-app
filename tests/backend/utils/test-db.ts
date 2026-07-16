import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

export function loadEnvTest(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.test");
  if (!existsSync(envPath)) {
    // Em CI o TEST_DATABASE_URL chega via variaveis de ambiente, entao o
    // arquivo .env.test (apenas local) e opcional quando ja esta definido.
    if (process.env.TEST_DATABASE_URL?.trim()) {
      return;
    }
    throw new Error(".env.test nao encontrado. Rode os testes de backend pela raiz do app.");
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

export function getSafeTestDatabaseUrl(): string {
  loadEnvTest();

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Recusado: NODE_ENV precisa ser exatamente 'test'.");
  }

  const rawUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!rawUrl) {
    throw new Error("Recusado: TEST_DATABASE_URL ausente.");
  }

  const url = new URL(rawUrl);
  const databaseName = url.pathname.replace(/^\//, "");
  const host = url.hostname.toLowerCase();

  if (!SAFE_HOSTS.has(host)) {
    throw new Error(`Recusado: host de banco inseguro para testes (${url.hostname}).`);
  }

  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(`Recusado: o database precisa conter 'test' no nome (${databaseName}).`);
  }

  if (rawUrl.includes("supabase.co") || rawUrl.includes("pooler.supabase.com")) {
    throw new Error("Recusado: testes nunca podem apontar para Supabase remoto.");
  }

  return rawUrl;
}

export async function withTestClient<T>(
  callback: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: getSafeTestDatabaseUrl() });
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function resetTestDatabase(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS auth CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA auth;
      GRANT USAGE ON SCHEMA public TO PUBLIC;
    `);

    await client.query(`
      DO $$
      BEGIN
        CREATE ROLE anon NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END
      $$;

      DO $$
      BEGIN
        CREATE ROLE authenticated NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END
      $$;
    `);
  });
}

export async function installRitmoBaseSchema(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;

      CREATE TABLE public.argos_academia_config (
        id integer PRIMARY KEY DEFAULT 1,
        phase_vtc_faisca numeric(16, 2) NOT NULL DEFAULT 5000,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      INSERT INTO public.argos_academia_config (id, phase_vtc_faisca)
      VALUES (1, 8000)
      ON CONFLICT (id) DO UPDATE
      SET phase_vtc_faisca = EXCLUDED.phase_vtc_faisca;

      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY,
        full_name text,
        target_days_per_week smallint NOT NULL DEFAULT 3,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE public.planos_atletas (
        atleta_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
        total_treinos_mensais_planejados integer NOT NULL DEFAULT 16,
        grupos_obrigatorios text[] NOT NULL DEFAULT '{}',
        meta_vtc_mensal_kg numeric,
        meta_sync_mes date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });
}

export async function applySqlFile(relativePath: string): Promise<void> {
  const sqlPath = resolve(process.cwd(), relativePath);
  const sql = readFileSync(sqlPath, "utf8");

  await withTestClient(async (client) => {
    await client.query(sql);
  });
}

export async function seedTestProfile(userId = TEST_USER_ID): Promise<void> {
  await withTestClient(async (client) => {
    await client.query(
      `
        INSERT INTO public.profiles (id, full_name, target_days_per_week)
        VALUES ($1, 'Atleta Teste', 3)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            target_days_per_week = EXCLUDED.target_days_per_week;
      `,
      [userId],
    );
  });
}

export async function callClientSyncPlanoMeta(
  userId: string,
  totalTreinos: number,
): Promise<Record<string, unknown>> {
  return withTestClient(async (client) => {
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
      const result = await client.query(
        "SELECT public.client_sync_plano_meta($1)::jsonb AS payload",
        [totalTreinos],
      );
      await client.query("COMMIT");
      return result.rows[0].payload as Record<string, unknown>;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
  });
}
