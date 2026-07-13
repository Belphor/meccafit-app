"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  calorRowsToCongelamento,
  calorRowsToNiveisTermicos,
  resolveNivelTermicoGlobal,
  type EvolutionCalorPayload,
  type MuscleCalorLevel,
  type MuscleCalorRow,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { EvolutionChamaAcumuladaCard } from "@/components/evolution/EvolutionChamaAcumuladaCard";
import { EvolutionConsistenciaSection } from "@/components/evolution/EvolutionConsistenciaSection";
import type { AthletePlanConfig } from "@/components/evolution/plan-config-form";
import { FenixQaFloatingTrigger } from "@/components/qa/FenixQaFloatingTrigger";
import { dataUrlToFile, saveCycleSelfie } from "@/services/local-storage";
import {
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_TAP_TARGET,
  EVOLUTION_ACTION_BUTTON,
  EVOLUTION_HINT,
} from "@/lib/dashboard-config";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import { isRitmoPurityPenaltyActive } from "@/lib/ritmo-grace-period";
import { useThermalGravityClientState } from "@/lib/use-thermal-gravity-client";
import type { ThermalGravitySettlementResult } from "@/lib/linhagem-inactivity";
import {
  EVOLUTION_CALOR_REFRESH_EVENT,
  type EvolutionCalorRefreshDetail,
} from "@/lib/evolution-events";
import { supabase } from "@/lib/supabase";
import { EvolutionLevelsTable } from "@/components/evolution/EvolutionLevelsTable";
import { SelfieComparison } from "@/components/evolution/selfie-comparison";
import type { PhaseTier } from "@/lib/dashboard-config";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

const EvolucaoSelfiePanel = dynamic(
  () =>
    import("@/components/dashboard/EvolucaoSelfiePanel").then((module) => ({
      default: module.EvolucaoSelfiePanel,
    })),
  { ssr: false },
);

type EvolucaoPageClientProps = {
  userId: string;
  initialPayload?: EvolutionCalorPayload;
  initialCalorRows?: MuscleCalorRow[];
  initialIgnicao?: number;
  initialAthletePlan?: AthletePlanConfig;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  variant?: "page" | "dashboard";
  hasPersonalBond?: boolean;
  /** Tier conquistado no perfil — prioridade sobre o payload RPC antes da migration. */
  conqueredPhaseTier?: PhaseTier;
  thermalSettlement?: ThermalGravitySettlementResult | null;
  phaseSetupAt?: string | null;
};

async function assertAuthenticatedScope(expectedUserId: string): Promise<boolean> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) return false;
  return session.user.id === expectedUserId;
}

async function fetchCalorPayload(expectedUserId: string): Promise<EvolutionCalorPayload> {
  const scoped = await assertAuthenticatedScope(expectedUserId);
  if (!scoped) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }
  return fetchMuscularEvolutionPayload();
}

function resolvePerformanceModePreference(): boolean {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowMemory =
    typeof navigator !== "undefined" &&
    "deviceMemory" in navigator &&
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;

  return reduced || lowMemory;
}

