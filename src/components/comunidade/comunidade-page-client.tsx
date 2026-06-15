"use client";

import { useCallback, useEffect, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DuelosArenaPanel } from "@/components/comunidade/duelos-arena-panel";
import { MetaColetivaTermometro } from "@/components/comunidade/meta-coletiva-termometro";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";
import {
  fetchComunidadeArenaSnapshot,
  type ComunidadeArenaSnapshot,
} from "@/lib/comunidade-data";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

type ComunidadePageClientProps = {
  userId: string;
  phase: Pick<PhoenixPhaseRuntimeContext, "isForumInactive" | "isHydrated" | "vtc30d">;
};

const EMPTY_META = {
  tonelagem_alvo_kg: 100_000,
  tonelagem_atual_acumulada: 0,
  progresso_pct: 0,
};

export function ComunidadePageClient({ userId, phase }: ComunidadePageClientProps) {
  const [arena, setArena] = useState<ComunidadeArenaSnapshot | null>(null);
  const [arenaLoading, setArenaLoading] = useState(true);
  const [arenaError, setArenaError] = useState<string | null>(null);

  const loadArena = useCallback(async () => {
    setArenaLoading(true);
    const result = await fetchComunidadeArenaSnapshot();
    setArenaLoading(false);
    if (result.error) {
      setArenaError(result.error);
      return;
    }
    setArenaError(null);
    setArena(result.data);
  }, []);

  useEffect(() => {
    void loadArena();
  }, [loadArena]);

  const meta = arena?.meta ?? EMPTY_META;
  const pilares = arena?.pilares_fogo_cosmico ?? [];

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena Cooperativa" />

      <div className="mt-4 border-b border-orange-500/10 pb-4">
        <h2 id="comunidade-page-title" className={DASHBOARD_SECTION_TITLE}>
          Conquistas & Ascensão
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Meta colectiva · duelos · pilares · mural Brasa-Viva
        </p>
      </div>

      <div className="mt-4 space-y-4 sm:mt-6">
        {arenaError ? (
          <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90">
            {arenaError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MetaColetivaTermometro
            meta={meta}
            mesReferencia={arena?.mes_referencia}
            loading={arenaLoading}
          />
          <DuelosArenaPanel
            duelos={arena?.duelos_ativos ?? []}
            campeaoCinturaoId={arena?.campeao_cinturao_id ?? null}
            userId={userId}
            loading={arenaLoading}
          />
        </div>

        {pilares.length > 0 ? (
          <section
            className="rounded-2xl border border-[#FFD700]/20 bg-gradient-to-r from-neutral-950/90 to-amber-950/15 p-4"
            aria-label="Pilares fogo cósmico do mês"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFD700]/90">
              Pilares · Fogo Cósmico
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Top 3 VTC do mês anterior — borda ouro pulsante no avatar.
            </p>
            <ul className="mt-3 flex flex-wrap gap-4">
              {pilares.map((pilar) => (
                <li key={pilar.atleta_id} className="flex flex-col items-center gap-1">
                  <PlutusAvatar isPilarFogoCosmico size="md" />
                  <span className="max-w-[5rem] truncate font-mono text-[9px] text-neutral-500">
                    {pilar.atleta_id === userId ? "Tu" : pilar.atleta_id.slice(0, 8)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={`${DASHBOARD_INNER_FRAME} p-3 sm:p-4`}>
          <ForumBrasaVivaView userId={userId} embedMode phase={phase} />
        </div>
      </div>
    </BrasaVivaCard>
  );
}
