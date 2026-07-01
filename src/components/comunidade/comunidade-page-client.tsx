"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { ComunidadeEvolutionStatus } from "@/components/comunidade/comunidade-evolution-status";
import {
  COMUNIDADE_NAV,
  COMUNIDADE_NAV_LINK,
  COMUNIDADE_PAGE_TITLE,
  COMUNIDADE_SCROLL_MT,
  COMUNIDADE_SECTION_INNER,
  COMUNIDADE_SECTION_LABEL,
} from "@/components/comunidade/comunidade-layout";
import { ComunidadeMuralPanel } from "@/components/comunidade/comunidade-mural-panel";
import { ComunidadeTitulosPanel } from "@/components/comunidade/comunidade-titulos-panel";
import { DuelosArenaPanel } from "@/components/comunidade/duelos-arena-panel";
import { MetaColetivaTermometro } from "@/components/comunidade/meta-coletiva-termometro";
import { RankingsThothPanel } from "@/components/comunidade/rankings-por-membro-panel";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { COMUNIDADE_CLIENT_EXPLANATION } from "@/lib/dashboard-config";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import {
  fetchComunidadeArenaSnapshot,
  type ComunidadeArenaSnapshot,
} from "@/lib/comunidade-data";
import {
  readCachedComunidadeArena,
  readCachedComunidadeEvolution,
  writeCachedComunidadeArena,
  writeCachedComunidadeEvolution,
} from "@/lib/comunidade-cache";
import {
  fetchComunidadeClienteEvolution,
  type ComunidadeClienteEvolution,
} from "@/lib/comunidade-evolution";
import { DASHBOARD_PANEL_FRAME } from "@/lib/dashboard-config";
import { focusComunidadeMural } from "@/lib/comunidade-mural-focus";
import { DUelo_ARENA_REFRESH_EVENT } from "@/lib/duelo-events";
import {
  COMUNIDADE_MURAL_FOCUS_EVENT,
  MURAL_REFRESH_EVENT,
  type ComunidadeMuralFocusDetail,
} from "@/lib/dashboard-tab-navigation";
import { useComunidadePhotoResolver } from "@/hooks/useComunidadePhotoResolver";

type ComunidadePageClientProps = {
  userId: string;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  phase: Pick<PhoenixPhaseRuntimeContext, "isForumInactive" | "isHydrated" | "vtcMonth">;
  muralFocusToken?: number;
  muralFocusExerciseName?: string;
};

const EMPTY_META = {
  tonelagem_alvo_kg: 100_000,
  tonelagem_atual_acumulada: 0,
  progresso_pct: 0,
};

const SECTION_NAV = [
  { id: "comunidade-perfil", label: "Perfil" },
  { id: "comunidade-arena", label: "Arena" },
  { id: "comunidade-titulos", label: "Títulos" },
  { id: "comunidade-rankings", label: "Rankings" },
  { id: "comunidade-mural", label: "Mural" },
] as const;

