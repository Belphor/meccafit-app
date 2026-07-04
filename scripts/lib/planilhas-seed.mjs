import { createClient } from "@supabase/supabase-js";

/** Grade semanal padrão Seg–Sáb (sem abdômen · ordem 1). */
export const DEFAULT_WEEKLY_PLANILHA = [
  { dia_semana: 1, grupo_muscular: "PEITO", ordem: 1 },
  { dia_semana: 2, grupo_muscular: "COSTAS", ordem: 1 },
  { dia_semana: 3, grupo_muscular: "PERNAS", ordem: 1 },
  { dia_semana: 4, grupo_muscular: "OMBROS", ordem: 1 },
  { dia_semana: 5, grupo_muscular: "BRACOS", ordem: 1 },
  { dia_semana: 6, grupo_muscular: "BRACOS", ordem: 1 },
];

const FULL_WEEK_DAYS = [1, 2, 3, 4, 5, 6];
const SEED_PASSWORD = "senha123";
const DEFAULT_FORJADOR_EMAIL = "master@meccafit.com";

export function hasFullPlanilhaWeek(rows) {
  const days = new Set((rows ?? []).map((row) => Number(row.dia_semana)));
  return FULL_WEEK_DAYS.every((day) => days.has(day));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} atletaId
 */
export async function countPlanilhasForAtleta(admin, atletaId) {
  const { count, error } = await admin
    .from("planilhas_forjador")
    .select("id", { count: "exact", head: true })
    .eq("atleta_id", atletaId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} atletaId
 */
export async function seedPlanilhasForAtleta(admin, atletaId) {
  if (!atletaId) {
    throw new Error("atletaId ausente");
  }

  const { data: existing, error: readErr } = await admin
    .from("planilhas_forjador")
    .select("dia_semana")
    .eq("atleta_id", atletaId);

  if (readErr) {
    throw new Error(readErr.message);
  }

  if (hasFullPlanilhaWeek(existing)) {
    return { inserted: 0, skipped: true };
  }

  if ((existing ?? []).length > 0) {
    const { error: deleteErr } = await admin.from("planilhas_forjador").delete().eq("atleta_id", atletaId);
    if (deleteErr) {
      throw new Error(deleteErr.message);
    }
  }

  const rows = DEFAULT_WEEKLY_PLANILHA.map((row) => ({ atleta_id: atletaId, ...row }));
  const { error: insertErr } = await admin.from("planilhas_forjador").insert(rows);
  if (insertErr) {
    throw new Error(insertErr.message);
  }

  return { inserted: rows.length, skipped: false };
}

/**
 * Seed via RPC SECURITY DEFINER (caminho de produção · não depende de service_role INSERT).
 *
 * @param {{
 *   url: string;
 *   anonKey: string;
 *   atletaId: string;
 *   forjadorEmail?: string;
 *   password?: string;
 * }} options
 */
export async function seedPlanilhasViaForjadorRpc(options) {
  const {
    url,
    anonKey,
    atletaId,
    forjadorEmail = DEFAULT_FORJADOR_EMAIL,
    password = SEED_PASSWORD,
  } = options;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: forjadorEmail,
    password,
  });

  if (loginErr || !loginData.user?.id) {
    throw new Error(`login ${forjadorEmail}: ${loginErr?.message ?? "sem user"}`);
  }

  const { data, error } = await client.rpc("argos_batch_upsert_planilhas_forjador", {
    p_atleta_id: atletaId,
    p_rows: DEFAULT_WEEKLY_PLANILHA,
  });

  await client.auth.signOut();

  if (error) {
    if (error.code === "PGRST202") {
      throw new Error("argos_batch_upsert_planilhas_forjador ausente — aplicar 20260626200000");
    }
    throw new Error(error.message);
  }

  const inserted = Number(data?.rows_upserted ?? 0);
  if (inserted < FULL_WEEK_DAYS.length) {
    throw new Error(`RPC inseriu ${inserted}/${FULL_WEEK_DAYS.length} linhas`);
  }

  return { inserted, via: "rpc" };
}

/**
 * Garante grade Seg–Sáb: service_role INSERT e, se necessário, RPC do forjador soberano.
 *
 * @param {{
 *   admin: import("@supabase/supabase-js").SupabaseClient;
 *   url: string;
 *   anonKey: string;
 *   atletaId: string;
 * }} options
 */
export async function ensurePlanilhasForAtletaProbe(options) {
  const { admin, url, anonKey, atletaId } = options;
  const attempts = [];

  try {
    const direct = await seedPlanilhasForAtleta(admin, atletaId);
    attempts.push(direct.skipped ? "service_role:skip" : `service_role:+${direct.inserted}`);
    const count = await countPlanilhasForAtleta(admin, atletaId);
    if (count >= FULL_WEEK_DAYS.length) {
      return { ok: true, count, attempts };
    }
    attempts.push(`service_role:count=${count}`);
  } catch (error) {
    attempts.push(`service_role:${error instanceof Error ? error.message : String(error)}`);
  }

  const rpc = await seedPlanilhasViaForjadorRpc({ url, anonKey, atletaId });
  attempts.push(`rpc:+${rpc.inserted}`);

  const count = await countPlanilhasForAtleta(admin, atletaId);
  if (count < FULL_WEEK_DAYS.length) {
    throw new Error(`planilhas incompletas (${count}/6) · ${attempts.join(" · ")}`);
  }

  return { ok: true, count, attempts };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
export async function seedPlanilhasForAllClientes(admin) {
  const { data: clientes, error } = await admin.from("profiles").select("id").eq("role", "cliente");
  if (error) {
    throw new Error(error.message);
  }

  let inserted = 0;
  for (const cliente of clientes ?? []) {
    const result = await seedPlanilhasForAtleta(admin, cliente.id);
    inserted += result.inserted;
  }

  return inserted;
}
