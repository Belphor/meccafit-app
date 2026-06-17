"use client";

import { useCallback, useEffect, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { ComunidadeEvolutionStatus } from "@/components/comunidade/comunidade-evolution-status";
import {
  COMUNIDADE_NAV,
  COMUNIDADE_NAV_LINK,
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
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import {
  fetchComunidadeArenaSnapshot,
  type ComunidadeArenaSnapshot,
} from "@/lib/comunidade-data";
import {
  fetchComunidadeClienteEvolution,
  type ComunidadeClienteEvolution,
} from "@/lib/comunidade-evolution";
import {
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

type ComunidadePageClientProps = {
  userId: string;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  phase: Pick<PhoenixPhaseRuntimeContext, "isForumInactive" | "isHydrated" | "vtc30d">;
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
}: ComunidadePageClientProps) {
  const [arena, setArena] = useState<ComunidadeArenaSnapshot | null>(null);
  const [arenaLoading, setArenaLoading] = useState(true);
  const [arenaError, setArenaError] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<ComunidadeClienteEvolution | null>(null);
  const [evolutionLoading, setEvolutionLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadAll = useCallback(async () => {
    setArenaLoading(true);
    setEvolutionLoading(true);
    const [arenaResult, evolutionResult] = await Promise.all([
      fetchComunidadeArenaSnapshot(),
      fetchComunidadeClienteEvolution(userId),
    ]);
    setArenaLoading(false);
    setEvolutionLoading(false);
    setRefreshToken((value) => value + 1);
    if (arenaResult.error) {
      setArenaError(arenaResult.error);
    } else {
      setArenaError(null);
      setArena(arenaResult.data);
    }
    if (evolutionResult.data) {
      setEvolution(evolutionResult.data);
    }
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const meta = arena?.meta ?? EMPTY_META;
  const pilares = arena?.pilares_cooperativos ?? [];
  const reisChamas = arena?.reis_chamas ?? { SUPERIORES: null, INFERIORES: null };
  const rankings = arena?.rankings_thoth ?? null;

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={`${DASHBOARD_PANEL_FRAME} max-w-full overflow-x-hidden`}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena cooperativa" />

      <div className="mt-3 border-b border-orange-500/10 pb-3 sm:mt-4 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2
              id="comunidade-page-title"
              className={`${DASHBOARD_SECTION_TITLE} text-balance leading-tight`}
            >
              Conquistas & Ascensão
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 sm:text-[12px]">
              Três formas de te destacares: ajuda a academia no termómetro, sobe no ranking mensal
              para ser Rei, ou ganha duelos pelo cinturão.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={arenaLoading || evolutionLoading}
            className="min-h-11 w-full shrink-0 rounded-full border border-orange-500/25 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90 disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
          >
            Actualizar
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
            loading={evolutionLoading}
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
          <p className={COMUNIDADE_SECTION_LABEL}>Arena · termómetro colectivo e duelos</p>
          <div className="grid grid-cols-1 gap-3 xs:gap-4 lg:grid-cols-2 lg:items-start">
            <MetaColetivaTermometro
              meta={meta}
              mesReferencia={arena?.mes_referencia}
              loading={arenaLoading}
            />
            <DuelosArenaPanel
              duelos={arena?.duelos_ativos ?? []}
              campeoesCinturao={
                arena?.campeoes_cinturao ?? { SUPERIORES: null, INFERIORES: null }
              }
              campeaoCinturaoId={arena?.campeao_cinturao_id ?? null}
              rankings={rankings}
              userId={userId}
              loading={arenaLoading}
            />
          </div>
        </div>

        <div id="comunidade-titulos" className={COMUNIDADE_SCROLL_MT}>
          <ComunidadeTitulosPanel
            reisChamas={reisChamas}
            pilares={pilares}
            rankings={rankings}
            userId={userId}
            loading={arenaLoading}
          />
        </div>

        <div id="comunidade-rankings" className={COMUNIDADE_SCROLL_MT}>
          <RankingsThothPanel rankings={rankings} userId={userId} loading={arenaLoading} />
        </div>

        <ComunidadeMuralPanel userId={userId} refreshKey={refreshToken} phase={phase} />
      </div>
    </BrasaVivaCard>
  );
}
