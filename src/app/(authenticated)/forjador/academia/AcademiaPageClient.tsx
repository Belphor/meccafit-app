"use client";

import { AcademiaConfigPanel } from "@/components/forjador/academia-config-panel";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { FORJA_COMMAND_PANEL } from "@/lib/forja-config";
import { resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";

type AcademiaPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function AcademiaPageClient({ payload }: AcademiaPageClientProps) {
  return (
    <ForjaWorkspaceFrame maxWidthClassName="max-w-5xl">
      <ForjaWorkspaceHeader
        chip={resolveForjaRoleLabel(payload.operator.role)}
        title="Academia"
        subtitle={
          <>
            Termômetro coletivo da{" "}
            <strong className="font-medium text-zinc-300">Comunidade</strong> e manutenção dos
            limiares da{" "}
            <strong className="font-medium text-zinc-300">Chama Acumulada da Linhagem</strong>.
            Somente o <strong className="font-medium text-zinc-300">Forjador Soberano</strong> edita
            metas e dificuldade.
          </>
        }
      />

      <ForjaWorkspaceNav
        isSovereign={payload.operator.isSovereign}
        activeHref="/forjador/academia"
      />

      <div className={`${FORJA_COMMAND_PANEL} mt-6`}>
        <AcademiaConfigPanel isSovereign={payload.operator.isSovereign} />
      </div>
    </ForjaWorkspaceFrame>
  );
}
