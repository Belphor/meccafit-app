"use client";

import { useCallback, useEffect, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { ComunidadeEvolutionStatus } from "@/components/comunidade/comunidade-evolution-status";
import { ComunidadeTitulosPanel } from "@/components/comunidade/comunidade-titulos-panel";
import { DuelosArenaPanel } from "@/components/comunidade/duelos-arena-panel";
import { MetaColetivaTermometro } from "@/components/comunidade/meta-coletiva-termometro";
import { RankingsThothPanel } from "@/components/comunidade/rankings-por-membro-panel";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { ComunidadeMuralPanel } from "@/components/comunidade/comunidade-mural-panel";
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
      className={`${DASHBOARD_PANEL_FRAME} overflow-x-hidden`}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena cooperativa" />

      <div className="mt-3 border-b border-orange-500/10 pb-3 sm:mt-4 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="comunidade-page-title" className={DASHBOARD_SECTION_TITLE}>
              Conquistas & Ascensão
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 sm:text-[12px]">
              Acompanha a tua evolução, a meta da academia, duelos, títulos e o mural da linhagem.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={arenaLoading || evolutionLoading}
            className="min-h-11 w-full shrink-0 rounded-full border border-orange-500/25 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/90 disabled:opacity-50 sm:w-auto"
          >
            Actualizar
          </button>
        </div>

        <nav
          className="mt-4 grid grid-cols-5 gap-1 sm:mx-auto sm:max-w-lg sm:gap-2"
          aria-label="Secções da comunidade"
        >
          {SECTION_NAV.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex min-h-10 items-center justify-center rounded-full border border-neutral-800/90 bg-neutral-950/70 px-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-neutral-400 transition-colors hover:border-orange-500/30 hover:text-amber-200/90 min-[380px]:text-[10px] min-[380px]:tracking-[0.1em] sm:min-h-11 sm:px-2 sm:text-[11px]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-7">
        <div id="comunidade-perfil" className="scroll-mt-20 sm:scroll-mt-24">
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

        <div id="comunidade-arena" className="scroll-mt-20 space-y-3 sm:scroll-mt-24 sm:space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">
            Arena · meta e duelos
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <div id="comunidade-titulos" className="scroll-mt-20 sm:scroll-mt-24">
          <ComunidadeTitulosPanel
            reisChamas={reisChamas}
            pilares={pilares}
            rankings={rankings}
            userId={userId}
            loading={arenaLoading}
          />
        </div>

        <div id="comunidade-rankings" className="scroll-mt-20 sm:scroll-mt-24">
          <RankingsThothPanel rankings={rankings} userId={userId} loading={arenaLoading} />
        </div>

        <ComunidadeMuralPanel userId={userId} refreshKey={refreshToken} phase={phase} />
      </div>
    </BrasaVivaCard>
  );
}
