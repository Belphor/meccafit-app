"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ForjaClientPicker } from "@/components/forjador/forja-client-picker";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { FORJA_META, FORJA_SECTION_CHIP } from "@/lib/forja-config";
import { resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";

type DietaPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function DietaPageClient({ payload }: DietaPageClientProps) {
  const router = useRouter();

  const handleSelectAthlete = useCallback(
    (clientId: string) => {
      router.push(`/forjador/dieta/${clientId}`);
    },
    [router],
  );

  const emptyMessage = payload.operator.isSovereign
    ? "Nenhum cliente VIP na academia."
    : "Nenhum cliente VIP no seu vínculo.";

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={`VIP, ${resolveForjaRoleLabel(payload.operator.role)}`}
        title="Nutrição"
        subtitle={
          <>
            Publique o{" "}
            <strong className="font-medium text-zinc-300">plano alimentar de longo prazo</strong> do
            cliente VIP: metas diárias, refeições e observações clínicas.
          </>
        }
      />

      <ForjaWorkspaceNav isSovereign={payload.operator.isSovereign} activeHref="/forjador/dieta" />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className={FORJA_SECTION_CHIP}>
            {payload.operator.isSovereign ? "Clientes VIP" : "Meus VIP"}
          </p>
          <span className="text-xs tabular-nums text-zinc-600">{payload.athletes.length}</span>
        </div>

        <p className={`${FORJA_META} mb-4`}>
          Pesquise pelo nome e{" "}
          <strong className="font-medium text-zinc-300">toque em um cliente</strong> para abrir a
          nutrição dele em página própria.
        </p>

        <ForjaClientPicker
          athletes={payload.athletes}
          onSelect={handleSelectAthlete}
          emptyMessage={emptyMessage}
          vipHighlight
        />
      </div>
    </ForjaWorkspaceFrame>
  );
}
