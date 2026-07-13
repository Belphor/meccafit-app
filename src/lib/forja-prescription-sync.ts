import { supabase } from "@/lib/supabase";
import type { ForjaBondedAthlete, ForjaPrescriptionDraft } from "@/lib/forja-dashboard";
import { resolveCatalogExerciseId } from "@/lib/forja-exercise-resolve";
import {
  derivePrimaryRepTarget,
  normalizeRepsPerSetDraft,
  type PrescriptionProgressionId,
  type PrescriptionRepValue,
} from "@/lib/prescription-progression";
import { TRAINING_MUSCLE_GROUPS, type TrainingMuscleGroup, type WeekdayIndex } from "@/lib/training-week";
import { batchUpsertPlanilhasForjador } from "@/lib/forja-sovereign-actions";
import type { PlanilhaImportRow } from "@/lib/forja-planilha-import";
import { publishForjaTreinoUpdate } from "@/lib/forja-treino-events";
import { toPlayableVideoUrl } from "@/lib/video-source";

export type ForjaPrescriptionSyncResult =
  | { ok: true; prescriptionId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

const REST_SEC_MIN = 15;
const REST_SEC_MAX = 600;
const CARDIO_MIN_MINUTES = 5;
const CARDIO_MAX_MINUTES = 180;

function parseMuscleGroup(raw: string): TrainingMuscleGroup | null {
  const key = raw.trim().toUpperCase();
  return TRAINING_MUSCLE_GROUPS.includes(key as TrainingMuscleGroup)
    ? (key as TrainingMuscleGroup)
    : null;
}

function parseRestSeconds(raw: string, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value) || value < REST_SEC_MIN || value > REST_SEC_MAX) {
    return { ok: false, message: `${label} inválido (${REST_SEC_MIN}–${REST_SEC_MAX} s).` };
  }

  return { ok: true, value };
}

function parseVideoUrl(raw: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 2000) {
    return { ok: false, message: "Link do vídeo muito longo." };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, message: "Informe um link válido começando com http:// ou https://." };
  }
  const playable = toPlayableVideoUrl(trimmed);
  return { ok: true, value: playable || trimmed };
}

function parseCardioMinutes(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value) || value < CARDIO_MIN_MINUTES || value > CARDIO_MAX_MINUTES) {
    return {
      ok: false,
      message: `Meta de cardio inválida (${CARDIO_MIN_MINUTES}–${CARDIO_MAX_MINUTES} min).`,
    };
  }

  return { ok: true, value };
}

function parseTrainingDay(raw: string): WeekdayIndex | null {
  const value = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(value) || value < 1 || value > 6) return null;
  return value as WeekdayIndex;
}

export function parsePrescriptionDraft(
  draft: ForjaPrescriptionDraft,
): { ok: true; payload: {
    diaSemana: WeekdayIndex;
    musculosDoDia: TrainingMuscleGroup[];
    exercicioId: string;
    grupoMuscular: TrainingMuscleGroup;
    repeticoes: number;
    repeticoesPorSerie: PrescriptionRepValue[];
    progressaoAlternativas: PrescriptionProgressionId[];
    series: number;
    label: string;
    videoUrl: string | null;
    descansoSegundos: number | null;
    descansoPadraoSeg: number | null;
    cardioMetaMinutos: number | null;
  } } | { ok: false; message: string } {
  const label = draft.exercicio.trim();
  const series = Number.parseInt(draft.series.trim() || "3", 10);
  const grupoMuscular = parseMuscleGroup(draft.grupoMuscular);
  const diaSemana = parseTrainingDay(String(draft.diaSemana));

  if (!label) {
    return { ok: false, message: "Informe o nome do exercício." };
  }
  if (!diaSemana) {
    return { ok: false, message: "Selecione o dia da planilha (Segunda a Sábado)." };
  }
  if (!grupoMuscular) {
    return { ok: false, message: "Selecione o grupo muscular." };
  }
  const musculosDoDia = [...new Set(draft.musculosDoDia)];
  if (musculosDoDia.length === 0) {
    return { ok: false, message: "Marque os grupos musculares deste dia." };
  }
  if (!musculosDoDia.includes(grupoMuscular)) {
    musculosDoDia.push(grupoMuscular);
  }
  if (musculosDoDia.length > 5) {
    return { ok: false, message: "Máximo de 5 grupos por dia." };
  }
  if (!Number.isFinite(series) || series < 1 || series > 20) {
    return { ok: false, message: "Séries inválidas (1–20)." };
  }

  const repeticoesPorSerie = normalizeRepsPerSetDraft(draft.repeticoesPorSerie, series);
  if (repeticoesPorSerie.length !== series) {
    return { ok: false, message: "Defina repetições para cada série." };
  }

  const videoUrl = parseVideoUrl(draft.videoUrl);
  if (!videoUrl.ok) return videoUrl;

  const descansoExercicio = parseRestSeconds(draft.descansoSegundos, "Descanso do exercício");
  if (!descansoExercicio.ok) return descansoExercicio;

  const descansoPadrao = parseRestSeconds(draft.descansoPadraoSeg, "Descanso padrão");
  if (!descansoPadrao.ok) return descansoPadrao;

  const cardioMeta = parseCardioMinutes(draft.cardioMetaMinutos);
  if (!cardioMeta.ok) return cardioMeta;

  return {
    ok: true,
    payload: {
      diaSemana,
      musculosDoDia,
      exercicioId: resolveCatalogExerciseId(grupoMuscular, label),
      grupoMuscular,
      repeticoes: derivePrimaryRepTarget(repeticoesPorSerie),
      repeticoesPorSerie,
      progressaoAlternativas: draft.progressaoAlternativas,
      series,
      label,
      videoUrl: videoUrl.value,
      descansoSegundos: descansoExercicio.value,
      descansoPadraoSeg: descansoPadrao.value,
      cardioMetaMinutos: cardioMeta.value,
    },
  };
}

