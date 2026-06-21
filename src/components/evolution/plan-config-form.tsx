"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/** Ordem 2×3 da matriz · chaves soberanas persistidas no Postgres */
const PLAN_MATRIX_MUSCLES: readonly SovereignMuscleId[] = [
  "PEITO",
  "COSTAS",
  "PERNAS",
  "OMBROS",
  "BRACOS",
  "ABDOMEN",
] as const;

/** Rótulos HUD · acentuação PT-BR sem alterar enum soberano */
const PLAN_MATRIX_HUD_CODE: Record<SovereignMuscleId, string> = {
  PEITO: "PEITO",
  COSTAS: "COSTAS",
  PERNAS: "PERNAS",
  OMBROS: "OMBROS",
  BRACOS: "BRAÇOS",
  ABDOMEN: "ABDÔMEN",
};

export const PLAN_SESSIONS_MIN = 4;
export const PLAN_SESSIONS_MAX = 28;
export const PLAN_SESSIONS_DEFAULT = 16;

const SYNC_SUCCESS_MESSAGE = "Diretrizes sincronizadas com o núcleo MIDAS.";

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

type SyncPhase = "idle" | "syncing" | "success" | "error";

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

function buildPlanState(initialPlan?: AthletePlanConfig): PlanConfigFormState {
  return {
    totalTreinosMensaisPlanejados: clampSessions(
      initialPlan?.totalTreinosMensaisPlanejados ?? PLAN_SESSIONS_DEFAULT,
    ),
    gruposObrigatorios: normalizeGruposObrigatorios(initialPlan?.gruposObrigatorios),
  };
}

function planStatesEqual(a: PlanConfigFormState, b: PlanConfigFormState): boolean {
  if (a.totalTreinosMensaisPlanejados !== b.totalTreinosMensaisPlanejados) return false;
  if (a.gruposObrigatorios.length !== b.gruposObrigatorios.length) return false;
  return a.gruposObrigatorios.every((muscle, index) => muscle === b.gruposObrigatorios[index]);
}

type PlanSessionsSliderProps = {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function PlanSessionsSlider({ value, disabled, onChange }: PlanSessionsSliderProps) {
  const span = PLAN_SESSIONS_MAX - PLAN_SESSIONS_MIN;
  const fillPercent = span > 0 ? ((value - PLAN_SESSIONS_MIN) / span) * 100 : 0;

  return (
    <div className="mt-5 space-y-3">
      <div className="relative h-2 rounded-full bg-neutral-900 ring-1 ring-orange-500/10">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-600/35 via-emerald-500/55 to-amber-500/45 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={PLAN_SESSIONS_MIN}
          max={PLAN_SESSIONS_MAX}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-emerald-200/70 [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:shadow-[0_0_14px_rgba(16,185,129,0.55)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-emerald-200/70 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(16,185,129,0.55)]"
          aria-valuemin={PLAN_SESSIONS_MIN}
          aria-valuemax={PLAN_SESSIONS_MAX}
          aria-valuenow={value}
          aria-label="Treinos mensais planeados"
        />
      </div>
      <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-600">
        <span>{PLAN_SESSIONS_MIN}</span>
        <span className="text-cyan-500/70">janela mensal</span>
        <span>{PLAN_SESSIONS_MAX}</span>
      </div>
    </div>
  );
}

type MuscleMatrixToggleProps = {
  muscle: SovereignMuscleId;
  selected: boolean;
  disabled: boolean;
  onToggle: (muscle: SovereignMuscleId) => void;
};

function MuscleMatrixToggle({ muscle, selected, disabled, onToggle }: MuscleMatrixToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(muscle)}
      aria-pressed={selected}
      aria-label={`${MUSCLE_LABELS[muscle]} · ${selected ? "selecionado" : "não selecionado"}`}
      className={`${DASHBOARD_TAP_TARGET} min-h-11 w-full flex-col gap-1.5 rounded-xl border px-3 py-3 text-center transition-[border-color,box-shadow,opacity,background-color,transform] duration-200 disabled:opacity-50 ${selected
        ? "border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_16px_rgba(16,185,129,0.38),inset_0_0_12px_rgba(16,185,129,0.12)]"
        : "border-orange-500/10 bg-black/40 opacity-50 saturate-0 hover:border-orange-500/20 hover:opacity-65"
        }`}
    >
      <span
        className={`font-mono text-[9px] uppercase tracking-[0.18em] ${selected ? "text-emerald-300/90" : "text-neutral-600"
          }`}
      >
        {PLAN_MATRIX_HUD_CODE[muscle]}
      </span>
      <span
        className={`text-sm font-bold uppercase tracking-[0.12em] ${selected ? "text-emerald-50" : "text-neutral-500"
          }`}
      >
        {MUSCLE_LABELS[muscle]}
      </span>
    </button>
  );
}

