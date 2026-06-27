"use client";

import { useCallback, useState } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_DANGER_BUTTON,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { deleteScientificMetricsSnapshot } from "@/lib/forja-scientific-metrics-sync";
import {
  sovereignDeactivateAccount,
  sovereignPurifyToAshes,
  sovereignReactivateAccount,
} from "@/lib/forja-sovereign-actions";
import { clearScientificMetricsHistory } from "@/services/forjador-vip-indexeddb";

type SovereignManagementProps = {
  athlete: ForjaBondedAthlete | null;
  onLocalHistoryCleared: () => void;
  onRemoteSnapshotDeleted: () => void;
};

type ActionPhase = "idle" | "acting";

export function SovereignManagement({
  athlete,
  onLocalHistoryCleared,
  onRemoteSnapshotDeleted,
}: SovereignManagementProps) {
  const [phase, setPhase] = useState<ActionPhase>("idle");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(
    null,
  );

  const runAction = useCallback(
    async (label: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
      if (!athlete) return;

      setPhase("acting");
      setFeedback(null);

      const result = await action();
      setPhase("idle");

      if (!result.ok) {
        setFeedback({ kind: "error", message: result.message ?? `Falha: ${label}.` });
        return;
      }

      setFeedback({ kind: "ok", message: `${label} concluído para ${athlete.displayName}.` });
    },
    [athlete],
  );

  const handleClearLocal = useCallback(async () => {
    if (!athlete) return;
    if (!window.confirm(`Limpar todo o histórico local de ${athlete.displayName}?`)) return;

    setPhase("acting");
    setFeedback(null);
    try {
      await clearScientificMetricsHistory(athlete.clientId);
      onLocalHistoryCleared();
      setFeedback({ kind: "ok", message: "Histórico local eliminado (IndexedDB)." });
    } catch {
      setFeedback({ kind: "error", message: "Falha ao limpar histórico local." });
    } finally {
      setPhase("idle");
    }
  }, [athlete, onLocalHistoryCleared]);

  const handleDeleteRemoteSnapshot = useCallback(async () => {
    if (!athlete) return;
    if (!window.confirm(`Eliminar snapshot remoto activo de ${athlete.displayName}?`)) return;

    setPhase("acting");
    setFeedback(null);

    const result = await deleteScientificMetricsSnapshot(athlete.clientId);
    setPhase("idle");

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    onRemoteSnapshotDeleted();
    setFeedback({ kind: "ok", message: "Snapshot remoto eliminado do núcleo." });
  }, [athlete, onRemoteSnapshotDeleted]);

  if (!athlete) {
    return null;
  }

  const isBusy = phase === "acting";

  return (
    <section aria-label="Gestão soberana" className={`${FORJA_COMMAND_INNER} mt-8 border-t border-red-950/40 pt-6`}>
      <p className={FORJA_SECTION_CHIP}>Forjador Soberano</p>
      <h2 className={`${FORJA_SECTION_TITLE} text-red-200/90`}>Gestão total de contas</h2>
      <p className={`${FORJA_META} mt-1`}>
        Privilégios irreversíveis sobre atletas e dados VIP. Operações registadas no audit log ARGOS.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleClearLocal()}
          className={`${FORJA_GHOST_BUTTON} min-h-11 w-full`}
        >
          Limpar histórico local (IndexedDB)
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleDeleteRemoteSnapshot()}
          className={`${FORJA_GHOST_BUTTON} min-h-11 w-full text-amber-200/90`}
        >
          Eliminar snapshot remoto
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void runAction("Reset mensal (Cinzas)", async () => {
              const result = await sovereignPurifyToAshes(athlete.clientId);
              return result.ok
                ? { ok: true }
                : { ok: false, message: result.message };
            })
          }
          className={`${FORJA_DANGER_BUTTON} min-h-11 w-full`}
        >
          Reset mensal · Cinzas
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (!window.confirm(`Suspender acesso de ${athlete.displayName}?`)) return;
            void runAction("Suspensão de conta", async () => {
              const result = await sovereignDeactivateAccount(athlete.clientId, "Soberano · medidas VIP");
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            });
          }}
          className={`${FORJA_DANGER_BUTTON} min-h-11 w-full`}
        >
          Suspender conta
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void runAction("Reactivação de conta", async () => {
              const result = await sovereignReactivateAccount(athlete.clientId);
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            })
          }
          className={`${FORJA_PRIMARY_BUTTON} min-h-11 w-full sm:col-span-2`}
        >
          Reactivar conta
        </button>
      </div>

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={feedback.kind === "ok" ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
