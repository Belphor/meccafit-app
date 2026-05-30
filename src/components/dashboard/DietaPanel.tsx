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
      <DashboardPanelHeader chip="Aba 2 · Dieta" meta="Consultoria Personal" />
      <div className={`${DASHBOARD_INNER_FRAME} mt-4 p-5 text-center`}>
        <h2 className={DASHBOARD_SECTION_TITLE}>Plano nutricional VIP</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/85">
          Esta aba está activa porque a sua linhagem possui vínculo com Personal. O plano
          prescrito pelo seu forjador será exibido aqui nas próximas entregas.
        </p>
      </div>
    </BrasaVivaCard>
  );
}
