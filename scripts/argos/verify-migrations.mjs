/**
 * ARGOS · Verificação remota de migrations (sem SUPABASE_DB_URL).
 * Uso: node scripts/argos/verify-migrations.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const SOVEREIGN_JSON_KEYS = [
  "peito",
  "ombros",
  "bracos",
  "costas",
  "abdomen",
  "pernas",
];

export const MIDAS_MUSCLE_KEYS = SOVEREIGN_JSON_KEYS;

/** Patches incrementais · ordem de aplicação */
export const MIGRATION_PATCHES = [
  {
    id: "forum_brasa_viva",
    files: [
      "20260525100000_argos_forum_brasa_viva.sql",
      "20260525110000_argos_security_hardening.sql",
    ],
  },
  {
    id: "mecca_global",
    files: [
      "20260527240000_create_mecca_global_metrics.sql",
      "20260527241000_integrate_mecca_contribution_registrar.sql",
    ],
  },
  {
    id: "workout_architecture",
    files: [
      "20260528590000_add_abdomen_subgrupo_muscular.sql",
      "20260529000000_split_workout_architecture.sql",
      "20260529100000_dual_track_training_architecture.sql",
      "20260530008000_final_consolidated_muscle_architecture.sql",
    ],
  },
  {
    id: "evolucao_aba3",
    files: [
      "20260530100000_evolucao_aba3_sistema_geral_patch.sql",
      "20260530110000_fix_workout_resolve_after_iris_drop.sql",
      "20260530120000_restore_estase_gatilho_muscular.sql",
      "20260530121000_fix_obter_calor_ambiguous.sql",
      "20260530122000_fix_obter_calor_volatile.sql",
      "20260530130000_evolucao_calor_muscular.sql",
    ],
  },
  {
    id: "evolucao_costas",
    files: [
      "20260530140000_evolucao_costas_enum.sql",
      "20260530140001_evolucao_costas_calor_json.sql",
    ],
  },
  {
    id: "evolucao_ombros",
    files: [
      "20260530150000_evolucao_ombros_enum.sql",
      "20260530150001_evolucao_ombros_calor_json.sql",
    ],
  },
  {
    id: "abdomen_thermal",
    files: ["20260530160000_evolucao_abdomen_thermal_metrics.sql"],
  },
  {
    id: "ombros_grupo_isolado",
    files: [
      "20260530150000_evolucao_ombros_enum.sql",
      "20260530150001_evolucao_ombros_calor_json.sql",
    ],
  },
  {
    id: "midas_growth",
    files: [
      "20260615100000_evolucao_midas_growth_layer.sql",
      "20260615110000_evolucao_midas_remove_share_text.sql",
      "20260618100000_evolucao_monthly_flex_remove_frozen.sql",
    ],
  },
  {
    id: "planilhas_forjador",
    files: ["20260618120000_planilhas_forjador_weekly.sql"],
  },
  {
    id: "planilhas_atleta_free",
    files: ["20260619100000_planilhas_atleta_weekly_free.sql"],
  },
  {
    id: "planilhas_indication_no_abdomen",
    files: ["20260620100000_planilhas_indication_no_abdomen.sql"],
  },
];

export const ALL_MIGRATION_FILES = [
  ...new Set(MIGRATION_PATCHES.flatMap((patch) => patch.files)),
];

const PROBE_EXERCISE_ID = 88001;

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function assertMidasEvolutionJson(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, detail: "payload inválido" };
  }
  if (payload.error === "unauthorized") {
    return { ok: false, detail: "auth.uid ausente (esperado com service_role)" };
  }
  if (typeof payload.ignition_index !== "number") {
    return { ok: false, detail: "ignition_index ausente" };
  }
  const muscles = payload.muscles;
  if (!muscles || typeof muscles !== "object" || Array.isArray(muscles)) {
    return { ok: false, detail: "muscles ausente" };
  }
  for (const key of MIDAS_MUSCLE_KEYS) {
    const group = muscles[key];
    if (!group || typeof group !== "object") {
      return { ok: false, detail: `${key} ausente` };
    }
    if (typeof group.thermal_level !== "string") {
      return { ok: false, detail: `thermal_level inválido em ${key}` };
    }
    if ("is_frozen" in group) {
      return { ok: false, detail: `is_frozen banido — ainda presente em ${key}` };
    }
  }
  return { ok: true, detail: MIDAS_MUSCLE_KEYS.join(" · ") };
}

