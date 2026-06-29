"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_CHIP,
  COMUNIDADE_INNER_CARD,
} from "@/components/comunidade/comunidade-layout";
import {
  criarDuelo,
  fetchClientesDuelo,
  type ComunidadeDueloAtivo,
  type DueloClienteOption,
} from "@/lib/comunidade-data";
import { DASHBOARD_TAP_TARGET, EVOLUTION_ACTION_BUTTON } from "@/lib/dashboard-config";
import { notifyDueloArenaRefresh } from "@/lib/duelo-events";

const PAGE_SIZE = 10;

type DueloChallengePanelProps = {
  userId: string;
  onDueloCreated?: () => void;
};

export function DueloChallengePanel({ userId, onDueloCreated }: DueloChallengePanelProps) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<DueloClienteOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<ComunidadeDueloAtivo["tipo_confronto"]>("SUPERIORES");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    setClientesError(null);
    const result = await fetchClientesDuelo({
      search: debouncedSearch,
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    });
    setLoadingClientes(false);

    if (result.error) {
      setClientesError(result.error);
      setClientes([]);
      setTotal(0);
      return;
    }

    setClientes(result.data.clientes);
    setTotal(result.data.total);
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (!open) return;
    void loadClientes();
  }, [loadClientes, open]);

  useEffect(() => {
    if (!open) return;
    setPage(0);
  }, [debouncedSearch, open]);

  const resetForm = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
    setSelectedId(null);
    setTipo("SUPERIORES");
    setFeedback(null);
    setClientesError(null);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!selectedId || submitting) return;

    setSubmitting(true);
    setFeedback(null);

    const result = await criarDuelo(selectedId, tipo);
    setSubmitting(false);

    if (result.error) {
      setFeedback(result.error);
      return;
    }

    if (result.data?.status === "EM_ANDAMENTO") {
      setFeedback(
        "O duelo iniciou sem convite — aplique a migration 20260628140000 no Supabase para exigir aceite.",
      );
      return;
    }

    setPanelFeedback("Convite enviado. O atleta precisa aceitar antes do duelo começar.");
    closeModal();
    notifyDueloArenaRefresh();
    onDueloCreated?.();
  }, [closeModal, onDueloCreated, selectedId, submitting, tipo]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${EVOLUTION_ACTION_BUTTON} mt-4 w-full border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-100 hover:border-fuchsia-400/45`}
      >
        Desafiar atleta
      </button>

      {panelFeedback ? (
        <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-100">
          {panelFeedback}
        </p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Desafiar atleta para duelo"
        >
          <div className={`${COMUNIDADE_INNER_CARD} flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col border-fuchsia-500/25 bg-neutral-950 p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fuchsia-300/85">
                  Novo duelo
                </p>
                <h4 className="mt-1 text-base font-semibold text-fuchsia-50">Escolha quem desafiar</h4>
                <p className={`mt-1 ${COMUNIDADE_BODY_TEXT}`}>
                  Todos os clientes registrados (VIP e comum). O desafiado precisa aceitar antes do duelo
                  começar.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`${DASHBOARD_TAP_TARGET} shrink-0 rounded-full border border-neutral-700 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-400`}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["SUPERIORES", "INFERIORES"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTipo(option)}
                  className={`${COMUNIDADE_CHIP} ${
                    tipo === option
                      ? "border-fuchsia-400/40 bg-fuchsia-950/30 text-fuchsia-100"
                      : "border-neutral-800 text-neutral-400"
                  }`}
                >
                  {option === "SUPERIORES" ? "Superiores · 3 dias" : "Inferiores · 2 dias"}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                Buscar atleta
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou linhagem"
                className="mt-2 w-full rounded-xl border border-neutral-800 bg-black/50 px-3 py-2.5 text-sm text-amber-50 outline-none transition focus:border-fuchsia-500/35"
              />
            </label>

            <div className="mt-3 min-h-[14rem] flex-1 overflow-y-auto rounded-xl border border-neutral-800/80 bg-black/30">
              {loadingClientes ? (
                <p className="p-4 text-center text-[11px] text-neutral-500">Carregando clientes…</p>
              ) : clientesError ? (
                <p className="p-4 text-center text-[11px] leading-relaxed text-amber-300/90">{clientesError}</p>
              ) : clientes.length === 0 ? (
                <p className="p-4 text-center text-[11px] text-neutral-500">
                  Nenhum cliente encontrado. Verifique se a migration de duelos foi aplicada.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-900/80">
                  {clientes.map((cliente) => {
                    const selected = selectedId === cliente.id;
                    return (
                      <li key={cliente.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(cliente.id)}
                          disabled={cliente.id === userId}
                          className={`${DASHBOARD_TAP_TARGET} flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                            selected ? "bg-fuchsia-950/25 text-fuchsia-100" : "text-neutral-200 hover:bg-neutral-900/50"
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <span className="min-w-0 truncate text-sm font-medium">{cliente.nome}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {cliente.is_vip ? (
                              <span className={`${COMUNIDADE_CHIP} border-amber-500/25 text-amber-200/90`}>
                                VIP
                              </span>
                            ) : null}
                            {selected ? (
                              <span className={`${COMUNIDADE_CHIP} border-fuchsia-400/30 text-fuchsia-200`}>
                                Selecionado
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page <= 0 || loadingClientes}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className={`${DASHBOARD_TAP_TARGET} rounded-full border border-neutral-800 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400 disabled:opacity-40`}
              >
                Anterior
              </button>
              <p className="text-[10px] tabular-nums text-neutral-500">
                Página {page + 1} de {totalPages} · {total} clientes
              </p>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loadingClientes}
                onClick={() => setPage((value) => value + 1)}
                className={`${DASHBOARD_TAP_TARGET} rounded-full border border-neutral-800 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400 disabled:opacity-40`}
              >
                Próxima
              </button>
            </div>

            {feedback ? (
              <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100">
                {feedback}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!selectedId || submitting || loadingClientes}
              className={`${EVOLUTION_ACTION_BUTTON} mt-4 w-full border-fuchsia-500/35 bg-fuchsia-900/30 text-fuchsia-50 disabled:opacity-50`}
            >
              {submitting ? "Enviando desafio…" : "Enviar convite de duelo"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