async function upsertTreinoConfig(
  athlete: ForjaBondedAthlete,
  operatorId: string,
  config: { descansoPadraoSeg?: number | null; cardioMetaMinutos?: number | null },
): Promise<ForjaPrescriptionSyncResult | null> {
  const { data: existing } = await supabase
    .from("config_treino_atleta")
    .select("atleta_id, descanso_padrao_seg, cardio_meta_minutos")
    .eq("atleta_id", athlete.clientId)
    .maybeSingle();

  const descansoPadraoSeg =
    config.descansoPadraoSeg ??
    Number(existing?.descanso_padrao_seg ?? 90);
  const cardioMetaMinutos =
    config.cardioMetaMinutos ??
    Number(existing?.cardio_meta_minutos ?? 30);

  if (existing?.atleta_id) {
    const { error } = await supabase
      .from("config_treino_atleta")
      .update({
        descanso_padrao_seg: descansoPadraoSeg,
        cardio_meta_minutos: cardioMetaMinutos,
        forjador_id: operatorId,
      })
      .eq("atleta_id", athlete.clientId);

    if (error) {
      return { ok: false, code: "NETWORK", message: error.message };
    }
    return null;
  }

  const { error } = await supabase.from("config_treino_atleta").insert({
    atleta_id: athlete.clientId,
    forjador_id: operatorId,
    descanso_padrao_seg: descansoPadraoSeg,
    cardio_meta_minutos: cardioMetaMinutos,
  });

  if (error) {
    return { ok: false, code: "NETWORK", message: error.message };
  }

  return null;
}

function buildPrescriptionRpcPayload(
  payload: {
    diaSemana: WeekdayIndex;
    exercicioId: string;
    grupoMuscular: TrainingMuscleGroup;
    repeticoes: number;
    repeticoesPorSerie: PrescriptionRepValue[];
    progressaoAlternativas: PrescriptionProgressionId[];
    series: number;
    label: string;
    videoUrl?: string | null;
    descansoSegundos: number | null;
    pesoPrescrito?: number | null;
  },
  ordem = 1,
) {
  return {
    dia_semana: payload.diaSemana,
    grupo_muscular: payload.grupoMuscular,
    exercicio_id: payload.exercicioId,
    series_alvo: payload.series,
    repeticoes_alvo: payload.repeticoes,
    descanso_segundos: payload.descansoSegundos,
    peso_prescrito: payload.pesoPrescrito ?? null,
    progressao_alternativas: payload.progressaoAlternativas,
    repeticoes_por_serie: payload.repeticoesPorSerie.map((value) =>
      value === "FALHA" ? "FALHA" : value,
    ),
    observacoes: payload.label,
    video_url: payload.videoUrl ?? null,
    ordem,
  };
}

async function upsertPrescriptionViaRpc(
  athleteId: string,
  payload: ReturnType<typeof buildPrescriptionRpcPayload>,
): Promise<ForjaPrescriptionSyncResult> {
  const { data, error } = await supabase.rpc("argos_forja_upsert_prescricao_treino", {
    p_atleta_id: athleteId,
    p_payload: payload,
  });

  if (error) {
    const rlsHint = error.message?.toLowerCase().includes("row-level security");
    return {
      ok: false,
      code: rlsHint ? "RLS" : "NETWORK",
      message: error.message,
    };
  }

  const record = (data as unknown) as { ok?: boolean; id?: string } | null;
  if (!record?.id) {
    return { ok: false, code: "NETWORK", message: "Prescrição não confirmada." };
  }

  return { ok: true, prescriptionId: record.id };
}

