"use client";

import { useState } from "react";
import { DietExcelDropzone } from "@/components/forjador/diet-excel-dropzone";
import { ForjaDietBlueprintForm } from "@/components/forjador/forja-diet-blueprint-form";
import { ForjadorVipWorkspace } from "@/components/forjador/forjador-vip-workspace";
import { FORJA_META, FORJA_TAB_ACTIVE, FORJA_TAB_IDLE } from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";

type DietaPageClientProps = {
  payload: ForjaDashboardPayload;
};

type DietaWorkspaceTab = "plano" | "importar";

const DIETA_TABS: Array<{ id: DietaWorkspaceTab; label: string; description: string }> = [
  {
    id: "plano",
    label: "Plano alimentar",
    description: "Monte metas, refeições e observações para o cliente VIP.",
  },
  {
    id: "importar",
    label: "Importar planilha",
    description: "Carregue uma planilha Excel com o plano pronto.",
  },
];

export function DietaPageClient({ payload }: DietaPageClientProps) {
  const [activeTab, setActiveTab] = useState<DietaWorkspaceTab>("plano");
  const activeMeta = DIETA_TABS.find((tab) => tab.id === activeTab) ?? DIETA_TABS[0];

  return (
    <ForjadorVipWorkspace
      payload={payload}
      title="Nutrição"
      description="Publique o plano alimentar de longo prazo do cliente VIP — metas diárias, refeições e observações."
      activeRoute="/forjador/dieta"
    >
      {({ athlete }) =>
        athlete ? (
          <>
            <nav
              aria-label="Opções de nutrição"
              className="mb-5 flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
            >
              <div className="flex flex-wrap gap-2">
                {DIETA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      activeTab === tab.id ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className={`${FORJA_META} max-w-md text-left sm:text-right`}>{activeMeta.description}</p>
            </nav>

            {activeTab === "plano" ? (
              <ForjaDietBlueprintForm
                athlete={athlete}
                isSovereign={payload.operator.isSovereign}
              />
            ) : null}

            {activeTab === "importar" ? (
              <DietExcelDropzone
                athlete={athlete}
                disabled={athlete.hasVipBond === false}
                isSovereign={payload.operator.isSovereign}
              />
            ) : null}

            {athlete.hasVipBond === false ? (
              <p className={`${FORJA_META} mt-4 rounded-xl border border-zinc-800/80 px-4 py-3`}>
                {FORJA_COPY.diet.noVipBond}
              </p>
            ) : null}
          </>
        ) : null
      }
    </ForjadorVipWorkspace>
  );
}
