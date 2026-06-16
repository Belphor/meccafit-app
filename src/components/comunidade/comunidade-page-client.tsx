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
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";
import {
  fetchComunidadeArenaSnapshot,
  type ComunidadeArenaSnapshot,
} from "@/lib/comunidade-data";
import {
  fetchComunidadeClienteEvolution,
  type ComunidadeClienteEvolution,
} from "@/lib/comunidade-evolution";
import {
  DASHBOARD_INNER_FRAME,
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
  const reis = arena?.reis_das_chamas ?? [];

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={`${DASHBOARD_PANEL_FRAME} overflow-x-hidden`}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena Cooperativa" />

      <div className="mt-3 border-b border-orange-500/10 pb-3 sm:mt-4 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="comunidade-page-title" className={DASHBOARD_SECTION_TITLE}>
              Conquistas & Ascensão
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-600 sm:tracking-[0.2em]">
              Evolução · meta · duelos · rankings · mural
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
          className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Secções da comunidade"
        >
          {SECTION_NAV.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="min-h-10 shrink-0 rounded-full border border-neutral-800/90 bg-neutral-950/70 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:border-orange-500/30 hover:text-amber-200/90"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
        <div id="comunidade-perfil" className="scroll-mt-24">
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

        <div id="comunidade-arena" className="scroll-mt-24 space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
              userId={userId}
              loading={arenaLoading}
            />
          </div>
        </div>

        <div id="comunidade-titulos" className="scroll-mt-24">
          <ComunidadeTitulosPanel
            reis={reis}
            pilares={pilares}
            rankings={arena?.rankings_thoth ?? null}
            userId={userId}
            loading={arenaLoading}
          />
        </div>

        <div id="comunidade-rankings" className="scroll-mt-24">
          <RankingsThothPanel
            rankings={arena?.rankings_thoth ?? null}
            userId={userId}
            loading={arenaLoading}
          />
        </div>

        <div id="comunidade-mural" className={`${DASHBOARD_INNER_FRAME} scroll-mt-24 p-3 sm:p-4`}>
          <header className="mb-3 border-b border-orange-500/10 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/75">
              Mural · Brasa-Viva
            </p>
            <h3 className="mt-1 text-sm font-semibold text-amber-50/95">Superações da linhagem</h3>
          </header>
          <ForumBrasaVivaView
            userId={userId}
            embedMode
            phase={phase}
            refreshKey={refreshToken}
          />
        </div>
      </div>
    </BrasaVivaCard>
  );
}