export function EvolucaoPageClient({
  userId,
  initialPayload,
  initialCalorRows,
  initialIgnicao,
  initialAthletePlan,
  profileName,
  profilePhotoUrl,
  variant = "page",
  conqueredPhaseTier,
  thermalSettlement = null,
  phaseSetupAt = null,
}: EvolucaoPageClientProps) {
  const resolvedInitial = useMemo<EvolutionCalorPayload | undefined>(() => {
    if (initialPayload) return initialPayload;
    if (initialCalorRows && initialCalorRows.length > 0) {
      return {
        calorRows: initialCalorRows,
        indice_ignicao: initialIgnicao ?? 0,
      };
    }
    return undefined;
  }, [initialCalorRows, initialIgnicao, initialPayload]);

  const [calorRows, setCalorRows] = useState<MuscleCalorRow[]>(resolvedInitial?.calorRows ?? []);
  const [indiceIgnicao, setIndiceIgnicao] = useState(resolvedInitial?.indice_ignicao ?? 0);
  const [vtc30dKg, setVtc30dKg] = useState(resolvedInitial?.vtc_30d_kg ?? 0);
  const [vtcMonthKg, setVtcMonthKg] = useState(resolvedInitial?.vtc_month_kg ?? 0);
  const [metaVtcMensalKg, setMetaVtcMensalKg] = useState(
    resolvedInitial?.meta_vtc_mensal_kg ?? 5000,
  );
  const [phaseTier, setPhaseTier] = useState<PhaseTier>(
    conqueredPhaseTier ??
      (Math.min(5, Math.max(1, Math.round(resolvedInitial?.phase_tier ?? 1))) as PhaseTier),
  );
  const [nivelTermicoGlobal, setNivelTermicoGlobal] = useState<MuscleCalorLevel | null>(null);
  const [loading, setLoading] = useState(!resolvedInitial);
  const [activeMuscle, setActiveMuscle] = useState<SovereignMuscleId>("PEITO");
  const [performanceMode] = useState(resolvePerformanceModePreference);
  const [showSelfie, setShowSelfie] = useState(false);
  const [espelhoExpanded, setEspelhoExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [evolutionReady, setEvolutionReady] = useState(
    Boolean(resolvedInitial?.phase_tier != null && Number.isFinite(resolvedInitial.phase_tier)),
  );
  const [ritmoGraceActive, setRitmoGraceActive] = useState(
    resolvedInitial?.ritmo_grace_active === true,
  );
  const [ritmoGraceDaysRemaining, setRitmoGraceDaysRemaining] = useState(
    resolvedInitial?.ritmo_grace_days_remaining ?? 0,
  );

  const purityPenaltyActive = useMemo(
    () => isRitmoPurityPenaltyActive(indiceIgnicao, phaseSetupAt, ritmoGraceActive),
    [indiceIgnicao, phaseSetupAt, ritmoGraceActive],
  );

  const computedNivelGlobal = useMemo(
    () => resolveNivelTermicoGlobal(indiceIgnicao, calorRows),
    [indiceIgnicao, calorRows],
  );

  const { state: thermalState, monthBoundaryDegraded: qaMonthBoundaryDegraded, simulatedPhaseTier } =
    useThermalGravityClientState(conqueredPhaseTier ?? phaseTier, vtcMonthKg, 0, vtc30dKg);

  const thermalStateWithSettlement = useMemo(() => {
    if (thermalState.settled_month_label) return thermalState;
    if (!thermalSettlement?.settled_month_label) return thermalState;
    return {
      ...thermalState,
      settled_month_label: thermalSettlement.settled_month_label,
    };
  }, [thermalSettlement, thermalState]);

  const monthBoundaryDegraded =
    qaMonthBoundaryDegraded || thermalSettlement?.degraded === true;

  const displayPhaseTier =
    simulatedPhaseTier ?? conqueredPhaseTier ?? phaseTier;

  const niveisTermicos = useMemo(() => calorRowsToNiveisTermicos(calorRows), [calorRows]);
  const congelamentoPorMembro = useMemo(
    () => calorRowsToCongelamento(calorRows),
    [calorRows],
  );

  const applyPayload = useCallback((payload: EvolutionCalorPayload) => {
    setCalorRows(payload.calorRows);
    setIndiceIgnicao(payload.indice_ignicao);
    setVtc30dKg(payload.vtc_30d_kg ?? 0);
    setVtcMonthKg(payload.vtc_month_kg ?? 0);
    setMetaVtcMensalKg(payload.meta_vtc_mensal_kg ?? 5000);
    if (payload.phase_tier != null && Number.isFinite(payload.phase_tier)) {
      setPhaseTier(
        Math.min(5, Math.max(1, Math.round(payload.phase_tier))) as PhaseTier,
      );
      setEvolutionReady(true);
    }
    setRitmoGraceActive(payload.ritmo_grace_active === true);
    setRitmoGraceDaysRemaining(payload.ritmo_grace_days_remaining ?? 0);
    setNivelTermicoGlobal(resolveNivelTermicoGlobal(payload.indice_ignicao, payload.calorRows));
  }, []);

  const refreshCalor = useCallback(async () => {
    setRefreshing(true);
    setScopeError(null);
    try {
      const scoped = await assertAuthenticatedScope(userId);
      if (!scoped) {
        setScopeError("Sessão inválida. Faça login novamente.");
        return;
      }
      const payload = await fetchCalorPayload(userId);
      applyPayload(payload);
    } catch (error) {
      setScopeError(error instanceof Error ? error.message : "Falha ao atualizar calor.");
    } finally {
      setRefreshing(false);
    }
  }, [applyPayload, userId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setScopeError(null);
      try {
        const scoped = await assertAuthenticatedScope(userId);
        if (!scoped) {
          if (!cancelled) setScopeError("Sessão inválida. Faça login novamente.");
          return;
        }
        if (!resolvedInitial) setLoading(true);
        const payload = await fetchCalorPayload(userId);
        if (!cancelled) applyPayload(payload);
      } catch (error) {
        if (!cancelled) {
          setScopeError(error instanceof Error ? error.message : "Falha ao carregar evolução.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPayload, resolvedInitial, userId]);

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<EvolutionCalorRefreshDetail>).detail;
      if (!detail || detail.userId !== userId) return;
      void refreshCalor();
    };

    window.addEventListener(EVOLUTION_CALOR_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(EVOLUTION_CALOR_REFRESH_EVENT, onRefresh);
  }, [refreshCalor, userId]);

  const handleSelfieCaptured = useCallback(async (dataUrl: string) => {
    const cycleId = `cycle-${new Date().toISOString().slice(0, 7)}-${Date.now()}`;
    const file = await dataUrlToFile(dataUrl, `selfie-${cycleId}.webp`);
    if (file) await saveCycleSelfie(cycleId, file);
    setShowSelfie(false);
    setEspelhoExpanded(true);
  }, []);

  const Wrapper = variant === "page" ? "div" : "main";

  return (
    <Wrapper className="space-y-5">
      <FenixQaFloatingTrigger tab="evolucao" />

      {/* 1. Consistência: meta + ritmo + mapa corporal (ligados) */}
      <EvolutionConsistenciaSection
        userId={userId}
        initialAthletePlan={initialAthletePlan}
        loading={loading}
        refreshing={refreshing}
        indiceIgnicao={indiceIgnicao}
        metaVtcMensalKg={metaVtcMensalKg}
        vtc30dKg={vtc30dKg}
        nivelTermicoGlobal={nivelTermicoGlobal}
        computedNivelGlobal={computedNivelGlobal}
        calorRows={calorRows}
        niveisTermicos={niveisTermicos}
        congelamentoPorMembro={congelamentoPorMembro}
        performanceMode={performanceMode}
        activeMuscle={activeMuscle}
        onMuscleSelect={setActiveMuscle}
        onRefreshMap={() => void refreshCalor()}
        scopeError={scopeError}
        phaseSetupAt={phaseSetupAt}
        ritmoGraceActive={ritmoGraceActive}
        ritmoGraceDaysRemaining={ritmoGraceDaysRemaining}
        purityPenaltyActive={purityPenaltyActive}
      />

      {/* 2. Chama acumulada — fase da linhagem */}
      <BrasaVivaCard
        as="section"
        variant="treino"
        className={DASHBOARD_PANEL_FRAME}
        aria-labelledby="evolucao-linhagem-title"
        data-tour-target="evolucao-chama"
      >
        <DashboardPanelHeader chip="Linhagem" meta={`${VTC_DISPLAY_NAME} acumulado · 30 dias`} />
        <EvolutionChamaAcumuladaCard
          userId={userId}
          loading={loading}
          dataReady={evolutionReady}
          indiceIgnicao={indiceIgnicao}
          calorRows={calorRows}
          phaseTier={displayPhaseTier}
          vtc30dKg={vtc30dKg}
          thermalState={thermalStateWithSettlement}
          monthBoundaryDegraded={monthBoundaryDegraded}
          profileName={profileName}
          profilePhotoUrl={profilePhotoUrl}
          purityPenaltyActive={purityPenaltyActive}
        />
      </BrasaVivaCard>

      {showSelfie ? (
        <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
          <EvolucaoSelfiePanel
            onCapture={handleSelfieCaptured}
            onClose={() => setShowSelfie(false)}
          />
        </BrasaVivaCard>
      ) : null}

      {/* 4. Espelho visual — comparativo opcional */}
      <BrasaVivaCard
        as="section"
        variant="treino"
        className={DASHBOARD_PANEL_FRAME}
        data-tour-target="evolucao-espelho"
      >
        <DashboardPanelHeader chip="Espelho visual" meta="Comparação de ciclo" />

        <div className="mt-3 px-4 sm:px-5">
          <p className={EVOLUTION_HINT}>
            Compare selfies do primeiro dia e do último dia do mês para ver sua evolução física no
            ciclo.
          </p>

          <button
            type="button"
            onClick={() => setEspelhoExpanded((open) => !open)}
            className={`${DASHBOARD_TAP_TARGET} mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-neutral-950/50 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/35`}
            aria-expanded={espelhoExpanded}
            aria-controls="evolucao-espelho-panel"
          >
            {espelhoExpanded ? "Recolher comparação" : "Abrir comparação de ciclo"}
          </button>

          {espelhoExpanded ? (
            <div id="evolucao-espelho-panel" className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowSelfie((open) => !open)}
                className={`${EVOLUTION_ACTION_BUTTON} w-full border-cyan-500/20 text-cyan-100`}
              >
                {showSelfie ? "Fechar captura de selfie" : "Capturar selfie de ciclo"}
              </button>
              <SelfieComparison />
            </div>
          ) : null}
        </div>
      </BrasaVivaCard>

      <EvolutionLevelsTable />

      <p className={`px-1 text-center ${EVOLUTION_HINT}`}>
        Dúvidas sobre {VTC_DISPLAY_NAME}? Consulte a referência e o suporte na aba Perfil.
      </p>
    </Wrapper>
  );
}
