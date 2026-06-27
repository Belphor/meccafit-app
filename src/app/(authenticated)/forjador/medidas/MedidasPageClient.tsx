"use client";

import { useCallback, useEffect, useState } from "react";
import { ForjadorVipWorkspace } from "@/components/forjador/forjador-vip-workspace";
import { ScientificMetricsTable } from "@/components/forjador/scientific-metrics-table";
import { SovereignManagement } from "@/components/forjador/sovereign-management";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { syncLatestScientificMetricsToNucleus } from "@/lib/forja-scientific-metrics-sync";
import { canOperatorAccessMedidasAthlete } from "@/lib/medidas-access";
import { FORJA_COPY } from "@/lib/forja-copy";
import {
  parseScientificFromServerRow,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";
import {
  appendScientificMetricsEntry,
  deleteScientificMetricsEntry,
  isForjadorVipIndexedDbAvailable,
  listScientificMetricsHistory,
  resolveLatestScientificEntry,
} from "@/services/forjador-vip-indexeddb";

type MedidasPageClientProps = {
  payload: ForjaDashboardPayload;
  initialSnapshotByClient: Record<string, ScientificMetricsEntry | null>;
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
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(
    null,
  );

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

      if (initialSnapshot && !local.some((row) => row.id === initialSnapshot.id)) {
        await appendScientificMetricsEntry(initialSnapshot);
        local.unshift(initialSnapshot);
      }

      if (cancelled) return;
      setEntries(local);
      setHydrated(true);
    }

    void hydrate();
    setFeedback(null);
    setHydrated(false);

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
        setEntries((current) => [entry, ...current]);
        setFeedback({ kind: "ok", message: "Medição guardada localmente." });
      } catch {
        setFeedback({ kind: "error", message: "Falha ao guardar medição." });
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

    const result = await syncLatestScientificMetricsToNucleus(athlete, latest);
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

    setEntries((current) => current.map((row) => (row.id === synced.id ? synced : row)));
    setFeedback({ kind: "ok", message: `Medição publicada para ${athlete.displayName}.` });
  }, [athlete, canAccess, entries]);

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
    return <p className="text-sm text-zinc-500">A carregar histórico…</p>;
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

export function MedidasPageClient({ payload, initialSnapshotByClient }: MedidasPageClientProps) {
  return (
    <ForjadorVipWorkspace
      payload={payload}
      title="Medidas VIP"
      description={FORJA_COPY.medidas.description}
      activeRoute="/forjador/medidas"
    >
      {({ athlete }) =>
        athlete ? (
          <ScientificMetricsWorkspace
            athlete={athlete}
            operatorId={payload.operator.userId}
            isSovereign={payload.operator.isSovereign}
            initialSnapshot={initialSnapshotByClient[athlete.clientId] ?? null}
          />
        ) : null
      }
    </ForjadorVipWorkspace>
  );
}

export function mapServerScientificSnapshot(row: {
  client_id: string;
  forger_id: string;
  peso_kg: number;
  altura_cm: number;
  perimetros: unknown;
  medido_em: string;
  atualizado_em: string;
}): ScientificMetricsEntry {
  const parsed = parseScientificFromServerRow(row);
  return {
    id: `server-${row.client_id}-${row.medido_em}`,
    clientId: row.client_id,
    forgerId: row.forger_id,
    savedAt: row.atualizado_em,
    syncedAt: row.atualizado_em,
    ...parsed,
  };
}
