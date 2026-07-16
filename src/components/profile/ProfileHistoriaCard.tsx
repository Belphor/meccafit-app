"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  ALQUIMIA_MANIFESTO_BUTTON,
  ALQUIMIA_MANIFESTO_CHIP,
  ALQUIMIA_MANIFESTO_META,
  ALQUIMIA_MANIFESTO_TITLE,
} from "@/lib/alquimia-manifesto";
import { openAlquimiaManifesto } from "@/lib/alquimia-manifesto-events";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  EXERCISE_VIDEO_BUTTON,
} from "@/lib/dashboard-config";
import { LoreEm } from "@/lib/lore-emphasis";

/** Card História · Manifesto Primordial (aba Perfil). */
export function ProfileHistoriaCard() {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      data-tour-target="perfil-historia"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="perfil-historia-title"
    >
      <DashboardPanelHeader chip={ALQUIMIA_MANIFESTO_CHIP} meta={ALQUIMIA_MANIFESTO_META} />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
        <div className="space-y-2">
          <h2 id="perfil-historia-title" className={DASHBOARD_SECTION_TITLE}>
            História
          </h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            A origem da forja FENYXIA. O mito que une o ferro ancestral ao altar moderno do{" "}
            <LoreEm>MECCAFIT</LoreEm>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAlquimiaManifesto({ narrate: true })}
          className={`${EXERCISE_VIDEO_BUTTON} w-full justify-center px-4 py-3 text-center text-[10px] leading-snug tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em]`}
          aria-label={`Abrir ${ALQUIMIA_MANIFESTO_TITLE}`}
        >
          {ALQUIMIA_MANIFESTO_BUTTON}
        </button>
      </div>
    </BrasaVivaCard>
  );
}
