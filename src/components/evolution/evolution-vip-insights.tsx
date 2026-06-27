"use client";

import { useEffect, useState } from "react";
import {
  MUSCLE_GROUP_LABELS,
  type TrainingMuscleGroup,
  WEEKDAY_LABELS,
} from "@/lib/training-week";
import { resolveBrasiliaTrainingWeekdayIndex } from "@/lib/brasilia-time";
import { MUSCLE_LABELS, type SovereignMuscleId } from "@/components/evolution/human-body-constants";
import { parseScientificFromServerRow } from "@/lib/scientific-metrics-types";
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
  activeMuscle: SovereignMuscleId;
  enabled: boolean;
  variant?: "card" | "inline";
};

type MeasuresSnapshot = {
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  heightCm: number | null;
};

export function EvolutionVipInsights({
  userId,
  activeMuscle,
  enabled,
  variant = "card",
}: EvolutionVipInsightsProps) {
  const [measures, setMeasures] = useState<MeasuresSnapshot | null>(null);
  const [todayGroups, setTodayGroups] = useState<TrainingMuscleGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMeasures(null);
      setTodayGroups([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
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

      if (cancelled) return;

      if (measuresResult.data) {
        const parsed = parseScientificFromServerRow(measuresResult.data);
        setMeasures({
          measuredAt: parsed.measuredAt,
          weightKg: parsed.weightKg,
          bodyFatPct: parsed.bodyFatPct,
          leanMassKg: parsed.leanMassKg,
          heightCm: parsed.heightCm,
        });
      } else {
        setMeasures(null);
      }

      const groups = (planResult.data ?? [])
        .map((row) => String(row.grupo_muscular ?? "").toUpperCase())
        .filter(Boolean) as TrainingMuscleGroup[];

      setTodayGroups(groups);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  if (!enabled) return null;

  const trainingMuscle = SOVEREIGN_TO_TRAINING[activeMuscle];
  const weekday = resolveBrasiliaTrainingWeekdayIndex();
  const scheduledToday = todayGroups.includes(trainingMuscle);

  const wrapperClass =
    variant === "inline"
      ? "mt-4 space-y-3 border-t border-amber-500/15 pt-4"
      : "mt-4 space-y-3 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4";

  return (
    <div className={wrapperClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
        Acompanhamento VIP · {MUSCLE_LABELS[activeMuscle]}
      </p>

      {loading ? (
        <p className="text-xs text-neutral-500">Carregando dados do personal…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p className="text-neutral-300">
              <span className="text-neutral-500">Treino de hoje ({WEEKDAY_LABELS[weekday]}): </span>
              {todayGroups.length > 0
                ? todayGroups.map((group) => MUSCLE_GROUP_LABELS[group]).join(", ")
                : "Não definido pelo personal"}
            </p>
            <p className="text-neutral-300">
              <span className="text-neutral-500">Foco seleccionado: </span>
              {scheduledToday
                ? `${MUSCLE_GROUP_LABELS[trainingMuscle]} está na rotina de hoje`
                : `${MUSCLE_GROUP_LABELS[trainingMuscle]} não está na rotina de hoje`}
            </p>
          </div>

          {measures ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-800/80 bg-black/30 p-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-neutral-500">Peso</p>
                <p className="font-medium text-neutral-100">{measures.weightKg} kg</p>
              </div>
              <div>
                <p className="text-neutral-500">Gordura</p>
                <p className="font-medium text-neutral-100">
                  {measures.bodyFatPct != null ? `${measures.bodyFatPct}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Massa magra</p>
                <p className="font-medium text-neutral-100">
                  {measures.leanMassKg != null ? `${measures.leanMassKg} kg` : "—"}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Medido em</p>
                <p className="font-medium text-neutral-100">
                  {new Date(measures.measuredAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Ainda não há medidas publicadas pelo seu personal. Elas aparecem aqui quando forem
              sincronizadas na aba Medidas VIP.
            </p>
          )}
        </>
      )}
    </div>
  );
}
