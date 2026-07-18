"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ForjaClientPicker } from "@/components/forjador/forja-client-picker";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { FORJA_META, FORJA_SECTION_CHIP } from "@/lib/forja-config";
import {
  FORJA_COPY,
  resolveForjaPanelSubtitle,
  resolveForjaPanelTitle,
  resolveForjaRoleLabel,
} from "@/lib/forja-copy";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";

type ForjaClientProps = {
  payload: ForjaDashboardPayload;
};

export function ForjaClient({ payload }: ForjaClientProps) {
  const router = useRouter();

  const handleSelectAthlete = useCallback(
    (clientId: string) => {
      router.push(`/dashboard/forja/${clientId}`);
    },
    [router],
  );

  const emptyMessage = payload.operator.isSovereign
    ? FORJA_COPY.emptyAthletesSovereign
    : FORJA_COPY.emptyAthletes;

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={resolveForjaRoleLabel(payload.operator.role)}
        title={resolveForjaPanelTitle(payload.operator)}
        subtitle={resolveForjaPanelSubtitle(payload.operator, payload.athletes.length)}
      />

      <ForjaWorkspaceNav isSovereign={payload.operator.isSovereign} activeHref="/dashboard/forja" />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className={FORJA_SECTION_CHIP}>
            {payload.operator.isSovereign ? "Clientes" : "Meus clientes"}
          </p>
          <span className="text-xs tabular-nums text-zinc-600">{payload.athletes.length}</span>
        </div>

        <p className={`${FORJA_META} mb-4`}>
          Pesquise pelo nome e{" "}
          <strong className="font-medium text-zinc-300">toque em um cliente</strong> para abrir o
          treino dele em página própria.
        </p>

        <ForjaClientPicker
          athletes={payload.athletes}
          onSelect={handleSelectAthlete}
          emptyMessage={emptyMessage}
        />
      </div>
    </ForjaWorkspaceFrame>
  );
}
