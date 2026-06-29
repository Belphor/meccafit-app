"use client";

import { useCallback, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_TAP_TARGET,
} from "@/lib/dashboard-config";
import { clientSubmitFeedback } from "@/lib/academia-actions";
import { COMPANY_NAME, SUPORTE_INTRO } from "@/lib/client-lore-copy";

const FEEDBACK_CATEGORIES = [
  { value: "geral", label: "Geral" },
  { value: "treino", label: "Treino" },
  { value: "evolucao", label: "Evolução" },
  { value: "comunidade", label: "Comunidade" },
  { value: "bug", label: "Problema técnico" },
] as const;

export function SupportFeedbackPanel() {
  const [categoria, setCategoria] = useState<string>("geral");
  const [mensagem, setMensagem] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = mensagem.trim();
    if (trimmed.length < 4) {
      setPhase("error");
      setFeedback("Escreva pelo menos 4 caracteres.");
      return;
    }

    setPhase("sending");
    setFeedback(null);

    const result = await clientSubmitFeedback(categoria, trimmed);

    if (!result.ok) {
      setPhase("error");
      setFeedback(result.message);
      return;
    }

    setMensagem("");
    setPhase("success");
    setFeedback("Mensagem enviada. Obrigado pelo feedback.");
  }, [categoria, mensagem]);

  return (
    <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
      <DashboardPanelHeader chip="Suporte" meta="Perfil · feedback" />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-4 p-4`}>
        <p className="mt-2 text-sm text-neutral-400">{SUPORTE_INTRO(COMPANY_NAME)}</p>

        <div>
          <label htmlFor="feedback-categoria" className="text-xs font-medium text-neutral-400">
            Categoria
          </label>
          <select
            id="feedback-categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-orange-500/15 bg-black/50 px-3 py-2.5 text-sm text-amber-50"
            disabled={phase === "sending"}
          >
            {FEEDBACK_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="feedback-mensagem" className="text-xs font-medium text-neutral-400">
            Mensagem
          </label>
          <textarea
            id="feedback-mensagem"
            value={mensagem}
            onChange={(event) => setMensagem(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Descreva sua dúvida, sugestão ou problema..."
            className="mt-1.5 w-full resize-y rounded-xl border border-orange-500/15 bg-black/50 px-3 py-2.5 text-sm text-amber-50 placeholder:text-neutral-600"
            disabled={phase === "sending"}
          />
        </div>

        {feedback ? (
          <p
            className={`text-[11px] ${phase === "error" ? "text-red-400/90" : "text-emerald-300/90"}`}
            role={phase === "error" ? "alert" : "status"}
          >
            {feedback}
          </p>
        ) : null}

        <button
          type="button"
          disabled={phase === "sending"}
          onClick={() => void handleSubmit()}
          className={`${DASHBOARD_TAP_TARGET} w-full rounded-full border border-orange-500/25 bg-neutral-950/75 px-5 py-2.5 text-xs font-semibold text-amber-100 disabled:opacity-50 sm:w-auto`}
        >
          {phase === "sending" ? "Enviando…" : "Enviar feedback"}
        </button>
      </div>
    </BrasaVivaCard>
  );
}
