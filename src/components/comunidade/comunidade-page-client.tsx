"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

type ComunidadePageClientProps = {
  userId: string;
};

export function ComunidadePageClient({ userId }: ComunidadePageClientProps) {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="comunidade-page-title"
    >
      <DashboardPanelHeader chip="Comunidade" meta="Arena Brasa-Viva" />

      <div className="mt-4 border-b border-orange-500/10 pb-4">
        <h1 id="comunidade-page-title" className={DASHBOARD_SECTION_TITLE}>
          Conquistas & Fórum
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Tópicos de ascensão · mural de evolução · fase térmica do autor
        </p>
      </div>

      <div className={`mt-6 ${DASHBOARD_INNER_FRAME} p-4`}>
        <ForumBrasaVivaView
          userId={userId}
          embedMode
          phase={{ isForumInactive: false, isHydrated: true, vtc30d: 0 }}
        />
      </div>
    </BrasaVivaCard>
  );
}
