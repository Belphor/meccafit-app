"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
  FORJA_TABLE_COMUM_BADGE,
  FORJA_TABLE_VIP_BADGE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import { fetchForjaVtcFeed } from "@/lib/forja-sovereign-actions";
import { resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";
import {
  hasPhaseTierMismatch,
  phaseTierLabel,
  resolveEffectivePhaseTier,
} from "@/lib/phase-vtc";
import { resolveFeedAlertLabel } from "@/lib/forja-monitor-utils";

const PAGE_SIZE = 10;
const FEED_LIMIT = 256;

export type ClientAlertSeverity = "warn" | "critical";

type ForjaVtcFeedPanelProps = {
  onSelectClient?: (clientId: string) => void;
  selectedClientId?: string | null;
  refreshVersion?: number;
  onFeedLoaded?: (entries: ForjaVtcFeedEntry[]) => void;
  vipBondByClientId?: Record<string, boolean>;
  clientAlertSeverity?: Record<string, ClientAlertSeverity>;
};

function formatVtc(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${Math.round(value)} kg`;
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function resolveRowAlertClass(
  severity: ClientAlertSeverity | null,
  isSelected: boolean,
): string {
  if (severity === "critical") return "bg-red-950/25 ring-1 ring-inset ring-red-900/40";
  if (severity === "warn") return "bg-amber-950/20 ring-1 ring-inset ring-amber-900/35";
  if (isSelected) return "bg-zinc-800/40";
  return "";
}

function ForjaVtcFeedPanelComponent({
  onSelectClient,
  selectedClientId,
  refreshVersion = 0,
  onFeedLoaded,
  vipBondByClientId = {},
  clientAlertSeverity = {},
}: ForjaVtcFeedPanelProps) {
  const [entries, setEntries] = useState<ForjaVtcFeedEntry[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadFeed = useCallback(async () => {
    setPhase("loading");
    setFeedback(null);

    const result = await fetchForjaVtcFeed(FEED_LIMIT);

    if (!result.ok) {
      setPhase("error");
      setFeedback(result.message);
      setEntries([]);
      onFeedLoaded?.([]);
      return;
    }

    setEntries(result.entries);
    onFeedLoaded?.(result.entries);
    setPhase("idle");
  }, [onFeedLoaded]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed, refreshVersion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredEntries = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    if (!query) return entries;
    return entries.filter((entry) => normalizeSearch(entry.displayName).includes(query));
  }, [entries, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, safePage]);

  const isBusy = phase === "loading";

  return (
    <section aria-label={FORJA_COPY.monitor.vtcFeedTitle}>
      <div className={FORJA_COMMAND_INNER}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.vtcFeedTitle}</p>
            <h2 className={`${FORJA_SECTION_TITLE} mt-1 text-lg sm:text-xl`}>
              {FORJA_COPY.monitor.vtcFeedSubtitle}
            </h2>
            <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.monitor.vtcFeedHint}</p>
          </div>
          <button
            type="button"
            className={FORJA_GHOST_BUTTON}
            disabled={isBusy}
            onClick={() => void loadFeed()}
          >
            {FORJA_COPY.monitor.refresh}
          </button>
        </header>

        <div className="mt-4">
          <label htmlFor="forja-vtc-feed-search" className={FORJA_LABEL}>
            {FORJA_COPY.monitor.vtcFeedSearch}
          </label>
          <input
            id="forja-vtc-feed-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={FORJA_COPY.searchPlaceholder}
            className={FORJA_INPUT}
            autoComplete="off"
          />
        </div>

        {entries.length === 0 ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center`}>
            {isBusy ? FORJA_COPY.monitor.loading : FORJA_COPY.monitor.vtcFeedEmpty}
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center`}>
            {FORJA_COPY.searchEmpty}
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    <th className="px-2 py-2 font-semibold">{FORJA_COPY.monitor.vtcColClient}</th>
                    <th className="px-2 py-2 font-semibold">{FORJA_COPY.monitor.vtcColType}</th>
                    <th className="px-2 py-2 font-semibold">{FORJA_COPY.monitor.vtcColForjador}</th>
                    <th className="px-2 py-2 font-semibold text-right">{FORJA_COPY.monitor.vtcColToday}</th>
                    <th className="px-2 py-2 font-semibold text-right">{FORJA_COPY.monitor.vtcColAvg7d}</th>
                    <th className="px-2 py-2 font-semibold text-right">{FORJA_COPY.monitor.vtcCol30d}</th>
                    <th className="px-2 py-2 font-semibold">{FORJA_COPY.monitor.vtcColPhase}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((entry) => {
                    const effectiveTier = resolveEffectivePhaseTier(entry.phaseTier, entry.vtc30d);
                    const thermal = resolveForjaThermalStyle(effectiveTier);
                    const mismatch = hasPhaseTierMismatch(entry.phaseTier, entry.vtc30d);
                    const isSelected = selectedClientId === entry.clientId;
                    const isVip = entry.hasVipBond ?? vipBondByClientId[entry.clientId] ?? false;
                    const alertSeverity =
                      clientAlertSeverity[entry.clientId] ??
                      (mismatch ? ("warn" as const) : entry.alertSpike ? ("warn" as const) : null);
                    const alertLabel = resolveFeedAlertLabel(alertSeverity, {
                      mismatch,
                      spike: entry.alertSpike,
                    });

                    return (
                      <tr
                        key={entry.clientId}
                        className={[
                          "border-b border-zinc-900/80 transition-colors",
                          resolveRowAlertClass(alertSeverity, isSelected),
                          !alertSeverity && !isSelected ? "hover:bg-zinc-900/40" : "",
                          onSelectClient ? "cursor-pointer" : "",
                        ].join(" ")}
                        onClick={onSelectClient ? () => onSelectClient(entry.clientId) : undefined}
                        onKeyDown={
                          onSelectClient
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onSelectClient(entry.clientId);
                                }
                              }
                            : undefined
                        }
                        tabIndex={onSelectClient ? 0 : undefined}
                        role={onSelectClient ? "button" : undefined}
                        aria-label={`Ver detalhes de ${entry.displayName}`}
                        aria-current={isSelected ? "true" : undefined}
                      >
                        <td className="px-2 py-2.5">
                          <p className="font-medium text-zinc-100">{entry.displayName}</p>
                          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                            {alertLabel ? (
                              <span
                                className={
                                  alertSeverity === "critical"
                                    ? "rounded bg-red-900/45 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-red-200/90"
                                    : "rounded bg-amber-900/40 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-amber-200/90"
                                }
                              >
                                {alertLabel}
                              </span>
                            ) : null}
                            <span className="text-zinc-600">
                              {entry.isOwnClient
                                ? FORJA_COPY.monitor.vtcOwnClient
                                : FORJA_COPY.monitor.vtcOtherClient}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={isVip ? FORJA_TABLE_VIP_BADGE : FORJA_TABLE_COMUM_BADGE}>
                            {isVip ? FORJA_COPY.athleteVipBadge : FORJA_COPY.athleteStandardBadge}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-zinc-300">
                          {entry.forgerName && entry.forgerName !== "—"
                            ? entry.forgerName
                            : "Sem personal"}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums font-medium text-zinc-100">
                          {formatVtc(entry.vtcToday)}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-zinc-400">
                          {formatVtc(entry.vtcAvg7d)}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-zinc-400">
                          {formatVtc(entry.vtc30d)}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${resolveForjaChipClass(effectiveTier)}`}
                            title={FORJA_COPY.monitor.vtcColPhaseHint}
                          >
                            {thermal.label}
                          </span>
                          {mismatch ? (
                            <p className="mt-0.5 text-[9px] text-amber-400/80">
                              Registrada: {phaseTierLabel(entry.phaseTier as 1 | 2 | 3 | 4 | 5)}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`${FORJA_META} text-zinc-500`}>
                {FORJA_COPY.monitor.vtcFeedPageLabel(safePage, totalPages, filteredEntries.length)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={FORJA_GHOST_BUTTON}
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  {FORJA_COPY.monitor.vtcFeedPrev}
                </button>
                <button
                  type="button"
                  className={FORJA_GHOST_BUTTON}
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  {FORJA_COPY.monitor.vtcFeedNext}
                </button>
              </div>
            </div>
          </>
        )}

        {feedback ? (
          <p role="alert" className={FORJA_FEEDBACK_ERROR}>
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const ForjaVtcFeedPanel = memo(ForjaVtcFeedPanelComponent);
