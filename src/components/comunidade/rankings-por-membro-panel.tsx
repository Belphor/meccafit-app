"use client";

import { useState } from "react";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { RankingsThoth, RankingVtcEntry } from "@/lib/comunidade-data";

type RankingsThothPanelProps = {
  rankings: RankingsThoth | null;
  userId: string;
  loading?: boolean;
};

type TabKey = "global" | "peito" | "ombros" | "costas" | "pernas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "peito", label: "Peito" },
  { key: "ombros", label: "Ombros" },
  { key: "costas", label: "Costas" },
  { key: "pernas", label: "Pernas" },
];

function formatVtc(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

function RankingRow({
  entry,
  userId,
  metricLabel,
  metricValue,
}: {
  entry: RankingVtcEntry;
  userId: string;
  metricLabel: string;
  metricValue: number;
}) {
  const isSelf = entry.atleta_id === userId;
  const isPodium = entry.posicao <= 3;

  return (
    <li
      className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border px-2.5 py-2 sm:gap-3 sm:px-3 ${
        isSelf
          ? "border-amber-500/35 bg-amber-950/20"
          : isPodium
            ? "border-violet-500/20 bg-violet-950/10"
            : "border-neutral-800/80 bg-neutral-950/50"
      }`}
    >
      <span
        className={`w-7 shrink-0 text-center font-mono text-[11px] font-bold tabular-nums ${
          isPodium ? "text-violet-200" : "text-amber-200/80"
        }`}
      >
        {entry.posicao}
      </span>
      <PlutusAvatar
        name={entry.atleta_nome}
        temCinturaoDuelo={entry.temCinturaoDuelo}
        isReiDasChamas={entry.isReiDasChamas}
        isPilarCooperativo={entry.isPilarCooperativo}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-neutral-200">
          {isSelf ? "Tu" : entry.atleta_nome}
        </p>
        <p className="font-mono text-[10px] tabular-nums text-neutral-500">
          {formatVtc(metricValue)} · {metricLabel}
        </p>
      </div>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-[10px] leading-relaxed text-neutral-500">
      {message}
    </p>
  );
}

export function RankingsThothPanel({ rankings, userId, loading = false }: RankingsThothPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("global");

  const activeList: RankingVtcEntry[] =
    activeTab === "global"
      ? (rankings?.vtc_global ?? [])
      : (rankings?.vtc_por_membro[activeTab] ?? []);

  const activeLabel =
    activeTab === "global" ? "VTC total" : `VTC ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}`;

  return (
    <section
      className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-neutral-950/95 via-violet-950/10 to-neutral-950/95 p-4 sm:p-5"
      aria-label="Rankings THOTH VTC"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/85">
          Rankings · THOTH
        </p>
        <h3 className="mt-1 text-balance text-sm font-semibold text-violet-50/95 sm:text-base">
          Top 10 VTC · janela de 14 dias
        </h3>
        {rankings ? (
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            MIDAS · mesma fórmula da aba Evolução
          </p>
        ) : null}
      </header>

      <div
        className="mt-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtrar ranking por membro"
      >
        {TABS.map(({ key, label }) => {
          const selected = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(key)}
              className={`min-h-11 shrink-0 rounded-full border px-3.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                selected
                  ? "border-violet-400/40 bg-violet-950/40 text-violet-100"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
      ) : activeList.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="Sem dados nesta janela — regista treinos para entrar no ranking." />
        </div>
      ) : (
        <ul className="mt-4 max-h-[min(28rem,60vh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {activeList.map((entry) => (
            <RankingRow
              key={`${activeTab}-${entry.atleta_id}`}
              entry={entry}
              userId={userId}
              metricLabel={activeLabel}
              metricValue={activeTab === "global" ? entry.vtc_total : entry.vtc_grupo}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** @deprecated use RankingsThothPanel */
export const RankingsPorMembroPanel = RankingsThothPanel;
