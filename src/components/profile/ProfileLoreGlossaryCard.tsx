"use client";

import Link from "next/link";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  EXERCISE_VIDEO_BUTTON,
} from "@/lib/dashboard-config";
import {
  PROFILE_LEXICO_ROUTE,
  PROFILE_LEXICO_TITLE,
} from "@/lib/profile-knowledge-routes";

/** Card do léxico da lore · abre página dedicada com os significados. */
export function ProfileLoreGlossaryCard() {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      data-tour-target="perfil-lexico"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="perfil-lexico-title"
    >
      <DashboardPanelHeader chip="Léxico" meta="Palavras da forja" />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
        <div className="space-y-1.5">
          <h2 id="perfil-lexico-title" className={DASHBOARD_SECTION_TITLE}>
            {PROFILE_LEXICO_TITLE}
          </h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            Cada palavra da lore e seu significado real na musculação.
          </p>
        </div>

        <Link
          href={PROFILE_LEXICO_ROUTE}
          className={`${EXERCISE_VIDEO_BUTTON} w-full justify-center px-4 py-3 text-center text-[10px] leading-snug tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em]`}
          aria-label={`Abrir ${PROFILE_LEXICO_TITLE}`}
        >
          Abrir Léxico da Forja
        </Link>
      </div>
    </BrasaVivaCard>
  );
}