function assertCalorJsonSixGroups(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, detail: "payload inválido" };
  }
  const keys = Object.keys(payload).filter((k) => k !== "indice_ignicao").sort();
  const expected = [...SOVEREIGN_JSON_KEYS].sort();
  if (!expected.every((k, i) => keys[i] === k)) {
    return { ok: false, detail: `chaves=${keys.join(",")}` };
  }
  for (const key of SOVEREIGN_JSON_KEYS) {
    const group = payload[key];
    if (!group || typeof group !== "object") {
      return { ok: false, detail: `${key} ausente` };
    }
    if (typeof group.is_frozen !== "boolean") {
      return { ok: false, detail: `is_frozen inválido em ${key}` };
    }
  }
  return { ok: true, detail: SOVEREIGN_JSON_KEYS.join(" · ") };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {{ probeOmbrosIsolation?: boolean }} [options]
 */
export async function runMigrationProbes(admin, options = {}) {
  const probes = [];
  let probeUserId = null;

  const { data: profileRow } = await admin.from("profiles").select("id").limit(1).maybeSingle();
  probeUserId = profileRow?.id ?? null;

  const { error: forumErr } = await admin.rpc("argos_fetch_forum_brasa_viva", { p_limit: 1 });
  probes.push({
    id: "forum_brasa_viva",
    ok: !forumErr || forumErr.code !== "PGRST202",
    detail: forumErr?.message ?? "rpc ok",
  });

  const { data: meccaRow, error: meccaErr } = await admin
    .from("mecca_global_metrics")
    .select("id")
    .limit(1)
    .maybeSingle();
  probes.push({
    id: "mecca_global",
    ok: !meccaErr && Boolean(meccaRow?.id),
    detail: meccaErr?.message ?? (meccaRow?.id ? "tabela ok" : "sem linha"),
  });

  const { error: dualTrackErr } = await admin
    .from("historico_treinos_personais")
    .select("id")
    .limit(1);
  probes.push({
    id: "workout_architecture",
    ok: !dualTrackErr,
    detail: dualTrackErr?.message ?? "dual-track ok",
  });

  let calorPayload = null;
  if (probeUserId) {
    const { data, error } = await admin.rpc("obter_calor_muscular_atleta", {
      target_atleta_id: probeUserId,
    });
    calorPayload = data;
    probes.push({
      id: "evolucao_aba3",
      ok: !error && data && typeof data === "object" && !Array.isArray(data),
      detail: error?.message ?? "json rpc ok",
    });
  } else {
    probes.push({
      id: "evolucao_aba3",
      ok: false,
      detail: "sem perfil para probe",
    });
  }

  const sixGroupCheck = assertCalorJsonSixGroups(calorPayload);
  probes.push({
    id: "evolucao_costas",
    ok: sixGroupCheck.ok && Boolean(calorPayload?.costas),
    detail: sixGroupCheck.ok ? "costas presente" : sixGroupCheck.detail,
  });

  probes.push({
    id: "evolucao_ombros",
    ok: sixGroupCheck.ok && Boolean(calorPayload?.ombros),
    detail: sixGroupCheck.ok ? "ombros presente" : sixGroupCheck.detail,
  });

  if (options.probeOmbrosIsolation && probeUserId) {
    probes.push(await probeOmbrosIsolation(admin, probeUserId));
  } else if (options.probeOmbrosIsolation) {
    probes.push({
      id: "ombros_grupo_isolado",
      ok: false,
      detail: "sem perfil para probe de isolamento",
    });
  }

  if (probeUserId) {
    probes.push(await probeAbdomenThermal(admin, probeUserId));
    probes.push(await probeMidasGrowth(admin, probeUserId));
    probes.push(await probePlanilhasForjador(admin, probeUserId));
  } else {
    probes.push({
      id: "abdomen_thermal",
      ok: false,
      detail: "sem perfil para probe abdômen",
    });
    probes.push({
      id: "midas_growth",
      ok: false,
      detail: "sem perfil para probe MIDAS",
    });
    probes.push({
      id: "planilhas_forjador",
      ok: false,
      detail: "sem perfil para probe planilhas",
    });
  }

  const failed = probes.filter((p) => !p.ok);
  const filesToApply = [
    ...new Set(
      failed.flatMap((probe) => {
        const patch = MIGRATION_PATCHES.find((p) => p.id === probe.id);
        return patch?.files ?? [];
      }),
    ),
  ];

  return {
    probes,
    failed,
    allOk: failed.length === 0,
    filesToApply,
    probeUserId,
  };
}

