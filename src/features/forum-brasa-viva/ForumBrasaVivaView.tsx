"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { ForumPostCard } from "@/features/forum-brasa-viva/ForumPostCard";
import { PhaseWrapper } from "@/features/forum-brasa-viva/PhaseWrapper";
import { ReactivationFlash } from "@/features/forum-brasa-viva/ReactivationFlash";
import { useUserPhase } from "@/features/forum-brasa-viva/hooks/useUserPhase";
import type { ForumBrasaVivaTopic } from "@/features/forum-brasa-viva/types";
import { emitChronosEvent } from "@/lib/chronos-telemetry";
import {
  fetchForumBrasaVivaTopics,
  mapInitialForumTopics,
} from "@/lib/forum-brasa-viva-data";
import type { CommunityMuralRow } from "@/lib/dashboard-data";
import {
  DASHBOARD_EMPTY_STATE,
  DASHBOARD_MURAL_LIST,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

export type ForumBrasaVivaViewProps = {
  userId: string;
  profileRow: Record<string, unknown> | null | undefined;
  liveSessionVtcKg?: number;
  initialTopics?: ForumBrasaVivaTopic[];
  initialMuralRows?: CommunityMuralRow[] | null;
};

export function ForumBrasaVivaView({
  userId,
  profileRow,
  liveSessionVtcKg = 0,
  initialTopics,
  initialMuralRows,
}: ForumBrasaVivaViewProps) {
  const seededTopics =
    initialTopics ??
    (initialMuralRows ? mapInitialForumTopics(initialMuralRows) : []);

  const [topics, setTopics] = useState<ForumBrasaVivaTopic[]>(seededTopics);
  const [loading, setLoading] = useState(seededTopics.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [showReactivationFlash, setShowReactivationFlash] = useState(false);

  const phase = useUserPhase({ userId, profileRow, liveSessionVtcKg });
  const restorationRef = useRef(false);
  const chronosViewRef = useRef(false);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const result = await fetchForumBrasaVivaTopics();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setTopics(result.data);
  }, []);

  useEffect(() => {
    if (seededTopics.length === 0) {
      void loadTopics();
    }
  }, [loadTopics, seededTopics.length]);

  useEffect(() => {
    if (initialTopics && initialTopics.length > 0) {
      setTopics(initialTopics);
      setLoading(false);
      setError(null);
    }
  }, [initialTopics]);

  useEffect(() => {
    if (!phase.isHydrated || chronosViewRef.current) return;
    chronosViewRef.current = true;
    emitChronosEvent({
      type: "forum_brasa_viva_view",
      at: new Date().toISOString(),
      userId,
      topicCount: topics.length,
    });
  }, [phase.isHydrated, topics.length, userId]);

  useEffect(() => {
    const restorationNow = phase.restorationActive;
    if (restorationNow && !restorationRef.current) {
      setShowReactivationFlash(true);
    }
    restorationRef.current = restorationNow;
  }, [phase.restorationActive]);

  const handleFlashComplete = useCallback(() => {
    setShowReactivationFlash(false);
  }, []);

  return (
    <>
      <ReactivationFlash
        active={showReactivationFlash}
        userId={userId}
        sessionVtcKg={phase.sessionVtcToday}
        phaseLayout={phase.activePhaseLayout}
        onComplete={handleFlashComplete}
      />

      <PhaseWrapper isInactive={phase.isInactive} isHydrated={phase.isHydrated}>
        <BrasaVivaCard
          as="section"
          variant="treino"
          className={DASHBOARD_PANEL_FRAME}
          aria-labelledby="forum-brasa-viva-title"
        >
          <DashboardPanelHeader chip="Aba 6 · Fórum Brasa-Viva" meta="Comunidade Meccafit" />

          <h2 id="forum-brasa-viva-title" className={`${DASHBOARD_SECTION_TITLE} mt-4`}>
            Fórum Brasa-Viva
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            Tópicos de ascensão da linhagem. Cada card reflete a fase do autor — Cinza, Faísca,
            Labareda ou Magma. Forjadores soberanos observam, mas não competem neste fórum.
          </p>

          {phase.isHydrated && phase.isInactive ? (
            <p
              className="mt-3 rounded-xl border border-neutral-600/25 bg-neutral-950/50 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500"
              role="status"
            >
              Gravidade térmica · layout em cinzas ({phase.vtc30d.toLocaleString("pt-BR")} kg / 30d).
              Reengaje no altar para acender o flash de reativação.
            </p>
          ) : null}

          {loading ? (
            <p className={`${DASHBOARD_EMPTY_STATE} animate-pulse`}>Acendendo o fórum...</p>
          ) : error ? (
            <div className={DASHBOARD_EMPTY_STATE}>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadTopics()}
                className="mt-3 min-h-11 rounded-full border border-orange-500/25 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90"
              >
                Tentar novamente
              </button>
            </div>
          ) : topics.length === 0 ? (
            <p className={DASHBOARD_EMPTY_STATE}>
              Nenhum tópico aceso ainda. Supere seu recorde histórico para publicar no Fórum
              Brasa-Viva.
            </p>
          ) : (
            <ul className={`mt-6 ${DASHBOARD_MURAL_LIST}`}>
              {topics.map((topic) => (
                <li key={topic.id}>
                  <ForumPostCard topic={topic} />
                </li>
              ))}
            </ul>
          )}
        </BrasaVivaCard>
      </PhaseWrapper>
    </>
  );
}