export function PlanConfigForm({ userId, initialPlan }: PlanConfigFormProps) {
  const [syncedBaseline, setSyncedBaseline] = useState<PlanConfigFormState>(() =>
    buildPlanState(initialPlan),
  );
  const [draft, setDraft] = useState<PlanConfigFormState>(() => buildPlanState(initialPlan));
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const hydrated = buildPlanState(initialPlan);
    setSyncedBaseline(hydrated);
    setDraft(hydrated);
    setPhase("idle");
    setFeedback(null);
  }, [initialPlan]);

  const hasLocalChanges = useMemo(
    () => !planStatesEqual(draft, syncedBaseline),
    [draft, syncedBaseline],
  );

  const selectedSet = useMemo(() => new Set(draft.gruposObrigatorios), [draft.gruposObrigatorios]);

  const clearTransientFeedback = useCallback(() => {
    setPhase("idle");
    setFeedback(null);
  }, []);

  const handleSessionsChange = useCallback(
    (value: number) => {
      setDraft((prev) => ({
        ...prev,
        totalTreinosMensaisPlanejados: clampSessions(value),
      }));
      clearTransientFeedback();
    },
    [clearTransientFeedback],
  );

  const toggleMuscle = useCallback(
    (muscle: SovereignMuscleId) => {
      setDraft((prev) => {
        const next = new Set(prev.gruposObrigatorios);
        if (next.has(muscle)) next.delete(muscle);
        else next.add(muscle);

        return {
          ...prev,
          gruposObrigatorios: PLAN_MATRIX_MUSCLES.filter((item) => next.has(item)),
        };
      });
      clearTransientFeedback();
    },
    [clearTransientFeedback],
  );

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
        total_treinos_mensais_planejados: draft.totalTreinosMensaisPlanejados,
        grupos_obrigatorios: draft.gruposObrigatorios,
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

      setSyncedBaseline(draft);
      setPhase("success");
      setFeedback(SYNC_SUCCESS_MESSAGE);
    } catch {
      setPhase("error");
      setFeedback("Falha de rede ao sincronizar o plano.");
    }
  }, [draft, userId]);

  const isSyncing = phase === "syncing";

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="plan-config-title"
    >
      <DashboardPanelHeader chip="Plano mensal" meta="Perfil" />

      <header className="mt-4 border-b border-orange-500/10 pb-5 sm:pb-6">
        <h2 id="plan-config-title" className={DASHBOARD_SECTION_TITLE}>
          Diretrizes do Plano Mensal
        </h2>
        <p className="mt-2 max-w-prose text-[10px] uppercase leading-relaxed tracking-[0.18em] text-neutral-600">
          Define a meta de sessões e os grupos musculares obrigatórios. Alimenta o índice de
          ignição na aba Evolução. Alterações ficam locais até sincronizar.
        </p>
      </header>

      <div className={`mt-6 space-y-8 ${DASHBOARD_INNER_FRAME}`}>
        <section aria-labelledby="plan-sessions-label" className="space-y-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                id="plan-sessions-label"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/85"
              >
                Treinos mensais planeados
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                {PLAN_SESSIONS_MIN}–{PLAN_SESSIONS_MAX} sessões · janela rolante 30 dias
              </p>
            </div>
            <div
              className="rounded-lg border border-cyan-500/25 bg-black/55 px-4 py-2 font-mono text-2xl font-bold tabular-nums text-amber-50 shadow-[0_0_10px_rgba(34,211,238,0.12)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {draft.totalTreinosMensaisPlanejados}
            </div>
          </div>

          <PlanSessionsSlider
            value={draft.totalTreinosMensaisPlanejados}
            disabled={isSyncing}
            onChange={handleSessionsChange}
          />
        </section>

        <section aria-labelledby="plan-muscle-matrix-label">
          <p
            id="plan-muscle-matrix-label"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/85"
          >
            Matriz muscular · grupos obrigatórios
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            Toque para alternar · multi-seleção · alvos ≥ 44px
          </p>

          <div
            className="mt-4 grid grid-cols-2 gap-3 sm:gap-4"
            role="group"
            aria-label="Grupos musculares obrigatórios"
          >
            {PLAN_MATRIX_MUSCLES.map((muscle) => (
              <MuscleMatrixToggle
                key={muscle}
                muscle={muscle}
                selected={selectedSet.has(muscle)}
                disabled={isSyncing}
                onToggle={toggleMuscle}
              />
            ))}
          </div>

          <p
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500"
            aria-live="polite"
          >
            Selecionados:{" "}
            <span className="font-bold" style={{ color: MAGMA_SPECTRUM.solarGold }}>
              {draft.gruposObrigatorios.length}
            </span>{" "}
            / {PLAN_MATRIX_MUSCLES.length}
          </p>
        </section>
      </div>

      <footer className="mt-6 flex flex-col gap-3 border-t border-orange-500/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {feedback ? (
            <p
              className={`text-[11px] leading-relaxed ${phase === "error" ? "text-red-400/90" : "text-emerald-300/90"
                }`}
              role={phase === "error" ? "alert" : "status"}
            >
              {feedback}
            </p>
          ) : hasLocalChanges ? (
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400/80">
              Alterações locais · aguardando sincronização
            </p>
          ) : (
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
              Uma única gravação por sincronização
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={isSyncing}
          onClick={() => void handleSync()}
          className={`${DASHBOARD_TAP_TARGET} min-h-11 w-full shrink-0 rounded-full border border-emerald-500/30 bg-neutral-950/75 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 transition-[opacity,box-shadow,transform] duration-200 hover:shadow-[0_0_16px_rgba(16,185,129,0.28)] active:scale-[0.98] disabled:opacity-60 sm:min-w-[13rem] sm:w-auto`}
        >
          {isSyncing ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-emerald-300/30 border-t-emerald-400"
                aria-hidden
              />
              Sincronizando…
            </span>
          ) : (
            "Sincronizar Diretrizes"
          )}
        </button>
      </footer>
    </BrasaVivaCard>
  );
}
