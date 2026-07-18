"use client";

import { useCallback, useEffect, useState } from "react";
import { ForjaBackButton } from "@/components/forjador/forja-back-button";
import { ForjaWorkspaceFrame } from "@/components/forjador/forja-workspace-frame";
import { ForjaWorkspaceHeader } from "@/components/forjador/forja-workspace-header";
import { ForjaWorkspaceNav } from "@/components/forjador/forja-workspace-nav";
import { ScientificMetricsTable } from "@/components/forjador/scientific-metrics-table";
import { SovereignManagement } from "@/components/forjador/sovereign-management";
import { FORJA_COMMAND_PANEL } from "@/lib/forja-config";
import { FORJA_COPY, resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaBondedAthlete, ForjaOperatorProfile } from "@/lib/forja-dashboard";
import { syncLatestScientificMetricsToNucleus } from "@/lib/forja-scientific-metrics-sync";
import { canOperatorAccessMedidasAthlete } from "@/lib/medidas-access";
import {
  mergeScientificEntries,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import {
  appendScientificMetricsEntry,
  deleteScientificMetricsEntry,
  isForjadorVipIndexedDbAvailable,
  listScientificMetricsHistory,
  resolveLatestScientificEntry,
} from "@/services/forjador-vip-indexeddb";

type MedidasDetailClientProps = {
  operator: ForjaOperatorProfile;
  athlete: ForjaBondedAthlete;
  initialSnapshot: ScientificMetricsEntry | null;
};

function ScientificMetricsWorkspace({
  athlete,
  operatorId,
  isSovereign,
  initialSnapshot,
}: {
  athlete: ForjaBondedAthlete;
  operatorId: string;
  isSovereign: boolean;
  initialSnapshot: ScientificMetricsEntry | null;
}) {
  const [entries, setEntries] = useState<ScientificMetricsEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const canAccess = canOperatorAccessMedidasAthlete(athlete, operatorId, isSovereign);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!canAccess) {
        setEntries([]);
        setHydrated(true);
        return;
      }

      if (!isForjadorVipIndexedDbAvailable()) {
        setEntries(initialSnapshot ? [initialSnapshot] : []);
        if (!cancelled) setHydrated(true);
        return;
      }

      const local = await listScientificMetricsHistory(athlete.clientId);
      const merged = mergeScientificEntries(
        initialSnapshot ? [...local, initialSnapshot] : local,
      );

      if (isForjadorVipIndexedDbAvailable()) {
        for (const entry of merged) {
          await appendScientificMetricsEntry(entry);
        }
      }

      if (cancelled) return;
      setEntries(merged);
      setHydrated(true);
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setFeedback(null);
      setHydrated(false);
      void hydrate();
    });

    return () => {
      cancelled = true;
    };
  }, [athlete.clientId, canAccess, initialSnapshot]);

  const handleAddEntry = useCallback(
    async (entry: ScientificMetricsEntry) => {
      if (!canAccess) return;

      setSaving(true);
      setFeedback(null);
      try {
        if (isForjadorVipIndexedDbAvailable()) {
          await appendScientificMetricsEntry(entry);
        }
        setEntries((current) => mergeScientificEntries([entry, ...current]));
        setFeedback({ kind: "ok", message: "Medição salva localmente." });
      } catch {
        setFeedback({ kind: "error", message: "Falha ao salvar medição." });
      } finally {
        setSaving(false);
      }
    },
    [canAccess],
  );

  const handleSyncLatest = useCallback(async () => {
    if (!canAccess) return;

    const latest = resolveLatestScientificEntry(entries);
    if (!latest) {
      setFeedback({ kind: "error", message: "Sem medições para publicar." });
      return;
    }

    setSyncing(true);
    setFeedback(null);

    const result = await syncLatestScientificMetricsToNucleus(athlete, latest, {
      isSovereign,
    });
    setSyncing(false);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    const synced: ScientificMetricsEntry = {
      ...latest,
      syncedAt: new Date().toISOString(),
    };

    if (isForjadorVipIndexedDbAvailable()) {
      await appendScientificMetricsEntry(synced);
    }

    setEntries((current) =>
      mergeScientificEntries(current.map((row) => (row.id === synced.id ? synced : row))),
    );
    setFeedback({ kind: "ok", message: `Medição publicada para ${athlete.displayName}.` });
  }, [athlete, canAccess, entries, isSovereign]);

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!isSovereign || !canAccess) return;
      if (!window.confirm("Remover esta medição do histórico local?")) return;

      if (isForjadorVipIndexedDbAvailable()) {
        await deleteScientificMetricsEntry(entryId);
      }
      setEntries((current) => current.filter((row) => row.id !== entryId));
      setFeedback({ kind: "ok", message: "Medição removida." });
    },
    [canAccess, isSovereign],
  );

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">{FORJA_COPY.medidas.loadingHistory}</p>;
  }

  return (
    <>
      <ScientificMetricsTable
        athlete={athlete}
        entries={entries}
        onAddEntry={handleAddEntry}
        onSyncLatest={() => void handleSyncLatest()}
        onDeleteEntry={isSovereign ? (id) => void handleDeleteEntry(id) : undefined}
        saving={saving}
        syncing={syncing}
        feedback={feedback}
        allowDelete={isSovereign}
      />

      {isSovereign ? (
        <SovereignManagement
          athlete={athlete}
          onLocalHistoryCleared={() => setEntries([])}
          onRemoteSnapshotDeleted={() =>
            setEntries((current) => current.map((row) => ({ ...row, syncedAt: null })))
          }
        />
      ) : null}
    </>
  );
}

export function MedidasDetailClient({ operator, athlete, initialSnapshot }: MedidasDetailClientProps) {
  return (
    <ForjaWorkspaceFrame>
      <ForjaWorkspaceHeader
        chip={`VIP, ${resolveForjaRoleLabel(operator.role)}`}
        title={athlete.displayName}
        subtitle={
          <>
            {athlete.lineageName ? `${athlete.lineageName} · ` : null}
            Peso, dobras e composição corporal deste cliente VIP.
          </>
        }
      />

      <ForjaWorkspaceNav isSovereign={operator.isSovereign} activeHref="/forjador/medidas" />

      <div className="mt-6">
        <ForjaBackButton href="/forjador/medidas" />
      </div>

      <div className={`${FORJA_COMMAND_PANEL} mt-4`}>
        <ScientificMetricsWorkspace
          athlete={athlete}
          operatorId={operator.userId}
          isSovereign={operator.isSovereign}
          initialSnapshot={initialSnapshot}
        />
      </div>
    </ForjaWorkspaceFrame>
  );
}
