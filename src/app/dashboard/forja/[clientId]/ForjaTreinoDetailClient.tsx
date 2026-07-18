"use client";

import { useState } from "react";
import { ForjaCommandPanel } from "@/app/dashboard/forja/ForjaCommandPanel";
import { ForjaBackButton } from "@/components/forjador/forja-back-button";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { TreinoPrescriptionExcelDropzone } from "@/components/forjador/treino-prescription-excel-dropzone";
import {
  FORJA_COMMAND_PANEL,
  FORJA_META,
  FORJA_TAB_ACTIVE,
  FORJA_TAB_IDLE,
} from "@/lib/forja-config";
import { FORJA_WORKSPACE_TABS, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type {
  ForjaBondedAthlete,
  ForjaOperatorProfile,
  ForjaWorkspaceTab,
} from "@/lib/forja-dashboard";

type ForjaTreinoDetailClientProps = {
  operator: ForjaOperatorProfile;
  athlete: ForjaBondedAthlete;
};

export function ForjaTreinoDetailClient({ operator, athlete }: ForjaTreinoDetailClientProps) {
  const [activeTab, setActiveTab] = useState<ForjaWorkspaceTab>("comando");

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={resolveForjaRoleLabel(operator.role)}
        title={athlete.displayName}
        subtitle={
          <>
            {athlete.lineageName ? `${athlete.lineageName} · ` : null}
            Montagem e importação de treino deste cliente.
          </>
        }
      />

      <ForjaWorkspaceNav isSovereign={operator.isSovereign} activeHref="/dashboard/forja" />

      <div className="mt-6">
        <ForjaBackButton href="/dashboard/forja" />
      </div>

      <div className={`${FORJA_COMMAND_PANEL} mt-4`}>
        <nav
          aria-label="Secções do painel"
          className="mb-5 flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
        >
          <div className="flex flex-wrap gap-2">
            {FORJA_WORKSPACE_TABS.map((tab) => (
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
            {activeTab === "comando" ? (
              <>
                Escolha o <strong className="font-medium text-zinc-300">dia da planilha</strong> (1 a
                6), marque os grupos musculares e monte cada exercício.
              </>
            ) : (
              <>
                Envie dias, grupos e exercícios numa só planilha. O treino anterior é{" "}
                <strong className="font-medium text-zinc-300">substituído por completo</strong>.
              </>
            )}
          </p>
        </nav>

        {activeTab === "comando" ? (
          <ForjaCommandPanel key={athlete.clientId} athlete={athlete} />
        ) : null}

        {activeTab === "planilha" ? <TreinoPrescriptionExcelDropzone athlete={athlete} /> : null}
      </div>
    </ForjaWorkspaceFrame>
  );
}