export function ComunidadePageClient({
  userId,
  profileName,
  profilePhotoUrl,
  phase,
  muralFocusToken = 0,
  muralFocusExerciseName,
}: ComunidadePageClientProps) {
  const mountedRef = useRef(false);
  const [arena, setArena] = useState<ComunidadeArenaSnapshot | null>(
    () => readCachedComunidadeArena(userId),
  );
  const [arenaLoading, setArenaLoading] = useState(() => !readCachedComunidadeArena(userId));
  const [arenaError, setArenaError] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<ComunidadeClienteEvolution | null>(
    () => readCachedComunidadeEvolution(userId),
  );
  const [evolutionLoading, setEvolutionLoading] = useState(
    () => !readCachedComunidadeEvolution(userId),
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAll = useCallback(
    async (options?: { background?: boolean; refresh?: boolean }) => {
      const background = options?.background ?? false;
      const refresh = options?.refresh ?? false;
      const hasCachedData = Boolean(readCachedComunidadeArena(userId));

      if (!background && !hasCachedData) {
        setArenaLoading(true);
        setEvolutionLoading(true);
      } else if (refresh || background) {
        setIsRefreshing(true);
      } else {
        return;
      }

      const [arenaResult, evolutionResult] = await Promise.all([
        fetchComunidadeArenaSnapshot({ skipSideEffects: !refresh }),
        fetchComunidadeClienteEvolution(userId),
      ]);

      setArenaLoading(false);
      setEvolutionLoading(false);
      setIsRefreshing(false);
      setRefreshToken((value) => value + 1);

      if (arenaResult.error) {
        setArenaError(arenaResult.error);
      } else if (arenaResult.data) {
        setArenaError(null);
        setArena(arenaResult.data);
        writeCachedComunidadeArena(userId, arenaResult.data);
      }

      if (evolutionResult.data) {
        setEvolution(evolutionResult.data);
        writeCachedComunidadeEvolution(userId, evolutionResult.data);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    void loadAll({ background: Boolean(readCachedComunidadeArena(userId)) });
  }, [loadAll, userId]);

  useEffect(() => {
    if (muralFocusToken <= 0) return;
    return focusComunidadeMural({ exerciseName: muralFocusExerciseName });
  }, [muralFocusExerciseName, muralFocusToken]);

  useEffect(() => {
    const focusMural = (event: Event) => {
      const detail = (event as CustomEvent<ComunidadeMuralFocusDetail>).detail;
      focusComunidadeMural(detail ?? {});
    };

    const refreshMural = () => {
      setRefreshToken((value) => value + 1);
    };

    window.addEventListener(COMUNIDADE_MURAL_FOCUS_EVENT, focusMural);
    window.addEventListener(MURAL_REFRESH_EVENT, refreshMural);
    return () => {
      window.removeEventListener(COMUNIDADE_MURAL_FOCUS_EVENT, focusMural);
      window.removeEventListener(MURAL_REFRESH_EVENT, refreshMural);
    };
  }, []);

  useEffect(() => {
    const refreshArena = () => {
      void loadAll({ background: true, refresh: true });
    };

    window.addEventListener(DUelo_ARENA_REFRESH_EVENT, refreshArena);
    return () => window.removeEventListener(DUelo_ARENA_REFRESH_EVENT, refreshArena);
  }, [loadAll]);

  const meta = arena?.meta ?? EMPTY_META;
  const pilares = arena?.pilares_cooperativos ?? [];
  const reisChamas = arena?.reis_chamas ?? { SUPERIORES: null, INFERIORES: null };
  const rankings = arena?.rankings_thoth ?? null;
  const resolvePhotoUrl = useComunidadePhotoResolver(userId, profilePhotoUrl);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={`${DASHBOARD_PANEL_FRAME} min-w-0 max-w-full overflow-x-hidden`}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena cooperativa" />

      <div className="mt-3 border-b border-orange-500/10 pb-3 sm:mt-4 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="comunidade-page-title" className={`${COMUNIDADE_PAGE_TITLE} text-balance`}>
              Conquistas & Ascensão
            </h2>
            <p className="mt-1 text-pretty text-[11px] leading-relaxed text-neutral-500 sm:text-[12px]">
              {COMUNIDADE_CLIENT_EXPLANATION}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll({ background: true, refresh: true })}
            disabled={arenaLoading || evolutionLoading || isRefreshing}
            className="min-h-11 w-full shrink-0 rounded-full border border-orange-500/25 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90 disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
          >
            {isRefreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        <nav className={COMUNIDADE_NAV} aria-label="Secções da comunidade">
          {SECTION_NAV.map(({ id, label }) => (
            <a key={id} href={`#${id}`} className={COMUNIDADE_NAV_LINK}>
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className={`${COMUNIDADE_SECTION_INNER} mt-4 space-y-4 xs:space-y-5 sm:mt-6 sm:space-y-7`}>
        <div id="comunidade-perfil" className={COMUNIDADE_SCROLL_MT}>
          <ComunidadeEvolutionStatus
            evolution={evolution}
            loading={evolutionLoading && !evolution}
            profileName={profileName}
            profilePhotoUrl={profilePhotoUrl}
          />
        </div>

        {arenaError ? (
          <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200/90">
            {arenaError}
          </p>
        ) : null}

        <div id="comunidade-arena" className={`${COMUNIDADE_SCROLL_MT} ${COMUNIDADE_SECTION_INNER} space-y-3 sm:space-y-4`}>
          <p className={COMUNIDADE_SECTION_LABEL}>Arena: termômetro coletivo e duelos</p>
          <div className="grid grid-cols-1 gap-3 xs:gap-4 lg:grid-cols-2 lg:items-start">
            <MetaColetivaTermometro
              meta={meta}
              mesReferencia={arena?.mes_referencia}
              loading={arenaLoading && !arena}
            />
            <DuelosArenaPanel
              duelos={arena?.duelos_ativos ?? []}
              campeoesCinturao={
                arena?.campeoes_cinturao ?? { SUPERIORES: null, INFERIORES: null }
              }
              campeaoCinturaoId={arena?.campeao_cinturao_id ?? null}
              rankings={rankings}
              userId={userId}
              resolvePhotoUrl={resolvePhotoUrl}
              loading={arenaLoading && !arena}
              onDueloCreated={() => void loadAll({ background: true, refresh: true })}
            />
          </div>
        </div>

        <div id="comunidade-titulos" className={COMUNIDADE_SCROLL_MT}>
          <ComunidadeTitulosPanel
            reisChamas={reisChamas}
            pilares={pilares}
            rankings={rankings}
            userId={userId}
            resolvePhotoUrl={resolvePhotoUrl}
            loading={arenaLoading && !arena}
          />
        </div>

        <div id="comunidade-rankings" className={COMUNIDADE_SCROLL_MT}>
          <RankingsThothPanel
            rankings={rankings}
            userId={userId}
            resolvePhotoUrl={resolvePhotoUrl}
            loading={arenaLoading && !arena}
          />
        </div>

        <ComunidadeMuralPanel
          userId={userId}
          refreshKey={refreshToken}
          phase={phase}
          resolvePhotoUrl={resolvePhotoUrl}
        />
      </div>
    </BrasaVivaCard>
  );
}
