"use client";

import type { ReactNode } from "react";
import { PhaseWrapper } from "@/features/forum-brasa-viva/PhaseWrapper";

type TreinoLinhagemInactivityDegradationProps = {
  active: boolean;
  message: string;
  children: ReactNode;
};

/** Degradação visual da aba Treino enquanto o aviso de inatividade aguarda dispensa. */
export function TreinoLinhagemInactivityDegradation({
  active,
  message,
  children,
}: TreinoLinhagemInactivityDegradationProps) {
  if (!active || !message.trim()) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4" data-linhagem-inactivity-degraded="true">
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-neutral-500/35 bg-gradient-to-br from-neutral-950/92 via-neutral-950/85 to-black px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
          Aviso pendente de dispensa · inatividade da linhagem
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-200">{message}</p>
      </div>

      <PhaseWrapper isInactive isHydrated className="relative">
        <div
          className="pointer-events-none absolute inset-0 z-[1] meccafit-thermal-gravity-veil rounded-2xl"
          aria-hidden
        />
        <div className="relative z-[2]">{children}</div>
      </PhaseWrapper>
    </div>
  );
}
