"use client";

import { useCallback, useEffect, useState } from "react";
import { SimpleWeeklyGrid } from "@/components/forjador/simple-weekly-grid";
import { ForjadorVipWorkspace } from "@/components/forjador/forjador-vip-workspace";
import { syncWeeklyDietToNucleus } from "@/lib/forja-diet-weekly-sync";
import type { ForjaBondedAthlete, ForjaDashboardPayload } from "@/lib/forja-dashboard";
import {
  createEmptyWeeklyDietDraft,
  parseWeeklyDietDays,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
import {
  appendWeeklyDietHistory,
  isForjadorVipIndexedDbAvailable,
  loadWeeklyDietDraft,
  saveWeeklyDietDraft,
} from "@/services/forjador-vip-indexeddb";

type DietaPageClientProps = {
  payload: ForjaDashboardPayload;
  initialByClient: Record<string, WeeklyDietDraft | null>;
  semanaRef: string;
};

function WeeklyDietEditor({
  athlete,
  semanaRef,
  initialDraft,
}: {
  athlete: ForjaBondedAthlete;
  semanaRef: string;
  initialDraft: WeeklyDietDraft | null;
}) {
  const [draft, setDraft] = useState<WeeklyDietDraft>(() =>
    initialDraft ?? createEmptyWeeklyDietDraft(athlete.clientId, athlete.forgerId, semanaRef),
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
          setDraft(createEmptyWeeklyDietDraft(athlete.clientId, athlete.forgerId, semanaRef));
        }
        if (!cancelled) setHydrated(true);
        return;
      }

      const local = await loadWeeklyDietDraft(athlete.clientId, semanaRef);
      if (cancelled) return;

      if (local) {
        setDraft(local);
        setHydrated(true);
        return;
      }

      if (initialDraft) {
        setDraft(initialDraft);
        await saveWeeklyDietDraft(initialDraft);
        if (!cancelled) setHydrated(true);
        return;
      }

      setDraft(createEmptyWeeklyDietDraft(athlete.clientId, athlete.forgerId, semanaRef));
      if (!cancelled) setHydrated(true);
    }

    void hydrateFromIndexedDb();
    setFeedback(null);
    setHydrated(false);

    return () => {
      cancelled = true;
    };
  }, [athlete.clientId, athlete.forgerId, initialDraft, semanaRef]);

  const persistLocal = useCallback(async (nextDraft: WeeklyDietDraft) => {
    if (!isForjadorVipIndexedDbAvailable()) return;
    await saveWeeklyDietDraft(nextDraft);
    await appendWeeklyDietHistory(nextDraft);
  }, []);

  const handleDraftChange = useCallback((nextDraft: WeeklyDietDraft) => {
    setDraft(nextDraft);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!hydrated || !isForjadorVipIndexedDbAvailable()) return;

    const timer = window.setTimeout(() => {
      void saveWeeklyDietDraft({
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        semanaRef,
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [athlete.clientId, athlete.forgerId, draft, hydrated, semanaRef]);

  const handleSaveLocal = useCallback(async () => {
    setSavingLocal(true);
    setFeedback(null);
    try {
      const stamped: WeeklyDietDraft = {
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        semanaRef,
        updatedAt: new Date().toISOString(),
      };
      setDraft(stamped);
      await persistLocal(stamped);
      setFeedback({ kind: "ok", message: "Rascunho guardado no dispositivo." });
    } catch {
      setFeedback({ kind: "error", message: "Falha ao guardar localmente." });
    } finally {
      setSavingLocal(false);
    }
  }, [athlete.clientId, athlete.forgerId, draft, persistLocal, semanaRef]);

  const handleSyncNucleus = useCallback(async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const stamped: WeeklyDietDraft = {
        ...draft,
        clientId: athlete.clientId,
        forgerId: athlete.forgerId,
        semanaRef,
        updatedAt: new Date().toISOString(),
      };

      const result = await syncWeeklyDietToNucleus(athlete, stamped);
      if (!result.ok) {
        setFeedback({ kind: "error", message: result.message });
        return;
      }

      const synced: WeeklyDietDraft = {
        ...stamped,
        syncedAt: new Date().toISOString(),
      };
      setDraft(synced);
      await persistLocal(synced);
      setFeedback({ kind: "ok", message: `Dieta publicada para ${athlete.displayName}.` });
    } catch {
      setFeedback({ kind: "error", message: "Falha ao publicar dieta." });
    } finally {
      setSyncing(false);
    }
  }, [athlete, draft, persistLocal, semanaRef]);

  return (
    <SimpleWeeklyGrid
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

export function DietaPageClient({ payload, initialByClient, semanaRef }: DietaPageClientProps) {
  return (
    <ForjadorVipWorkspace
      payload={payload}
      title="Dieta semanal VIP"
      description="Planeamento Seg–Dom para clientes VIP. Guarde no dispositivo e publique quando quiser."
      activeRoute="/forjador/dieta"
    >
      {({ athlete }) =>
        athlete ? (
          <WeeklyDietEditor
            athlete={athlete}
            semanaRef={semanaRef}
            initialDraft={initialByClient[athlete.clientId] ?? null}
          />
        ) : null
      }
    </ForjadorVipWorkspace>
  );
}

export function mapServerWeeklyDietRow(row: {
  client_id: string;
  forger_id: string;
  semana_ref: string;
  dias: unknown;
  atualizado_em: string;
}): WeeklyDietDraft {
  return {
    clientId: row.client_id,
    forgerId: row.forger_id,
    semanaRef: row.semana_ref,
    dias: parseWeeklyDietDays(row.dias),
    updatedAt: row.atualizado_em,
    syncedAt: row.atualizado_em,
  };
}