export async function fetchPlanilhaMusclesForDay(
  athleteId: string,
  diaSemana: WeekdayIndex,
): Promise<TrainingMuscleGroup[]> {
  const { data, error } = await supabase
    .from("planilhas_forjador")
    .select("grupo_muscular, ordem")
    .eq("atleta_id", athleteId)
    .eq("dia_semana", diaSemana)
    .order("ordem");

  if (error || !data) return [];

  const allowed = new Set<string>(TRAINING_MUSCLE_GROUPS);
  return data
    .map((row) => String(row.grupo_muscular ?? "").trim().toUpperCase())
    .filter((g): g is TrainingMuscleGroup => allowed.has(g));
}

export async function syncPlanilhaDayMuscles(
  athleteId: string,
  diaSemana: WeekdayIndex,
  muscles: TrainingMuscleGroup[],
): Promise<ForjaPrescriptionSyncResult | null> {
  if (muscles.length === 0) {
    return { ok: false, code: "VALIDATION", message: "Marque pelo menos um grupo muscular para este dia." };
  }
  if (muscles.length > 5) {
    return { ok: false, code: "VALIDATION", message: "Máximo de 5 grupos por dia." };
  }

  const { data: existing, error } = await supabase
    .from("planilhas_forjador")
    .select("dia_semana, grupo_muscular, ordem")
    .eq("atleta_id", athleteId);

  if (error) {
    return { ok: false, code: "NETWORK", message: error.message };
  }

  const otherDays = (existing ?? []).filter((row) => row.dia_semana !== diaSemana);
  const dayRows = muscles.map((grupo, index) => ({
    dia_semana: diaSemana,
    grupo_muscular: grupo,
    ordem: index + 1,
  }));

  const merged = [
    ...otherDays.map((row) => ({
      dia_semana: Number(row.dia_semana),
      grupo_muscular: String(row.grupo_muscular),
      ordem: Number(row.ordem ?? 1),
    })),
    ...dayRows,
  ];

  const result = await batchUpsertPlanilhasForjador(athleteId, merged);
  if (!result.ok) {
    return { ok: false, code: "NETWORK", message: result.message };
  }

  return null;
}

function planilhaSlotKey(diaSemana: number, grupoMuscular: string): string {
  return `${diaSemana}:${grupoMuscular.trim().toUpperCase()}`;
}

/** Remove prescrições que não pertencem mais à planilha importada (dia ou grupo ausente). */
export async function prunePrescriptionsAfterRotinaImport(
  athleteId: string,
  planilhaRows: Array<{ dia_semana: number; grupo_muscular: string }>,
): Promise<ForjaPrescriptionSyncResult | null> {
  const allowed = new Set(planilhaRows.map((row) => planilhaSlotKey(row.dia_semana, row.grupo_muscular)));

  const { data, error } = await supabase
    .from("prescricoes_treino_forjador")
    .select("id, dia_semana, grupo_muscular")
    .eq("atleta_id", athleteId);

  if (error) {
    return { ok: false, code: "NETWORK", message: error.message };
  }

  const idsToDelete = (data ?? [])
    .filter((row) => !allowed.has(planilhaSlotKey(Number(row.dia_semana), String(row.grupo_muscular))))
    .map((row) => String(row.id));

  if (idsToDelete.length === 0) return null;

  const { error: deleteError } = await supabase
    .from("prescricoes_treino_forjador")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    return { ok: false, code: "NETWORK", message: deleteError.message };
  }

  return null;
}

/**
 * Prescrição de treino para qualquer atleta vinculado ao forjador.
 * Persiste em prescricoes_treino_forjador + config_treino_atleta (descanso padrão).
 */
export async function syncForjaPersonalPrescription(
  athlete: ForjaBondedAthlete,
  draft: ForjaPrescriptionDraft,
): Promise<ForjaPrescriptionSyncResult> {
  const parsed = parsePrescriptionDraft(draft);
  if (!parsed.ok) {
    return { ok: false, code: "VALIDATION", message: parsed.message };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const { payload } = parsed;

    const planilhaError = await syncPlanilhaDayMuscles(
      athlete.clientId,
      payload.diaSemana,
      payload.musculosDoDia,
    );
    if (planilhaError) return planilhaError;

    if (payload.descansoPadraoSeg !== null || payload.cardioMetaMinutos !== null) {
      const configError = await upsertTreinoConfig(athlete, operatorId, {
        descansoPadraoSeg: payload.descansoPadraoSeg,
        cardioMetaMinutos: payload.cardioMetaMinutos,
      });
      if (configError) return configError;
    }

    return upsertPrescriptionViaRpc(
      athlete.clientId,
      buildPrescriptionRpcPayload(payload),
    ).then((result) => {
      if (result.ok) {
        publishForjaTreinoUpdate(athlete.clientId);
      }
      return result;
    });
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao salvar prescrição." };
  }
}

