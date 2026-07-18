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

type MedidasPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function MedidasPageClient({ payload }: MedidasPageClientProps) {
  const router = useRouter();

  const handleSelectAthlete = useCallback(
    (clientId: string) => {
      router.push(`/forjador/medidas/${clientId}`);
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
        title="Medidas VIP"
        subtitle={
          <>
            Registre <strong className="font-medium text-zinc-300">peso</strong>,{" "}
            <strong className="font-medium text-zinc-300">dobras</strong> e{" "}
            <strong className="font-medium text-zinc-300">composição corporal</strong> do cliente
            VIP; guarde no aparelho e publique quando estiver pronto.
          </>
        }
      />

      <ForjaWorkspaceNav isSovereign={payload.operator.isSovereign} activeHref="/forjador/medidas" />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className={FORJA_SECTION_CHIP}>
            {payload.operator.isSovereign ? "Clientes VIP" : "Meus VIP"}
          </p>
          <span className="text-xs tabular-nums text-zinc-600">{payload.athletes.length}</span>
        </div>

        <p className={`${FORJA_META} mb-4`}>
          Pesquise pelo nome e{" "}
          <strong className="font-medium text-zinc-300">toque em um cliente</strong> para abrir as
          medidas dele em página própria.
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
