import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import {
  buildLinhagemInactivityAlertMessage,
  LINHAGEM_INACTIVITY_DAYS,
  type LinhagemInactivitySyncResult,
} from "@/lib/linhagem-inactivity";

export const LINHAGEM_INACTIVITY_QA_EVENT = "meccafit:qa-linhagem-inactivity";

export type LinhagemInactivityQaDetail = {
  result: LinhagemInactivitySyncResult;
};

export type LinhagemInactivityQaPreset = {
  id: string;
  label: string;
  hint: string;
  howTo: string;
  result: LinhagemInactivitySyncResult;
};

export const LINHAGEM_INACTIVITY_QA_PRESETS: ReadonlyArray<LinhagemInactivityQaPreset> = [
  {
    id: "return-after-30d",
    label: "Volta após 30 dias",
    hint: "Anuncia a degradação por 8 segundos e depois ativa o aviso persistente. Labareda cai para Brasa.",
    howTo:
      "Dispare em qualquer aba. Após 8 segundos o aviso pendente permanece até concluir uma série no Treino.",
    result: {
      degraded: true,
      phase_tier: 3,
      previous_tier: 4,
      phases_lost: 1,
      days_absent: LINHAGEM_INACTIVITY_DAYS + 5,
      pending_rekindle: true,
      restore_tier: 4,
    },
  },
  {
    id: "pending-alert-only",
    label: "Aviso pendente de dispensa",
    hint: "Simula quem já foi rebaixado e ainda não concluiu uma série.",
    howTo:
      "Dispara direto o aviso persistente. Conclua uma série no Treino para reacender a chama.",
    result: {
      degraded: false,
      phase_tier: 3,
      previous_tier: 4,
      phases_lost: 1,
      days_absent: null,
      pending_rekindle: true,
      restore_tier: 4,
    },
  },
];

export function dispatchLinhagemInactivityQa(detail: LinhagemInactivityQaDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LinhagemInactivityQaDetail>(LINHAGEM_INACTIVITY_QA_EVENT, { detail }),
  );
}

export function applyLinhagemInactivityQaPreset(presetId: string): LinhagemInactivitySyncResult | null {
  const preset = LINHAGEM_INACTIVITY_QA_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  dispatchLinhagemInactivityQa({ result: preset.result });
  return preset.result;
}

export function describeLinhagemInactivityQaResult(result: LinhagemInactivitySyncResult): string {
  if (result.pending_rekindle) {
    const current = PHASE_TIER_LABELS[result.phase_tier];
    return `Aviso persistente em ${current}. Conclua uma série no Treino para reacender a chama.`;
  }
  const message = buildLinhagemInactivityAlertMessage(result);
  if (message) return message.slice(0, 140) + (message.length > 140 ? "…" : "");
  return `Fase ${PHASE_TIER_LABELS[result.phase_tier]}, sem regressão simulada.`;
}
