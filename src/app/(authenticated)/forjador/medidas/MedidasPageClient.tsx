"use client";

import { useCallback, useEffect, useState } from "react";
import { BodyMetricsForm } from "@/components/forjador/body-metrics-form";
import { ForjadorVipWorkspace } from "@/components/forjador/forjador-vip-workspace";
import { syncBodyMetricsToNucleus } from "@/lib/forja-body-metrics-sync";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import {
  createEmptyBodyMetricsDraft,
  parseBodyCircumferences,
  type BodyMetricsDraft,
} from "@/lib/forjador-vip-types";
import {
  appendBodyMetricsHistory,
  isForjadorVipIndexedDbAvailable,
  loadBodyMetricsDraft,
  saveBodyMetricsDraft,
} from "@/services/forjador-vip-indexeddb";

type MedidasPageClientProps = {
  payload: ForjaDashboardPayload;
  initialByClient: Record<string, BodyMetricsDraft | null>;
};

function BodyMetricsEditor({
  athlete,
  initialDraft,
}: {
  athlete: ForjaBondedAthlete;
  initialDraft: BodyMetricsDraft | null;
}) {
  const [draft, setDraft] = useState<BodyMetricsDraft>(() =>
    initialDraft ?? createEmptyBodyMetricsDraft(athlete.clientId, athlete.forgerId),
  );
  const [hydrated, setHydrated] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromIndexedDb() {
      if (!isForjadorVipIndexedDbAvailable()) {
        if (initialDraft) {
          setDraft(initialDraft);
        } else {
          setDraft(createEmptyBodyMetricsDraft(athlete.clientId, athlete.forgerId));
        }
        if (!cancelled) setHydrated(true);
        return;
      }

      const local = await loadBodyMetricsDraft(athlete.clientId);
      if (cancelled) return;

      if (local) {
        setDraft(local);
        setHydrated(true);
        return;
      }

      if (initialDraft) {
        setDraft(initialDraft);
        await saveBodyMetricsDraft(initialDraft);
        if (!cancelled) setHydrated(true);
        return;
      }

      setDraft(createEmptyBodyMetricsDraft(athlete.clientId, athlete.forgerId));
      if (!cancelled) setHydrated(true);
    }

    void hydrateFromIndexedDb();
    setFeedback(null);
    setHydrated(false);

    return () => {
      cancelled = true;
    };
  }, [athlete.clientId, athlete.forgerId, initialDraft]);

  const persistLocal = useCallback(async (nextDraft: BodyMetricsDraft) => {
    if (!isForjadorVipIndexedDbAvailable()) {
      return;
    }
    await saveBodyMetricsDraft(nextDraft);
    await appendBodyMetricsHistory(nextDraft);
  }, []);

  const handleDraftChange = useCallback((nextDraft: BodyMetricsDraft) => {
    setDraft(nextDraft);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!hydrated || !isForjadorVipIndexedDbAvailable()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveBodyMetricsDraft({
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [athlete.clientId, athlete.forgerId, draft, hydrated]);

  const handleSaveLocal = useCallback(async () => {
    setSavingLocal(true);
    setFeedback(null);
    try {
      const stamped: BodyMetricsDraft = {
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        updatedAt: new Date().toISOString(),
      };
      setDraft(stamped);
      await persistLocal(stamped);
      setFeedback({ kind: "ok", message: "Medidas guardadas localmente (IndexedDB)." });
    } catch {
      setFeedback({ kind: "error", message: "Falha ao guardar no dispositivo." });
    } finally {
      setSavingLocal(false);
    }
  }, [athlete.clientId, athlete.forgerId, draft, persistLocal]);

  const handleSyncNucleus = useCallback(async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const stamped: BodyMetricsDraft = {
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        updatedAt: new Date().toISOString(),
      };

      const result = await syncBodyMetricsToNucleus(athlete, stamped);
      if (!result.ok) {
        setFeedback({ kind: "error", message: result.message });
        return;
      }

      const synced: BodyMetricsDraft = {
        ...stamped,
        syncedAt: new Date().toISOString(),
      };
      setDraft(synced);
      await persistLocal(synced);
      setFeedback({
        kind: "ok",
        message: `Medidas publicadas para ${athlete.displayName}.`,
      });
    } catch {
      setFeedback({ kind: "error", message: "Falha ao sincronizar com o núcleo." });
    } finally {
      setSyncing(false);
    }
  }, [athlete, draft, persistLocal]);

  return (
    <BodyMetricsForm
      draft={draft}
      onDraftChange={handleDraftChange}
      onSaveLocal={() => void handleSaveLocal()}
      onSyncNucleus={() => void handleSyncNucleus()}
      savingLocal={savingLocal}
      syncing={syncing}
      feedback={feedback}
    />
  );
}

export function MedidasPageClient({ payload, initialByClient }: MedidasPageClientProps) {
  return (
    <ForjadorVipWorkspace
      payload={payload}
      title="Medidas VIP"
      description="Registe peso, altura e perímetros com rascunho offline. Publique no núcleo apenas quando confirmar."
      activeRoute="/forjador/medidas"
    >
      {({ athlete }) =>
        athlete ? (
          <BodyMetricsEditor
            athlete={athlete}
            initialDraft={initialByClient[athlete.clientId] ?? null}
          />
        ) : null
      }
    </ForjadorVipWorkspace>
  );
}

export function mapServerBodyMetricsRow(row: {
  client_id: string;
  forger_id: string;
  peso_kg: number;
  altura_cm: number;
  perimetros: unknown;
  medido_em: string;
  atualizado_em: string;
}): BodyMetricsDraft {
  const perimetros = parseBodyCircumferences(row.perimetros);
  return {
    clientId: row.client_id,
    forgerId: row.forger_id,
    pesoKg: String(row.peso_kg),
    alturaCm: String(row.altura_cm),
    perimetros,
    medidoEm: row.medido_em,
    updatedAt: row.atualizado_em,
    syncedAt: row.atualizado_em,
  };
}