export type TreinoPlanilhaBatchResult =
  | { ok: true; upserted: number }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

function buildPlanilhaRowsFromTreinoImport(
  rows: Array<{ diaSemana: WeekdayIndex; grupoMuscular: TrainingMuscleGroup }>,
): PlanilhaImportRow[] {
  const ordemByDay = new Map<number, number>();
  const seen = new Set<string>();
  const planilhaRows: PlanilhaImportRow[] = [];

  for (const row of rows) {
    const slotKey = planilhaSlotKey(row.diaSemana, row.grupoMuscular);
    if (seen.has(slotKey)) continue;
    seen.add(slotKey);

    const ordem = (ordemByDay.get(row.diaSemana) ?? 0) + 1;
    ordemByDay.set(row.diaSemana, ordem);

    planilhaRows.push({
      dia_semana: row.diaSemana,
      grupo_muscular: row.grupoMuscular,
      ordem,
    });
  }

  return planilhaRows;
}

export async function batchSyncTreinoPrescriptionsFromPlanilha(
  athlete: ForjaBondedAthlete,
  rows: Array<{
    diaSemana: WeekdayIndex;
    grupoMuscular: TrainingMuscleGroup;
    exercicio: string;
    videoUrl?: string | null;
    pesoPrescrito?: number | null;
    repeticoes: number;
    repeticoesPorSerie?: PrescriptionRepValue[];
    progressaoAlternativas?: PrescriptionProgressionId[];
    series: number;
    descansoSegundos: number | null;
  }>,
  options?: { cardioMetaMinutos?: number | null },
): Promise<TreinoPlanilhaBatchResult> {
  if (rows.length === 0) {
    return { ok: false, code: "VALIDATION", message: "Planilha sem linhas válidas." };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const planilhaRows = buildPlanilhaRowsFromTreinoImport(rows);
    const planilhaResult = await batchUpsertPlanilhasForjador(athlete.clientId, planilhaRows);
    if (!planilhaResult.ok) {
      return { ok: false, code: "NETWORK", message: planilhaResult.message };
    }

    if (options?.cardioMetaMinutos != null) {
      const configError = await upsertTreinoConfig(athlete, operatorId, {
        cardioMetaMinutos: options.cardioMetaMinutos,
      });
      if (configError && !configError.ok) {
        return { ok: false, code: configError.code, message: configError.message };
      }
    }

    const { error: deleteError } = await supabase
      .from("prescricoes_treino_forjador")
      .delete()
      .eq("atleta_id", athlete.clientId);

    if (deleteError) {
      return { ok: false, code: "NETWORK", message: deleteError.message };
    }

    let upserted = 0;
    const ordemByDayMuscle = new Map<string, number>();

    for (const row of rows) {
      const diaSemana = row.diaSemana;
      const ordemKey = planilhaSlotKey(diaSemana, row.grupoMuscular);
      const ordem = (ordemByDayMuscle.get(ordemKey) ?? 0) + 1;
      ordemByDayMuscle.set(ordemKey, ordem);

      const exercicioId = resolveCatalogExerciseId(row.grupoMuscular, row.exercicio);
      const repeticoesPorSerie =
        row.repeticoesPorSerie && row.repeticoesPorSerie.length > 0
          ? row.repeticoesPorSerie
          : Array.from({ length: row.series }, () => row.repeticoes);

      const result = await upsertPrescriptionViaRpc(
        athlete.clientId,
        buildPrescriptionRpcPayload(
          {
            diaSemana,
            exercicioId,
            grupoMuscular: row.grupoMuscular,
            repeticoes: derivePrimaryRepTarget(repeticoesPorSerie),
            repeticoesPorSerie,
            progressaoAlternativas: row.progressaoAlternativas ?? [],
            series: row.series,
            label: row.exercicio.trim(),
            videoUrl: row.videoUrl ?? null,
            descansoSegundos: row.descansoSegundos,
            pesoPrescrito: row.pesoPrescrito ?? null,
          },
          ordem,
        ),
      );

      if (!result.ok) {
        return { ok: false, code: result.code, message: result.message };
      }

      upserted += 1;
    }

    publishForjaTreinoUpdate(athlete.clientId);
    return { ok: true, upserted };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao importar planilha de treino." };
  }
}
