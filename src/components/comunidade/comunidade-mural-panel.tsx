"use client";

import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";

type ComunidadeMuralPanelProps = {
  userId: string;
  refreshKey: string | number;
  phase: Pick<PhoenixPhaseRuntimeContext, "isForumInactive" | "isHydrated" | "vtc30d">;
};

export function ComunidadeMuralPanel({ userId, refreshKey, phase }: ComunidadeMuralPanelProps) {
  return (
    <section
      id="comunidade-mural"
      className="scroll-mt-20 sm:scroll-mt-24"
      aria-labelledby="comunidade-mural-title"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-neutral-950/95 to-orange-950/15 p-4 shadow-[0_0_40px_-12px_rgba(251,146,60,0.35)] sm:p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-orange-600/10 blur-3xl"
          aria-hidden
        />

        <header className="relative border-b border-amber-500/15 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90">
                Mural da linhagem
              </p>
              <h3
                id="comunidade-mural-title"
                className="mt-1 text-base font-semibold text-amber-50 sm:text-lg"
              >
                Vitórias partilhadas pela comunidade
              </h3>
            </div>
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200/85">
              Superações
            </span>
          </div>
          <p className="relative mt-2 max-w-prose text-[11px] leading-relaxed text-neutral-400 sm:text-[12px]">
            Quando um atleta bate o recorde pessoal no treino, a conquista aparece aqui para
            inspirar toda a academia — a força da linhagem cresce quando todos veem a ascensão uns
            dos outros.
          </p>
        </header>

        <div className="relative mt-4">
          <ForumBrasaVivaView
            userId={userId}
            embedMode
            phase={phase}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </section>
  );
}
