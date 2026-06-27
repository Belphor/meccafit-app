"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_GHOST_BUTTON,
  FORJA_META,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaVtcFeedEntry } from "@/lib/forja-dashboard";
import { fetchForjaVtcFeed } from "@/lib/forja-sovereign-actions";
import { resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";

type ForjaVtcFeedPanelProps = {
  onSelectClient?: (clientId: string) => void;
  selectedClientId?: string | null;
  refreshVersion?: number;
  onFeedLoaded?: (entries: ForjaVtcFeedEntry[]) => void;
  /** Mapa clientId → VIP (fallback quando RPC remota não envia hasVipBond). */
  vipBondByClientId?: Record<string, boolean>;
};

function formatVtc(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${Math.round(value)} kg`;
}

function ForjaVtcFeedPanelComponent({
  onSelectClient,
  selectedClientId,
  refreshVersion = 0,
  onFeedLoaded,
  vipBondByClientId = {},
}: ForjaVtcFeedPanelProps) {
  const [entries, setEntries] = useState<ForjaVtcFeedEntry[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setPhase("loading");
    setFeedback(null);

    const result = await fetchForjaVtcFeed(64);

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

        {entries.length === 0 ? (
          <p className={`${FORJA_META} mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center`}>
            {isBusy ? FORJA_COPY.monitor.loading : FORJA_COPY.monitor.vtcFeedEmpty}
          </p>
        ) : (
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
                {entries.map((entry) => {
                  const thermal = resolveForjaThermalStyle(entry.phaseTier);
                  const isSelected = selectedClientId === entry.clientId;
                  const isVip = entry.hasVipBond ?? vipBondByClientId[entry.clientId] ?? false;

                  return (
                    <tr
                      key={entry.clientId}
                      className={[
                        "border-b border-zinc-900/80 transition-colors",
                        entry.alertSpike ? "bg-amber-950/15" : "",
                        isSelected ? "bg-zinc-800/40" : "hover:bg-zinc-900/40",
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
                    >
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-zinc-100">{entry.displayName}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                          {entry.alertSpike ? (
                            <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-amber-200/90">
                              {FORJA_COPY.monitor.vtcSpike}
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
                        <span
                          className={[
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            isVip
                              ? "bg-zinc-800/80 text-zinc-300"
                              : "bg-zinc-900 text-zinc-500",
                          ].join(" ")}
                        >
                          {isVip ? FORJA_COPY.athleteVipBadge : FORJA_COPY.athleteStandardBadge}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-zinc-400">{entry.forgerName}</td>
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
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${resolveForjaChipClass(entry.phaseTier)}`}
                        >
                          {thermal.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
