"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBrasiliaDateParts,
  resolveBrasiliaTrainingWeekdayIndex,
} from "@/lib/brasilia-time";
import { resolveTreinoDayKey } from "@/lib/treino-day-key";
import type { WeekdayIndex } from "@/lib/training-week";

export type BrasiliaClockState = {
  /** YYYY-MM-DD civil em Brasília (fonte: servidor, com fallback local). */
  dayKey: string;
  /** Segunda=1 … Sábado=6 */
  weekdayIndex: WeekdayIndex;
  /** Instant ISO do servidor (ou local no fallback). */
  iso: string;
  /** true quando a leitura veio do endpoint autoritativo. */
  isAuthoritative: boolean;
  /** true enquanto a primeira leitura do servidor não chegou. */
  isLoading: boolean;
};

function readLocalFallback(): Omit<BrasiliaClockState, "isLoading"> {
  const now = new Date();
  return {
    dayKey: resolveTreinoDayKey(now),
    weekdayIndex: resolveBrasiliaTrainingWeekdayIndex(now),
    iso: now.toISOString(),
    isAuthoritative: false,
  };
}

type ClockPayload = {
  dayKey?: unknown;
  weekdayIndex?: unknown;
  iso?: unknown;
};

function parseClockPayload(raw: ClockPayload): Omit<BrasiliaClockState, "isLoading"> | null {
  const dayKey = typeof raw.dayKey === "string" ? raw.dayKey.trim() : "";
  const weekday = Number(raw.weekdayIndex);
  const iso = typeof raw.iso === "string" ? raw.iso.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 6) return null;
  if (!iso || Number.isNaN(new Date(iso).getTime())) return null;

  return {
    dayKey,
    weekdayIndex: weekday as WeekdayIndex,
    iso,
    isAuthoritative: true,
  };
}

const REFRESH_MS = 60_000;

/**
 * Calendário e horário de Brasília a partir do servidor.
 * Impede burlar o dia do VTC só mudando a data do celular.
 */
export function useBrasiliaClock(): BrasiliaClockState {
  const [state, setState] = useState<BrasiliaClockState>(() => ({
    ...readLocalFallback(),
    isLoading: true,
  }));

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/brasilia-clock", {
        method: "GET",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("clock_http");
      const json = (await response.json()) as ClockPayload;
      const parsed = parseClockPayload(json);
      if (!parsed) throw new Error("clock_parse");
      setState({ ...parsed, isLoading: false });
    } catch {
      if (signal?.aborted) return;
      setState((prev) => ({
        ...readLocalFallback(),
        isLoading: false,
        // Mantém autoridade se já tínhamos uma leitura boa.
        isAuthoritative: prev.isAuthoritative,
        dayKey: prev.isAuthoritative ? prev.dayKey : resolveTreinoDayKey(),
        weekdayIndex: prev.isAuthoritative
          ? prev.weekdayIndex
          : resolveBrasiliaTrainingWeekdayIndex(),
        iso: prev.isAuthoritative ? prev.iso : new Date().toISOString(),
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // refresh() só altera estado após o fetch assíncrono (nunca síncrono no corpo do efeito).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal);

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  return state;
}

/** Converte o instant do relógio autoritativo em partes de Brasília (debug/UI). */
export function formatBrasiliaClockLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = getBrasiliaDateParts(date);
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}
