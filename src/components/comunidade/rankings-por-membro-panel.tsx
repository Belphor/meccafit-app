"use client";

import { useState } from "react";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_LIST_SCROLL,
  COMUNIDADE_PANEL,
  COMUNIDADE_TAB_BUTTON,
  COMUNIDADE_TAB_LIST,
} from "@/components/comunidade/comunidade-layout";
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
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-2 py-2 xs:gap-2.5 xs:px-2.5 sm:gap-3 sm:px-3 ${
        isSelf
          ? "border-amber-500/35 bg-amber-950/20"
          : isPodium
            ? "border-violet-500/20 bg-violet-950/10"
            : "border-neutral-800/80 bg-neutral-950/50"
      }`}
    >
      <span
        className={`w-6 shrink-0 text-center font-mono text-[10px] font-bold tabular-nums xs:w-7 xs:text-[11px] ${
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
        <p className="truncate text-[10px] font-medium text-neutral-200 xs:text-[11px]">
          {isSelf ? "Tu" : entry.atleta_nome}
        </p>
        <p className="truncate font-mono text-[9px] tabular-nums text-neutral-500 xs:text-[10px]">
          {formatVtc(metricValue)} kg · {metricLabel}
        </p>
      </div>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-[11px] leading-relaxed text-neutral-500">
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
      className={`${COMUNIDADE_PANEL} border-violet-500/15 bg-gradient-to-br from-neutral-950/95 via-violet-950/10 to-neutral-950/95`}
      aria-label="Rankings VTC da comunidade"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/85 sm:tracking-[0.22em]">
          Rankings
        </p>
        <h3 className="mt-1 text-balance text-sm font-semibold text-violet-50/95 sm:text-base">
          Top 10 VTC · Últimos 14 dias
        </h3>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          <span className="font-medium text-neutral-400">VTC</span> é a soma dos maiores pesos que
          cada atleta levantou por exercício e por dia — nos grupos peito, ombros, costas e pernas.
          Quanto maior o VTC, mais forte foi o desempenho recente na linhagem.
        </p>
      </header>

      <div className={`mt-4 ${COMUNIDADE_TAB_LIST}`} role="tablist" aria-label="Filtrar ranking por grupo muscular">
        {TABS.map(({ key, label }) => {
          const selected = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(key)}
              className={`${COMUNIDADE_TAB_BUTTON} ${
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
        <ul className={`mt-4 ${COMUNIDADE_LIST_SCROLL}`}>
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
