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
  FENYXIA_EMPRESA_BUTTON,
  FENYXIA_EMPRESA_CHIP,
  FENYXIA_EMPRESA_META,
  FENYXIA_EMPRESA_ROUTE,
  FENYXIA_EMPRESA_TITLE,
} from "@/lib/fenyxia-empresa";
import { LoreEm } from "@/lib/lore-emphasis";

/** Card Empresa Fenyxia · abre a página de apresentação da casa. */
export function ProfileFenyxiaEmpresaCard() {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      data-tour-target="perfil-fenyxia-empresa"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="perfil-fenyxia-empresa-title"
    >
      <DashboardPanelHeader chip={FENYXIA_EMPRESA_CHIP} meta={FENYXIA_EMPRESA_META} />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
        <div className="space-y-2">
          <h2 id="perfil-fenyxia-empresa-title" className={DASHBOARD_SECTION_TITLE}>
            {FENYXIA_EMPRESA_TITLE}
          </h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            A casa em fundação por trás deste altar. O primeiro projeto no modelo{" "}
            <LoreEm>FENYXIA</LoreEm>, feito para vitrine, sem cobranças dentro do produto.
          </p>
        </div>

        <Link
          href={FENYXIA_EMPRESA_ROUTE}
          className={`${EXERCISE_VIDEO_BUTTON} w-full justify-center px-4 py-3 text-center text-[10px] leading-snug tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em]`}
          aria-label={`Abrir ${FENYXIA_EMPRESA_TITLE}`}
        >
          {FENYXIA_EMPRESA_BUTTON}
        </Link>
      </div>
    </BrasaVivaCard>
  );
}
