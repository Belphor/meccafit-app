"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  CALOR_LEVEL_LABELS,
  MUSCLE_LABELS,
  PURITY_PENALTY_THRESHOLD,
  calorRowsToCongelamento,
  calorRowsToNiveisTermicos,
  formatCalorMembroMetric,
  resolveNivelTermicoGlobal,
  SOVEREIGN_MUSCLES,
  type EvolutionCalorPayload,
  type MuscleCalorLevel,
  type MuscleCalorRow,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { EvolutionBodySkeleton } from "@/components/evolution/evolution-body-skeleton";
import { HumanBodySvg } from "@/components/evolution/human-body-svg";
import { PremiumAvatar } from "@/components/evolution/premium-avatar";
import { dataUrlToFile, saveCycleSelfie } from "@/services/local-storage";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  MAGMA_SPECTRUM,
} from "@/lib/dashboard-config";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import { supabase } from "@/lib/supabase";
import { SelfieComparison } from "@/components/evolution/selfie-comparison";

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
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  variant?: "page" | "dashboard";
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

export function EvolucaoPageClient({
  userId,
  initialPayload,
  initialCalorRows,
  initialIgnicao,
  profileName,
  profilePhotoUrl,
  variant = "page",
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

  const [calorRows, setCalorRows] = useState<MuscleCalorRow[]>(
    resolvedInitial?.calorRows ?? [],
  );
  const [indiceIgnicao, setIndiceIgnicao] = useState(resolvedInitial?.indice_ignicao ?? 0);
  const [nivelTermicoGlobal, setNivelTermicoGlobal] = useState<MuscleCalorLevel | null>(null);
  const [loading, setLoading] = useState(!resolvedInitial);
  const [activeMuscle, setActiveMuscle] = useState<SovereignMuscleId>("PEITO");
  const [performanceMode, setPerformanceMode] = useState(false);
  const [showSelfie, setShowSelfie] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const computedNivelGlobal = useMemo(
    () => resolveNivelTermicoGlobal(indiceIgnicao, calorRows),
    [indiceIgnicao, calorRows],
  );

  const niveisTermicos = useMemo(() => calorRowsToNiveisTermicos(calorRows), [calorRows]);
  const congelamentoPorMembro = useMemo(
    () => calorRowsToCongelamento(calorRows),
    [calorRows],
  );

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowMemory =
      typeof navigator !== "undefined" &&
      "deviceMemory" in navigator &&
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
    setPerformanceMode(reduced || lowMemory);
  }, []);

  const applyPayload = useCallback((payload: EvolutionCalorPayload) => {
    setCalorRows(payload.calorRows);
    setIndiceIgnicao(payload.indice_ignicao);
    setNivelTermicoGlobal(resolveNivelTermicoGlobal(payload.indice_ignicao, payload.calorRows));
  }, []);

  useEffect(() => {
    if (resolvedInitial) {
      applyPayload(resolvedInitial);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setScopeError(null);
      try {
        const scoped = await assertAuthenticatedScope(userId);
        if (!scoped) {
          if (!cancelled) setScopeError("Sessão inválida. Faça login novamente.");
          return;
        }
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

  const handleSelfieCaptured = useCallback(async (dataUrl: string) => {
    const cycleId = `cycle-${new Date().toISOString().slice(0, 7)}-${Date.now()}`;
    const file = await dataUrlToFile(dataUrl, `selfie-${cycleId}.webp`);
    if (file) {
      await saveCycleSelfie(cycleId, file);
    }
    setShowSelfie(false);
  }, []);

  const activeRow = calorRows.find((row) => row.membro_principal === activeMuscle);
  const activeCalorMetric = activeRow ? formatCalorMembroMetric(activeRow) : null;
  const Wrapper = variant === "page" ? "div" : "main";

  return (
    <Wrapper>
      <BrasaVivaCard
        as="section"
        variant="treino"
        className={DASHBOARD_PANEL_FRAME}
        aria-labelledby="evolucao-aba-title"
      >
        <DashboardPanelHeader chip="Evolução" meta="Calor muscular" />

        <div className="mt-4 flex flex-col gap-4 border-b border-orange-500/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <h2 id="evolucao-aba-title" className={DASHBOARD_SECTION_TITLE}>
              Mapa Térmico
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              6 grupos · pureza dinâmica · ignição mensal
            </p>
          </div>

          {loading ? (
            <div
              className="mx-auto h-20 w-20 shrink-0 animate-pulse rounded-full bg-cyan-900/20 ring-4 ring-cyan-500/10 sm:mx-0 sm:h-24 sm:w-24"
              aria-hidden
            />
          ) : calorRows.length > 0 ? (
            <PremiumAvatar
              indiceIgnicao={indiceIgnicao}
              calorRows={calorRows}
              nivelTermicoGlobal={nivelTermicoGlobal ?? computedNivelGlobal}
              profileName={profileName}
              profilePhotoUrl={profilePhotoUrl}
              className="mx-auto shrink-0 sm:mx-0"
            />
          ) : null}
        </div>

        <div className={`mt-6 ${DASHBOARD_INNER_FRAME} p-4`}>
          {loading ? (
            <EvolutionBodySkeleton />
          ) : calorRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Calor muscular ainda não sincronizado
              </p>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refreshCalor()}
                className="mt-4 rounded-full border border-orange-500/15 bg-neutral-950/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/85 disabled:opacity-50"
              >
                {refreshing ? "Sincronizando…" : "Sincronizar calor muscular"}
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
                onMuscleSelect={setActiveMuscle}
              />

              {activeRow && activeCalorMetric ? (
                <div className="mt-4 rounded-lg border border-cyan-500/15 bg-black/35 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
                    Detalhe · {MUSCLE_LABELS[activeRow.membro_principal]}
                  </p>
                  <p className="mt-2 text-lg font-bold text-amber-50">
                    {CALOR_LEVEL_LABELS[activeRow.nivel_calculado]}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-neutral-400">
                    {activeCalorMetric.label} ·{" "}
                    <span className="text-amber-200/85">{activeCalorMetric.value}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-neutral-600">
                    {activeCalorMetric.hint}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {scopeError ? (
          <p className="mt-3 text-[11px] text-red-400/90" role="alert">
            {scopeError}
          </p>
        ) : null}

        {!loading && calorRows.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Índice de ignição ·{" "}
                  <span style={{ color: MAGMA_SPECTRUM.solarGold }}>
                    {Math.round(indiceIgnicao)}%
                  </span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Nível global · {CALOR_LEVEL_LABELS[nivelTermicoGlobal ?? computedNivelGlobal]}
                </p>
                {indiceIgnicao < PURITY_PENALTY_THRESHOLD ? (
                  <p className="text-[9px] uppercase tracking-[0.14em] text-amber-500/70">
                    Falha de energia · pureza da Fênix abaixo de {PURITY_PENALTY_THRESHOLD}%
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void refreshCalor()}
                  className="rounded-full border border-orange-500/15 bg-neutral-950/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/85 disabled:opacity-50"
                >
                  {refreshing ? "Sincronizando…" : "Atualizar calor"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSelfie((open) => !open)}
                  className="rounded-full border border-cyan-500/15 bg-neutral-950/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/75"
                >
                  {showSelfie ? "Fechar selfie" : "Selfie de ciclo"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SOVEREIGN_MUSCLES.map((id) => {
                const row = calorRows.find((item) => item.membro_principal === id);
                const isActive = activeMuscle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveMuscle(id)}
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
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
          </>
        ) : null}

        {showSelfie ? (
          <div className="mt-6">
            <EvolucaoSelfiePanel
              onCapture={handleSelfieCaptured}
              onClose={() => setShowSelfie(false)}
            />
          </div>
        ) : null}

        <div className="mt-8 border-t border-orange-500/10 pt-6">
          <SelfieComparison />
        </div>
      </BrasaVivaCard>
    </Wrapper>
  );
}
