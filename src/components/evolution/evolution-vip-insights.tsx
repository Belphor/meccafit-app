"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MUSCLE_GROUP_LABELS,
  type TrainingMuscleGroup,
  WEEKDAY_LABELS,
} from "@/lib/training-week";
import { resolveBrasiliaTrainingWeekdayIndex } from "@/lib/brasilia-time";
import {
  formatCalorMembroMetric,
  MUSCLE_LABELS,
  type MuscleCalorRow,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import {
  formatScientificDate,
  formatScientificNumber,
  parseScientificFromServerRow,
  SCIENTIFIC_SKINFOLD_IDS,
  SCIENTIFIC_SKINFOLD_LABELS,
  sumScientificSkinfolds,
} from "@/lib/scientific-metrics-types";
import {
  ACOMPANHAMENTO_BRASAS_SUBTITLE,
  ACOMPANHAMENTO_LOADING,
  ACOMPANHAMENTO_MEDIDAS_EMPTY,
  ACOMPANHAMENTO_MEDIDAS_TITLE,
} from "@/lib/client-lore-copy";
import { formatThermalLevelWithContext } from "@/lib/fenix-evolution-glossary";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";
import { VIP_MEDIDAS_UPDATE_EVENT, type VipMedidasUpdateDetail } from "@/lib/vip-medidas-events";
import { supabase } from "@/lib/supabase";

const SOVEREIGN_TO_TRAINING: Record<SovereignMuscleId, TrainingMuscleGroup> = {
  PEITO: "PEITO",
  COSTAS: "COSTAS",
  PERNAS: "PERNAS",
  OMBROS: "OMBROS",
  BRACOS: "BRACOS",
  ABDOMEN: "ABDOMEN",
};

type EvolutionVipInsightsProps = {
  userId: string;
  activeMuscle?: SovereignMuscleId;
  calorRows?: MuscleCalorRow[];
  enabled: boolean;
  variant?: "card" | "inline" | "full";
};

type MeasuresSnapshot = {
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  heightCm: number | null;
  skinfolds: ReturnType<typeof parseScientificFromServerRow>["skinfolds"];
};

export function EvolutionVipInsights({
  userId,
  activeMuscle,
  calorRows = [],
  enabled,
  variant = "card",
}: EvolutionVipInsightsProps) {
  const [measures, setMeasures] = useState<MeasuresSnapshot | null>(null);
  const [todayGroups, setTodayGroups] = useState<TrainingMuscleGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInsights = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    const weekday = resolveBrasiliaTrainingWeekdayIndex();

    const [measuresResult, planResult] = await Promise.all([
      supabase
        .from("vip_medidas_corporais")
        .select("peso_kg, altura_cm, perimetros, medido_em")
        .eq("client_id", userId)
        .eq("activo", true)
        .maybeSingle(),
      supabase
        .from("planilhas_forjador")
        .select("grupo_muscular")
        .eq("atleta_id", userId)
        .eq("dia_semana", weekday)
        .order("ordem", { ascending: true }),
    ]);

    if (measuresResult.data) {
      const parsed = parseScientificFromServerRow(measuresResult.data);
      setMeasures({
        measuredAt: parsed.measuredAt,
        weightKg: parsed.weightKg,
        bodyFatPct: parsed.bodyFatPct,
        leanMassKg: parsed.leanMassKg,
        heightCm: parsed.heightCm,
        skinfolds: parsed.skinfolds,
      });
    } else {
      setMeasures(null);
    }

    const groups = (planResult.data ?? [])
      .map((row) => String(row.grupo_muscular ?? "").toUpperCase())
      .filter(Boolean) as TrainingMuscleGroup[];

    setTodayGroups(groups);
    setLoading(false);
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadInsights();
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadInsights]);

  useEffect(() => {
    if (!enabled) return;

    const onMedidasUpdate = (event: Event) => {
      const detail = (event as CustomEvent<VipMedidasUpdateDetail>).detail;
      if (detail?.clientId === userId) {
        void loadInsights();
      }
    };

    window.addEventListener(VIP_MEDIDAS_UPDATE_EVENT, onMedidasUpdate);
    return () => {
      window.removeEventListener(VIP_MEDIDAS_UPDATE_EVENT, onMedidasUpdate);
    };
  }, [enabled, loadInsights, userId]);

  if (!enabled) return null;

  const weekday = resolveBrasiliaTrainingWeekdayIndex();
  const trainingMuscle = activeMuscle ? SOVEREIGN_TO_TRAINING[activeMuscle] : null;
  const scheduledToday = trainingMuscle ? todayGroups.includes(trainingMuscle) : false;
  const activeCalorRow = activeMuscle
    ? calorRows.find((item) => item.membro_principal === activeMuscle)
    : null;
  const activeCalorMetric = activeCalorRow ? formatCalorMembroMetric(activeCalorRow) : null;

  const wrapperClass =
    variant === "inline"
      ? "mt-4 space-y-3 border-t border-amber-500/15 pt-4"
      : variant === "full"
        ? "space-y-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4"
        : "mt-4 space-y-3 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4";

  const skinfoldTotal = measures ? sumScientificSkinfolds(measures.skinfolds) : null;

  if (variant === "inline" && activeMuscle) {
    return (
      <div className={wrapperClass}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
          Acompanhamento · {MUSCLE_LABELS[activeMuscle]}
        </p>

        {loading ? (
          <p className="text-xs text-neutral-500">{ACOMPANHAMENTO_LOADING}</p>
        ) : (
          <>
            {activeCalorRow && activeCalorMetric ? (
              <div className="rounded-lg border border-cyan-500/15 bg-black/30 p-3 text-xs">
                <p className="text-neutral-500">{ACOMPANHAMENTO_BRASAS_SUBTITLE}</p>
                <p className="mt-2 text-sm font-semibold text-amber-50">
                  {formatThermalLevelWithContext(activeCalorRow.nivel_calculado, "muscle")}
                  {activeCalorRow.is_frozen ? " · Fora da rotina" : ""}
                </p>
                <p className="mt-1 text-neutral-400">
                  {activeCalorMetric.label}:{" "}
                  <span className="text-amber-200/85">{activeCalorMetric.value}</span>
                </p>
                <p className="mt-0.5 text-neutral-600">{activeCalorMetric.hint}</p>
                {!activeCalorRow.is_frozen &&
                (activeCalorRow.metrica_bruta == null || activeCalorRow.metrica_bruta <= 0) ? (
                  <p className="mt-2 text-[11px] text-amber-200/75">
                    Nenhum registro deste grupo nos últimos 14 dias. Conclua treinos com carga para
                    acumular {VTC_DISPLAY_NAME} nas Brasas Musculares.
                  </p>
                ) : null}
              </div>
            ) : null}

            {trainingMuscle ? (
              <p className="text-sm text-neutral-300">
                <span className="text-neutral-500">Rotina de hoje ({WEEKDAY_LABELS[weekday]}): </span>
                {scheduledToday
                  ? `${MUSCLE_GROUP_LABELS[trainingMuscle]} está prescrito para hoje`
                  : `${MUSCLE_GROUP_LABELS[trainingMuscle]} não está na planilha de hoje`}
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
        {ACOMPANHAMENTO_MEDIDAS_TITLE}
      </p>

      {loading ? (
        <p className="text-xs text-neutral-500">{ACOMPANHAMENTO_LOADING}</p>
      ) : measures ? (
        <>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-800/80 bg-black/30 p-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
            <MetricCell label="Peso" value={`${measures.weightKg} kg`} />
            <MetricCell
              label="Altura"
              value={
                measures.heightCm != null ? `${formatScientificNumber(measures.heightCm)} cm` : "Sem dado"
              }
            />
            <MetricCell
              label="Gordura"
              value={
                measures.bodyFatPct != null
                  ? `${formatScientificNumber(measures.bodyFatPct)}%`
                  : "Sem dado"
              }
            />
            <MetricCell
              label="Massa magra"
              value={
                measures.leanMassKg != null
                  ? `${formatScientificNumber(measures.leanMassKg)} kg`
                  : "Sem dado"
              }
            />
            <MetricCell label="Medido em" value={formatScientificDate(measures.measuredAt)} />
          </div>

          {variant === "full" ? (
            <div className="rounded-lg border border-neutral-800/80 bg-black/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Dobras cutâneas (mm)
                {skinfoldTotal != null ? (
                  <span className="ml-2 text-amber-200/80">
                    · Total {formatScientificNumber(skinfoldTotal)}
                  </span>
                ) : null}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
                {SCIENTIFIC_SKINFOLD_IDS.map((id) => (
                  <div key={id}>
                    <p className="text-neutral-500">{SCIENTIFIC_SKINFOLD_LABELS[id]}</p>
                    <p className="font-medium text-neutral-100">
                      {formatScientificNumber(measures.skinfolds[id])}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-neutral-500">{ACOMPANHAMENTO_MEDIDAS_EMPTY}</p>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className="font-medium text-neutral-100">{value}</p>
    </div>
  );
}
