"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ForjaAntiFraudPanel } from "@/app/dashboard/forja/ForjaAntiFraudPanel";
import { ForjaVtcPhaseReferencePanel } from "@/app/dashboard/forja/ForjaVtcPhaseReferencePanel";
import { ForjaBackButton } from "@/components/forjador/forja-back-button";
import { ForjaVipBondPanel } from "@/components/forjador/forja-vip-bond-panel";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { FORJA_COMMAND_PANEL } from "@/lib/forja-config";
import { resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaOperatorProfile } from "@/lib/forja-dashboard";

type MonitoramentoDetailClientProps = {
  operator: ForjaOperatorProfile;
  athlete: ForjaBondedAthlete;
};

export function MonitoramentoDetailClient({
  operator,
  athlete: initialAthlete,
}: MonitoramentoDetailClientProps) {
  const router = useRouter();
  const [athlete, setAthlete] = useState<ForjaBondedAthlete>(initialAthlete);
  const [syncedAthlete, setSyncedAthlete] = useState<ForjaBondedAthlete>(initialAthlete);

  // Ressincroniza o estado local quando o servidor recarrega (router.refresh()),
  // usando o padrão recomendado do React (ajuste durante a renderização).
  if (initialAthlete !== syncedAthlete) {
    setSyncedAthlete(initialAthlete);
    setAthlete(initialAthlete);
  }

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleAthleteUpdated = useCallback((updated: ForjaBondedAthlete) => {
    setAthlete((current) => ({ ...current, ...updated }));
  }, []);

  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={resolveForjaRoleLabel(operator.role)}
        title={athlete.displayName}
        subtitle={
          <>
            {athlete.lineageName ? `${athlete.lineageName} · ` : null}
            Monitoramento de volume, vínculo VIP e ações do cliente.
          </>
        }
      />

      <ForjaWorkspaceNav
        isSovereign={operator.isSovereign}
        activeHref="/forjador/monitoramento"
      />

      <div className="mt-6">
        <ForjaBackButton href="/forjador/monitoramento" />
      </div>

      <div className={`${FORJA_COMMAND_PANEL} mt-4 space-y-4`}>
        <ForjaVtcPhaseReferencePanel />

        <ForjaVipBondPanel
          athlete={athlete}
          operatorId={operator.userId}
          isSovereign={operator.isSovereign}
          onChanged={handleRefresh}
        />

        <ForjaAntiFraudPanel
          athlete={athlete}
          isSovereign={operator.isSovereign}
          scopeClientId={athlete.clientId}
          onActionComplete={handleRefresh}
          onAthleteUpdated={handleAthleteUpdated}
        />
      </div>
    </ForjaWorkspaceFrame>
  );
}
