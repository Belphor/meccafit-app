"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchDueloConvitePendente,
  responderDuelo,
  type DueloConvitePendente,
} from "@/lib/comunidade-data";
import { notifyDueloArenaRefresh } from "@/lib/duelo-events";
import { DASHBOARD_TAP_TARGET, EVOLUTION_ACTION_BUTTON } from "@/lib/dashboard-config";

type DueloConviteHostProps = {
  userId: string;
  onResponded?: () => void;
};

function labelTipo(tipo: DueloConvitePendente["tipo_confronto"]): string {
  return tipo === "SUPERIORES" ? "Superiores (3 dias)" : "Inferiores (2 dias)";
}

export function DueloConviteHost({ userId, onResponded }: DueloConviteHostProps) {
  const [mounted, setMounted] = useState(false);
  const [convite, setConvite] = useState<DueloConvitePendente | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadConvite = useCallback(async () => {
    setLoading(true);
    const result = await fetchDueloConvitePendente();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setConvite(null);
      return;
    }
    setError(null);
    setConvite(result.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadConvite();
    });

    const interval = window.setInterval(() => {
      void loadConvite();
    }, 12_000);

    const onFocus = () => {
      void loadConvite();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadConvite, userId]);

  const handleResponse = useCallback(
    async (aceitar: boolean) => {
      if (!convite || submitting) return;
      setSubmitting(true);
      setError(null);
      const result = await responderDuelo(convite.id, aceitar);
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConvite(null);
      notifyDueloArenaRefresh();
      onResponded?.();
      void loadConvite();
    },
    [convite, loadConvite, onResponded, submitting],
  );

  if (loading || !convite) {
    if (error && !convite) {
      return (
        <p className="sr-only" role="status">
          {error}
        </p>
      );
    }
    return null;
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center bg-black/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duelo-convite-title"
      aria-describedby="duelo-convite-desc"
    >
      <div className="w-full max-w-md rounded-2xl border border-fuchsia-500/35 bg-neutral-950 p-5 shadow-[0_0_40px_rgba(217,70,239,0.25)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-300/90">
          Convite de duelo
        </p>
        <h2 id="duelo-convite-title" className="mt-2 text-lg font-semibold text-fuchsia-50">
          {convite.desafiante_nome} desafiou você
        </h2>
        <p id="duelo-convite-desc" className="mt-2 text-sm leading-relaxed text-neutral-300">
          Faixa: {labelTipo(convite.tipo_confronto)}. Aceite para iniciar a contagem de pontos ou
          recuse para encerrar o convite. Esta decisão é obrigatória.
        </p>

        {error ? (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleResponse(false)}
            className={`${DASHBOARD_TAP_TARGET} rounded-full border border-neutral-700 bg-black/50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-200 disabled:opacity-50`}
          >
            Recusar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleResponse(true)}
            className={`${EVOLUTION_ACTION_BUTTON} border-fuchsia-500/40 bg-fuchsia-900/35 text-fuchsia-50 disabled:opacity-50`}
          >
            {submitting ? "Registrando…" : "Aceitar duelo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
