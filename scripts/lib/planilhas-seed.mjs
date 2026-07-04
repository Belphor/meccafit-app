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

function hasFullWeek(rows) {
  const days = new Set((rows ?? []).map((row) => Number(row.dia_semana)));
  return FULL_WEEK_DAYS.every((day) => days.has(day));
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

  if (hasFullWeek(existing)) {
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
