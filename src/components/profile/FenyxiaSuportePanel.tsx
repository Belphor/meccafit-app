"use client";

import { useCallback, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_TAP_TARGET,
} from "@/lib/dashboard-config";
import {
  FENYXIA_SUPORTE_BADGE,
  FENYXIA_SUPORTE_CHIP,
  FENYXIA_SUPORTE_META,
} from "@/lib/client-lore-copy";
import {
  buildFeedbackWhatsAppMessage,
  buildFenyxiaWhatsAppUrl,
  FENYXIA_CEO,
} from "@/lib/fenyxia-contact";
import { LoreEm } from "@/lib/lore-emphasis";

const FEEDBACK_CATEGORIES = [
  { value: "geral", label: "Geral" },
  { value: "treino", label: "Treino" },
  { value: "evolucao", label: "Evolução" },
  { value: "comunidade", label: "Comunidade" },
  { value: "bug", label: "Problema técnico" },
] as const;

/** Fenyxia Suporte · feedback via WhatsApp (Perfil). */
export function FenyxiaSuportePanel() {
  const [categoria, setCategoria] = useState<string>("geral");
  const [mensagem, setMensagem] = useState("");
  const [phase, setPhase] = useState<"idle" | "opening" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmitFeedback = useCallback(() => {
    const trimmed = mensagem.trim();
    if (trimmed.length < 4) {
      setPhase("error");
      setFeedback("Escreva pelo menos 4 caracteres.");
      return;
    }

    setPhase("opening");
    setFeedback(null);

    const url = buildFenyxiaWhatsAppUrl(buildFeedbackWhatsAppMessage(categoria, trimmed));
    window.open(url, "_blank", "noopener,noreferrer");

    setMensagem("");
    setPhase("success");
    setFeedback(
      "WhatsApp aberto. Confirme o envio na conversa para registrar seu pedido no Fenyxia Suporte.",
    );
  }, [categoria, mensagem]);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      data-tour-target="fenyxia-suporte"
      className={`${DASHBOARD_PANEL_FRAME} border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/35 via-black/85 to-black/90 shadow-[0_0_40px_rgba(16,185,129,0.16)]`}
      aria-labelledby="fenyxia-suporte-title"
    >
      <DashboardPanelHeader chip={FENYXIA_SUPORTE_CHIP} meta={FENYXIA_SUPORTE_META} />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-5 p-4 sm:p-5`}>
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-emerald-400/45 bg-emerald-950/55 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
            {FENYXIA_SUPORTE_BADGE}
          </span>

          <h2 id="fenyxia-suporte-title" className={DASHBOARD_SECTION_TITLE}>
            {FENYXIA_SUPORTE_CHIP}
          </h2>

          <p className="text-sm leading-relaxed text-neutral-300">
            Este é o <LoreEm>canal de suporte</LoreEm> da Fenyxia no altar. Envie dúvidas,
            sugestões, problemas técnicos ou pedidos de manutenção pelo <LoreEm>WhatsApp</LoreEm>. A
            equipe verifica e responde o que for necessário.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/45 via-black/50 to-black/65 px-4 py-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/85">
            Atendimento Fenyxia
          </p>
          <p className="mt-3 text-xl font-bold text-amber-50 sm:text-2xl">{FENYXIA_CEO.name}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-200/90">{FENYXIA_CEO.role}</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
            Como enviar
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Escolha a <LoreEm>categoria</LoreEm>, descreva o que precisa e toque em{" "}
            <LoreEm>Enviar pelo WhatsApp</LoreEm>. O aplicativo abre a conversa com a mensagem pronta
            para você confirmar. Seu pedido chega ao <LoreEm>Fenyxia Suporte</LoreEm>.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="fenyxia-suporte-categoria" className="text-xs font-medium text-neutral-400">
                Categoria
              </label>
              <select
                id="fenyxia-suporte-categoria"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-emerald-500/20 bg-black/55 px-3 py-2.5 text-sm text-amber-50"
                disabled={phase === "opening"}
              >
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fenyxia-suporte-mensagem" className="text-xs font-medium text-neutral-400">
                Mensagem
              </label>
              <textarea
                id="fenyxia-suporte-mensagem"
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Descreva sua dúvida, sugestão ou problema..."
                className="mt-1.5 w-full resize-y rounded-xl border border-emerald-500/20 bg-black/55 px-3 py-2.5 text-sm text-amber-50 placeholder:text-neutral-600"
                disabled={phase === "opening"}
              />
            </div>

            {feedback ? (
              <p
                className={`text-[11px] leading-relaxed ${phase === "error" ? "text-red-400/90" : "text-emerald-300/90"}`}
                role={phase === "error" ? "alert" : "status"}
              >
                {feedback}
              </p>
            ) : null}

            <button
              type="button"
              disabled={phase === "opening"}
              onClick={handleSubmitFeedback}
              className={`${DASHBOARD_TAP_TARGET} w-full rounded-full border border-emerald-400/45 bg-gradient-to-r from-emerald-900/80 to-emerald-950/90 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.18)] transition hover:border-emerald-300/55 hover:from-emerald-800/80 hover:to-emerald-900/90 disabled:opacity-50`}
            >
              {phase === "opening" ? "Abrindo WhatsApp…" : "Enviar pelo WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </BrasaVivaCard>
  );
}

/** @deprecated Use FenyxiaSuportePanel */
export const SupportFeedbackPanel = FenyxiaSuportePanel;