async function probeAbdomenThermal(admin, userId) {
  const probeIds = [88010, 88011];

  await admin.from("historico_treinos").delete().eq("cliente_id", userId).in("exercicio_id", probeIds);

  await admin.from("evolucao_membro_estase").delete().eq("user_id", userId);

  const rows = [
    {
      cliente_id: userId,
      exercicio_id: 88010,
      exercicio_nome: "ARGOS probe crunch",
      musculo: "abdomen",
      peso_atual: 20,
      repeticoes: 1,
      series: 4,
      status: "CONCLUÍDO",
    },
    {
      cliente_id: userId,
      exercicio_id: 88011,
      exercicio_nome: "ARGOS probe prancha",
      musculo: "abdomen",
      peso_atual: 60,
      repeticoes: 1,
      series: 3,
      status: "CONCLUÍDO",
    },
  ];

  const { error: insertErr } = await admin.from("historico_treinos").insert(rows);
  if (insertErr) {
    return { id: "abdomen_thermal", ok: false, detail: insertErr.message };
  }

  const { data, error } = await admin.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: userId,
  });

  await admin.from("historico_treinos").delete().eq("cliente_id", userId).in("exercicio_id", probeIds);

  if (error) {
    return { id: "abdomen_thermal", ok: false, detail: error.message };
  }

  const abdomenMetric = Number(data?.abdomen?.metrica_bruta ?? 0);
  const ignicao = Number(data?.indice_ignicao ?? 0);
  // TLU bruto: crunch 20 + prancha 60s/4 = 15 → 35 (pico/dia/exercício · rep=1)
  const rawTlu = 35;
  const purityFactor = ignicao >= 50 ? 1 : 0.6;
  const expected = rawTlu * purityFactor;
  const ok = Math.abs(abdomenMetric - expected) <= 0.5;

  // Pré-migration: SUM(series × repeticoes) com rep=1 → 7
  if (abdomenMetric > 0 && abdomenMetric <= 10) {
    return {
      id: "abdomen_thermal",
      ok: false,
      detail: `abdomen metrica_bruta=${abdomenMetric} (legado SUM(series×reps) — migration pendente)`,
    };
  }

  return {
    id: "abdomen_thermal",
    ok,
    detail: ok
      ? `abdomen TLU=${abdomenMetric} (bruto=${rawTlu} · ignição=${ignicao}%)`
      : `abdomen metrica_bruta=${abdomenMetric} (esperado ~${expected} · bruto=${rawTlu} · ignição=${ignicao}%)`,
  };
}

