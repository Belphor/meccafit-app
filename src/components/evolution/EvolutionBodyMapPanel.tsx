"use client";

import { useEffect, useState } from "react";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { EvolutionBodySkeleton } from "@/components/evolution/evolution-body-skeleton";
import { HumanBodySvg } from "@/components/evolution/human-body-svg";
import {
  MUSCLE_LABELS,
  SOVEREIGN_MUSCLES,
  formatCalorMembroMetric,
  type MuscleCalorRow,
  type NiveisTermicos,
  type CongelamentoPorMembro,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_SECTION_TITLE,
  EVOLUTION_ACTION_BUTTON,
  EVOLUTION_FIELD_VALUE,
  EVOLUTION_HINT,
  EVOLUTION_SECTION_SUBTITLE,
} from "@/lib/dashboard-config";
import { formatThermalLevelWithContext } from "@/lib/fenix-evolution-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { useTourHighlightActive } from "@/lib/use-tour-highlight";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

type EvolutionBodyMapPanelProps = {
  loading: boolean;
  refreshing: boolean;
  indiceIgnicao: number;
  calorRows: MuscleCalorRow[];
  niveisTermicos: NiveisTermicos;
  congelamentoPorMembro: CongelamentoPorMembro;
  performanceMode: boolean;
  activeMuscle: SovereignMuscleId;
  onMuscleSelect: (muscle: SovereignMuscleId) => void;
  onRefresh: () => void;
  scopeError: string | null;
  purityPenaltyActive?: boolean;
};

export function EvolutionBodyMapPanel({
  loading,
  refreshing,
  indiceIgnicao,
  calorRows,
  niveisTermicos,
  congelamentoPorMembro,
  performanceMode,
  activeMuscle,
  onMuscleSelect,
  onRefresh,
  scopeError,
  purityPenaltyActive = false,
}: EvolutionBodyMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const tourActive = useTourHighlightActive("evolucao-brasas");

  useEffect(() => {
    // Durante a APRESENTAÇÃO, expande automaticamente para a ANYMA explicar o mapa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tourActive) setExpanded(true);
  }, [tourActive]);

  const activeRow = calorRows.find((row) => row.membro_principal === activeMuscle);
  const activeCalorMetric = activeRow ? formatCalorMembroMetric(activeRow) : null;
  const hasMapData = !loading && calorRows.length > 0;
  const ritmoBaixo = purityPenaltyActive;

  return (
    <div className="pb-5 pt-1 sm:px-1">
      <header className="mt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="evolucao-brasas-mapa"
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <h3 className={DASHBOARD_SECTION_TITLE}>Mapa de calor muscular</h3>
              <span className={`mt-1 block ${EVOLUTION_SECTION_SUBTITLE}`}>
                {expanded ? (
                  <>
                    Onde você mais carregou nos últimos 14 dias. As cores nascem das{" "}
                    <LoreEm>Brasas Musculares</LoreEm> e respeitam o <LoreEm>Ritmo da Fênix</LoreEm>
                    {ritmoBaixo ? ". Abaixo de 50%, o mapa fica mais suave." : "."}
                  </>
                ) : (
                  "Toque para abrir o mapa corporal dos últimos 14 dias."
                )}
              </span>
            </span>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-200/90 transition ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            >
              ▾
            </span>
          </button>
        </div>
        {expanded ? (
          <DashboardClientInfoBlock className="mt-3">
            <LoreEm>Brasas Musculares</LoreEm> somam o <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> por grupo nos
            últimos <strong className="text-amber-50">14 dias</strong>. As cores mostram onde você mais
            carregou. Ritmo baixo, após o acolhimento, suaviza o mapa.
          </DashboardClientInfoBlock>
        ) : null}
      </header>

      {expanded ? (
      <div id="evolucao-brasas-mapa" className={`mt-5 ${DASHBOARD_INNER_FRAME} p-4`}>
        {hasMapData ? (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className={`${EVOLUTION_ACTION_BUTTON} shrink-0`}
            >
              {refreshing ? "Sincronizando..." : "Atualizar mapa"}
            </button>
          </div>
        ) : null}
        {loading ? (
          <EvolutionBodySkeleton />
        ) : calorRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-neutral-400">Evolução muscular ainda não sincronizada.</p>
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className={`${EVOLUTION_ACTION_BUTTON} mt-4`}
            >
              {refreshing ? "Sincronizando..." : "Sincronizar evolução"}
            </button>
          </div>
        ) : (
          <>
            <HumanBodySvg
              niveis_termicos={niveisTermicos}
              indice_ignicao={indiceIgnicao}
              performanceMode={performanceMode}
              congelamento_por_membro={congelamentoPorMembro}
              calorRows={calorRows}
              activeMuscle={activeMuscle}
              onMuscleSelect={onMuscleSelect}
              purityPenaltyActive={purityPenaltyActive}
            />

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
              {SOVEREIGN_MUSCLES.map((id) => {
                const isActive = activeMuscle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onMuscleSelect(id)}
                    className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 py-2 text-xs font-semibold ${
                      isActive
                        ? "border-amber-500/35 bg-amber-950/35 text-amber-100"
                        : "border-orange-500/10 bg-black/30 text-neutral-500"
                    }`}
                  >
                    {MUSCLE_LABELS[id]}
                  </button>
                );
              })}
            </div>

            {activeRow && activeCalorMetric ? (
              <div className="mt-4 rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-950/25 to-black/40 p-4">
                <p className="text-xs font-medium text-cyan-200/90">{MUSCLE_LABELS[activeRow.membro_principal]}</p>
                <p className={`mt-2 ${EVOLUTION_FIELD_VALUE} text-base`}>
                  {formatThermalLevelWithContext(activeRow.nivel_calculado, "muscle")}
                </p>
                <p className={`mt-1 ${EVOLUTION_HINT}`}>
                  {activeCalorMetric.label}:{" "}
                  <span className="font-mono font-semibold text-amber-100">{activeCalorMetric.value}</span>
                </p>
                <p className={`mt-0.5 ${EVOLUTION_HINT}`}>{activeCalorMetric.hint}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
      ) : null}

      {scopeError ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {scopeError}
        </p>
      ) : null}
    </div>
  );
}
