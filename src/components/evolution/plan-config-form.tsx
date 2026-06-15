"use client";

import { useCallback, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  MUSCLE_LABELS,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_TAP_TARGET,
  MAGMA_SPECTRUM,
} from "@/lib/dashboard-config";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/types/database.types";

/** Ordem 2×3 da matriz muscular · Aba 3 configurar */
const PLAN_MATRIX_MUSCLES: readonly SovereignMuscleId[] = [
  "PEITO",
  "COSTAS",
  "PERNAS",
  "OMBROS",
  "BRACOS",
  "ABDOMEN",
] as const;

export const PLAN_SESSIONS_MIN = 4;
export const PLAN_SESSIONS_MAX = 28;
export const PLAN_SESSIONS_DEFAULT = 16;

export type AthletePlanConfig = {
  totalTreinosMensaisPlanejados: number;
  gruposObrigatorios: SovereignMuscleId[];
};

export type PlanConfigFormState = {
  totalTreinosMensaisPlanejados: number;
  gruposObrigatorios: SovereignMuscleId[];
};

type PlanConfigFormProps = {
  userId: string;
  initialPlan?: AthletePlanConfig;
};

type SubmitPhase = "idle" | "syncing" | "success" | "error";

function clampSessions(value: number): number {
  return Math.min(PLAN_SESSIONS_MAX, Math.max(PLAN_SESSIONS_MIN, Math.round(value)));
}