async function probeOmbrosIsolation(admin, userId) {
  const probeTag = `argos-ombros-${Date.now()}`;

  await admin
    .from("historico_treinos")
    .delete()
    .eq("cliente_id", userId)
    .eq("exercicio_id", PROBE_EXERCISE_ID);

  const { error: insertErr } = await admin.from("historico_treinos").insert({
    cliente_id: userId,
    exercicio_id: PROBE_EXERCISE_ID,
    exercicio_nome: probeTag,
    musculo: "ombros",
    peso_atual: 40,
    repeticoes: 10,
    series: 4,
    status: "CONCLUÍDO",
  });

  if (insertErr) {
    return {
      id: "ombros_grupo_isolado",
      ok: false,
      detail: insertErr.message,
    };
  }

  const { data, error } = await admin.rpc("obter_calor_muscular_atleta", {
    target_atleta_id: userId,
  });

  await admin
    .from("historico_treinos")
    .delete()
    .eq("cliente_id", userId)
    .eq("exercicio_id", PROBE_EXERCISE_ID);

  if (error) {
    return {
      id: "ombros_grupo_isolado",
      ok: false,
      detail: error.message,
    };
  }

  const ombrosMetric = Number(data?.ombros?.metrica_bruta ?? 0);
  const ok = ombrosMetric > 0;

  return {
    id: "ombros_grupo_isolado",
    ok,
    detail: ok ? `ombros calor=${ombrosMetric}` : "ombros metrica_bruta=0 após treino probe",
  };
}

async function probeMidasGrowth(admin, userId) {
  const tableChecks = await Promise.all([
    admin.from("planos_atletas").select("atleta_id").eq("atleta_id", userId).maybeSingle(),
    admin.from("calendario_ignicao").select("id").eq("atleta_id", userId).limit(1).maybeSingle(),
    admin.from("historico_cargas").select("id").eq("atleta_id", userId).limit(1).maybeSingle(),
  ]);

  const tableErr = tableChecks.find((result) => result.error)?.error;
  if (tableErr) {
    return {
      id: "midas_growth",
      ok: false,
      detail: tableErr.message,
    };
  }

  const { data: rpcData, error: rpcErr } = await admin.rpc("get_muscular_evolution");
  if (rpcErr?.code === "PGRST202") {
    return {
      id: "midas_growth",
      ok: false,
      detail: "RPC get_muscular_evolution ausente",
    };
  }

  const shape = assertMidasEvolutionJson(rpcData);
  if (!shape.ok && rpcData?.code === 401) {
    return {
      id: "midas_growth",
      ok: true,
      detail: "tabelas OK · RPC bloqueia service_role (auth.uid)",
    };
  }

  return {
    id: "midas_growth",
    ok: shape.ok,
    detail: shape.ok ? shape.detail : shape.detail,
  };
}

async function probePlanilhasForjador(admin, userId) {
  const { data, error } = await admin
    .from("planilhas_forjador")
    .select("dia_semana, grupo_muscular")
    .eq("atleta_id", userId);

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return {
      id: "planilhas_forjador",
      ok: false,
      detail: "tabela planilhas_forjador ausente",
    };
  }

  if (error) {
    return {
      id: "planilhas_forjador",
      ok: false,
      detail: error.message,
    };
  }

  const rows = data ?? [];
  const hasSixDays = [1, 2, 3, 4, 5, 6].every((day) =>
    rows.some((row) => Number(row.dia_semana) === day),
  );

  return {
    id: "planilhas_forjador",
    ok: rows.length > 0,
    detail: rows.length
      ? hasSixDays
        ? "grade Seg–Sáb ok"
        : `${rows.length} dia(s) · seed parcial`
      : "sem linhas para atleta probe",
  };
}

function printReport(result) {
  console.log("\n=== ARGOS · verify migrations ===\n");
  for (const probe of result.probes) {
    console.log(`${probe.ok ? "[PASS]" : "[FAIL]"} ${probe.id} — ${probe.detail}`);
  }
  console.log("");
  if (result.allOk) {
    console.log(`Todas as ${result.probes.length} probes OK.`);
  } else {
    console.log(`${result.failed.length} probe(s) pendente(s).`);
    if (result.filesToApply.length > 0) {
      console.log("\nMigrations sugeridas:");
      for (const file of result.filesToApply) {
        console.log(`  supabase/migrations/${file}`);
      }
    }
  }
  console.log("");
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await runMigrationProbes(admin, { probeOmbrosIsolation: true });
  printReport(result);
  process.exit(result.allOk ? 0 : 2);
}
