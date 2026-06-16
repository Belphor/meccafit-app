"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { ForumPostCard } from "@/features/forum-brasa-viva/ForumPostCard";
import { PhaseWrapper } from "@/features/forum-brasa-viva/PhaseWrapper";
import type { ForumBrasaVivaTopic } from "@/features/forum-brasa-viva/types";
import { emitClientTelemetry } from "@/lib/client-telemetry";
import { fetchForumBrasaVivaTopics } from "@/lib/forum-brasa-viva-data";
import {
  DASHBOARD_EMPTY_STATE,
  DASHBOARD_MURAL_LIST,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

export type ForumBrasaVivaViewProps = {
  userId: string;
  /** Quando true, omite card/header externos (uso em /comunidade) */
  embedMode?: boolean;
  /** Muda quando a página Comunidade actualiza — recarrega o mural */
  refreshKey?: string | number;
  phase: Pick<
    PhoenixPhaseRuntimeContext,
    "isForumInactive" | "isHydrated" | "vtc30d"
  >;
};

export function ForumBrasaVivaView({
  userId,
  embedMode = false,
  refreshKey = 0,
  phase,
}: ForumBrasaVivaViewProps) {
  const [topics, setTopics] = useState<ForumBrasaVivaTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const telemetryViewRef = useRef(false);

  const loadTopics = useCallback(async () => {
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
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const result = await fetchForumBrasaVivaTopics();
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setTopics(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!phase.isHydrated || telemetryViewRef.current) return;
    telemetryViewRef.current = true;
    emitClientTelemetry({
      type: "forum_brasa_viva_view",
      at: new Date().toISOString(),
      userId,
      topicCount: topics.length,
    });
  }, [phase.isHydrated, topics.length, userId]);

  const forumBody = (
    <>
      {!embedMode ? (
        <>
          <DashboardPanelHeader chip="Fórum Brasa-Viva" meta="Comunidade Meccafit" />

          <h2 id="forum-brasa-viva-title" className={`${DASHBOARD_SECTION_TITLE} mt-4`}>
            Fórum Brasa-Viva
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            Tópicos de ascensão da linhagem — superações validadas por ARGOS. Forjadores soberanos
            observam, mas não competem neste fórum.
          </p>
        </>
      ) : null}

      {phase.isHydrated && phase.isForumInactive ? (
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
            onClick={() => {
              setLoading(true);
              void loadTopics();
            }}
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
        <ul className={`${embedMode ? "mt-2" : "mt-6"} ${DASHBOARD_MURAL_LIST}`}>
          {topics.map((topic) => (
            <li key={topic.id}>
              <ForumPostCard topic={topic} />
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <PhaseWrapper isInactive={phase.isForumInactive} isHydrated={phase.isHydrated}>
      {embedMode ? (
        forumBody
      ) : (
        <BrasaVivaCard
          as="section"
          variant="treino"
          className={DASHBOARD_PANEL_FRAME}
          aria-labelledby="forum-brasa-viva-title"
        >
          {forumBody}
        </BrasaVivaCard>
      )}
    </PhaseWrapper>
  );
}