function normalizeGruposObrigatorios(values: string[] | null | undefined): SovereignMuscleId[] {
  if (!Array.isArray(values)) return [];

  const allowed = new Set<string>(PLAN_MATRIX_MUSCLES);
  const seen = new Set<SovereignMuscleId>();

  for (const raw of values) {
    const id = String(raw ?? "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "") as SovereignMuscleId;

    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
  }

  return PLAN_MATRIX_MUSCLES.filter((muscle) => seen.has(muscle));
}

function buildInitialState(initialPlan?: AthletePlanConfig): PlanConfigFormState {
  return {
    totalTreinosMensaisPlanejados: clampSessions(
      initialPlan?.totalTreinosMensaisPlanejados ?? PLAN_SESSIONS_DEFAULT,
    ),
    gruposObrigatorios: normalizeGruposObrigatorios(initialPlan?.gruposObrigatorios),
  };
}

export function PlanConfigForm({ userId, initialPlan }: PlanConfigFormProps) {
  const [formState, setFormState] = useState<PlanConfigFormState>(() =>
    buildInitialState(initialPlan),
  );
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedSet = useMemo(
    () => new Set(formState.gruposObrigatorios),
    [formState.gruposObrigatorios],
  );

  const handleSessionsChange = useCallback((value: number) => {
    setFormState((prev) => ({
      ...prev,
      totalTreinosMensaisPlanejados: clampSessions(value),
    }));
    setPhase("idle");
    setFeedback(null);
  }, []);

  const toggleMuscle = useCallback((muscle: SovereignMuscleId) => {
    setFormState((prev) => {
      const has = prev.gruposObrigatorios.includes(muscle);
      const gruposObrigatorios = has
        ? prev.gruposObrigatorios.filter((item) => item !== muscle)
        : [...prev.gruposObrigatorios, muscle];

      return { ...prev, gruposObrigatorios };
    });
    setPhase("idle");
    setFeedback(null);
  }, []);

  const handleSync = useCallback(async () => {
    setPhase("syncing");
    setFeedback(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      const sessionUserId = session?.user?.id?.trim();
      if (sessionError || !sessionUserId || sessionUserId !== userId.trim()) {
        setPhase("error");
        setFeedback("Sessão inválida. Faça login novamente.");
        return;
      }

      const row: TablesInsert<"planos_atletas"> = {
        atleta_id: sessionUserId,
        total_treinos_mensais_planejados: formState.totalTreinosMensaisPlanejados,
        grupos_obrigatorios: formState.gruposObrigatorios,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("planos_atletas").upsert(row, {
        onConflict: "atleta_id",
      });

      if (error) {
        setPhase("error");
        setFeedback(error.message);
        return;
      }

      setPhase("success");
      setFeedback("Diretrizes sincronizadas com o núcleo MIDAS.");
    } catch {
      setPhase("error");
      setFeedback("Falha de rede ao sincronizar o plano.");
    }
  }, [formState.gruposObrigatorios, formState.totalTreinosMensaisPlanejados, userId]);

  const isSyncing = phase === "syncing";

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="plan-config-title"
    >
      <DashboardPanelHeader chip="Plano mensal" meta="Diretrizes do atleta" />

      <div className="mt-4 border-b border-orange-500/10 pb-6">
        <h2 id="plan-config-title" className={DASHBOARD_SECTION_TITLE}>
          Configurar Plano Mensal
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Meta de ignição · matriz muscular obrigatória
        </p>
      </div>

      <div className={`mt-6 space-y-8 ${DASHBOARD_INNER_FRAME} p-4`}>
        <section aria-labelledby="plan-sessions-label">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p
                id="plan-sessions-label"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80"
              >
                Treinos mensais planeados
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                Janela {PLAN_SESSIONS_MIN}–{PLAN_SESSIONS_MAX} · base do índice de ignição
              </p>
            </div>
            <div
              className="rounded-lg border border-cyan-500/20 bg-black/50 px-3 py-2 font-mono text-2xl font-bold tabular-nums text-amber-50"
              aria-live="polite"
            >
              {formState.totalTreinosMensaisPlanejados}
            </div>
          </div>

          <div className="mt-5">
            <input
              type="range"
              min={PLAN_SESSIONS_MIN}
              max={PLAN_SESSIONS_MAX}
              step={1}
              value={formState.totalTreinosMensaisPlanejados}
              disabled={isSyncing}
              onChange={(event) => handleSessionsChange(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-emerald-500 disabled:opacity-50 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-emerald-300/60 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.45)]"
              aria-valuemin={PLAN_SESSIONS_MIN}
              aria-valuemax={PLAN_SESSIONS_MAX}
              aria-valuenow={formState.totalTreinosMensaisPlanejados}
            />
            <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-600">
              <span>{PLAN_SESSIONS_MIN}</span>
              <span>{PLAN_SESSIONS_MAX}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="plan-muscle-matrix-label">
          <p
            id="plan-muscle-matrix-label"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80"
          >
            Matriz muscular · grupos obrigatórios
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            Toque para alternar · alterações locais até sincronizar
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            {PLAN_MATRIX_MUSCLES.map((muscle) => {
              const selected = selectedSet.has(muscle);
              return (
                <button
                  key={muscle}
                  type="button"
                  disabled={isSyncing}
                  onClick={() => toggleMuscle(muscle)}
                  aria-pressed={selected}
                  className={`${DASHBOARD_TAP_TARGET} min-h-[4.5rem] flex-col gap-1 rounded-xl border px-3 py-3 text-center transition-[border-color,box-shadow,opacity,background-color] duration-200 disabled:opacity-50 ${
                    selected
                      ? "border-emerald-500 bg-emerald-950/25 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "border-orange-500/10 bg-black/35 opacity-55 saturate-50 hover:opacity-70"
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                    {muscle}
                  </span>
                  <span
                    className={`text-sm font-bold uppercase tracking-[0.12em] ${
                      selected ? "text-emerald-100" : "text-neutral-500"
                    }`}
                  >
                    {MUSCLE_LABELS[muscle]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-600">
            Selecionados:{" "}
            <span style={{ color: MAGMA_SPECTRUM.solarGold }}>
              {formState.gruposObrigatorios.length}
            </span>{" "}
            / {PLAN_MATRIX_MUSCLES.length}
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {feedback ? (
          <p
            className={`text-[11px] ${
              phase === "error" ? "text-red-400/90" : "text-emerald-300/85"
            }`}
            role={phase === "error" ? "alert" : "status"}
          >
            {feedback}
          </p>
        ) : (
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
            PLUTUS · uma única gravação por sincronização
          </p>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={() => void handleSync()}
          className={`${DASHBOARD_TAP_TARGET} relative min-w-[12rem] overflow-hidden rounded-full border border-emerald-500/25 bg-neutral-950/70 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 transition-[opacity,box-shadow] duration-200 hover:shadow-[0_0_14px_rgba(16,185,129,0.22)] disabled:opacity-60`}
        >
          {isSyncing ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border border-emerald-300/30 border-t-emerald-400"
                aria-hidden
              />
              Sincronizando…
            </span>
          ) : (
            "Sincronizar Diretrizes"
          )}
        </button>
      </div>
    </BrasaVivaCard>
  );
}
