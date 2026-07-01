"use client";

import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_CHIP,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADING,
  COMUNIDADE_MURAL_SCROLL_MT,
  COMUNIDADE_SCROLL_MT,
} from "@/components/comunidade/comunidade-layout";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";

type ComunidadeMuralPanelProps = {
  userId: string;
  refreshKey: string | number;
  phase: Pick<PhoenixPhaseRuntimeContext, "isForumInactive" | "isHydrated" | "vtcMonth">;
  resolvePhotoUrl?: (atletaId: string) => string | null;
};

export function ComunidadeMuralPanel({
  userId,
  refreshKey,
  phase,
  resolvePhotoUrl,
}: ComunidadeMuralPanelProps) {
  return (
    <section
      id="comunidade-mural"
      className={`${COMUNIDADE_SCROLL_MT} ${COMUNIDADE_MURAL_SCROLL_MT}`}
      aria-labelledby="comunidade-mural-title"
    >
      <div
        data-comunidade-mural-panel
        className="relative box-border min-w-0 max-w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-neutral-950/95 to-orange-950/15 p-3 shadow-[0_0_40px_-12px_rgba(251,146,60,0.35)] xs:p-4 sm:p-5"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-orange-600/10 blur-3xl"
          aria-hidden
        />

        <header className="relative border-b border-amber-500/15 pb-3 xs:pb-4">
          <div className="flex flex-col gap-2 xs:flex-row xs:items-start xs:justify-between xs:gap-3">
            <div className="min-w-0 flex-1">
              <p className={`${COMUNIDADE_EYEBROW} text-amber-200/90`}>Mural da linhagem</p>
              <h3
                id="comunidade-mural-title"
                className={`${COMUNIDADE_HEADING} text-amber-50 xs:text-base sm:text-lg`}
              >
                Vitórias da linhagem
              </h3>
            </div>
            <span className={`${COMUNIDADE_CHIP} w-fit shrink-0 border-amber-500/30 bg-amber-950/40 text-amber-200/85`}>
              Superações de hoje
            </span>
          </div>
          <p className={`relative mt-2 max-w-prose ${COMUNIDADE_BODY_TEXT} text-neutral-400`}>
            Superações de hoje (horário de Brasília). Quando bates o teu recorde num exercício, a
            conquista aparece aqui para motivar os restantes.
          </p>
        </header>

        <div className="relative mt-3 min-w-0 xs:mt-4">
          <ForumBrasaVivaView
            userId={userId}
            embedMode
            phase={phase}
            refreshKey={refreshKey}
            resolvePhotoUrl={resolvePhotoUrl}
          />
        </div>
      </div>
    </section>
  );
}
