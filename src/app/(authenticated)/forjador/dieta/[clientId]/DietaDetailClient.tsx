"use client";

import { useState } from "react";
import { DietExcelDropzone } from "@/components/forjador/diet-excel-dropzone";
import { ForjaBackButton } from "@/components/forjador/forja-back-button";
import { ForjaDietBlueprintForm } from "@/components/forjador/forja-diet-blueprint-form";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import {
  FORJA_COMMAND_PANEL,
  FORJA_META,
  FORJA_TAB_ACTIVE,
  FORJA_TAB_IDLE,
} from "@/lib/forja-config";
import { FORJA_COPY, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaOperatorProfile } from "@/lib/forja-dashboard";

type DietaDetailClientProps = {
  operator: ForjaOperatorProfile;
  athlete: ForjaBondedAthlete;
};

type DietaWorkspaceTab = "plano" | "importar";

const DIETA_TABS: Array<{ id: DietaWorkspaceTab; label: string }> = [
  { id: "plano", label: "Plano alimentar" },
  { id: "importar", label: "Importar planilha" },
];

export function DietaDetailClient({ operator, athlete }: DietaDetailClientProps) {
  const [activeTab, setActiveTab] = useState<DietaWorkspaceTab>("plano");

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={`VIP, ${resolveForjaRoleLabel(operator.role)}`}
        title={athlete.displayName}
        subtitle={
          <>
            {athlete.lineageName ? `${athlete.lineageName} · ` : null}
            Plano alimentar de longo prazo deste cliente VIP.
          </>
        }
      />

      <ForjaWorkspaceNav isSovereign={operator.isSovereign} activeHref="/forjador/dieta" />

      <div className="mt-6">
        <ForjaBackButton href="/forjador/dieta" />
      </div>

      <div className={`${FORJA_COMMAND_PANEL} mt-4`}>
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
                className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  activeTab === tab.id ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className={`${FORJA_META} max-w-md text-left sm:text-right`}>
            {activeTab === "plano" ? (
              <>
                Monte <strong className="font-medium text-zinc-300">metas diárias</strong>, refeições
                e observações clínicas para o cliente VIP vinculado.
              </>
            ) : (
              <>
                Carregue uma planilha Excel com o{" "}
                <strong className="font-medium text-zinc-300">plano alimentar</strong> pronto.
              </>
            )}
          </p>
        </nav>

        {activeTab === "plano" ? (
          <ForjaDietBlueprintForm athlete={athlete} isSovereign={operator.isSovereign} />
        ) : null}

        {activeTab === "importar" ? (
          <DietExcelDropzone
            athlete={athlete}
            disabled={athlete.hasVipBond === false}
            isSovereign={operator.isSovereign}
          />
        ) : null}

        {athlete.hasVipBond === false ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-zinc-800/80 px-4 py-3`}>
            {FORJA_COPY.diet.noVipBond}
          </p>
        ) : null}
      </div>
    </ForjaWorkspaceFrame>
  );
}
