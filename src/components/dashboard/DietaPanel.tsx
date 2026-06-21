"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

export function DietaPanel() {
  return (
    <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
      <DashboardPanelHeader chip="Dieta" meta="Consultoria personal" />
      <div className={`${DASHBOARD_INNER_FRAME} mt-4 p-5 text-center`}>
        <h2 className={DASHBOARD_SECTION_TITLE}>Plano nutricional VIP</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/85">
          Esta aba está activa porque possui vínculo VIP com Personal. Prescrições forjadas em{" "}
          <span className="text-emerald-300/90">historico_treinos_personais</span> reflectem-se no
          treino via Personal. Blueprint nutricional termogénico em integração.
        </p>
      </div>
    </BrasaVivaCard>
  );
}
