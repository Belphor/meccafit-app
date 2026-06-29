"use client";

import { useState } from "react";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADER,
  COMUNIDADE_HEADING,
  COMUNIDADE_INNER_CARD,
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

type TabKey = "superiores" | "pernas" | "global" | "peito" | "ombros" | "costas";

const TABS: { key: TabKey; label: string; rei?: boolean }[] = [
  { key: "superiores", label: "Superiores", rei: true },
  { key: "pernas", label: "Pernas", rei: true },
  { key: "global", label: "Global" },
  { key: "peito", label: "Peito" },
  { key: "ombros", label: "Ombros" },
  { key: "costas", label: "Costas" },
];

function formatVtc(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

function formatMesReferencia(value?: string): string {
  if (!value) return "mês atual";
  const [year, month] = value.split("-");
  if (!year || !month) return "mês atual";
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function RankingRow({
  entry,
  userId,
  metricLabel,
  metricValue,
  isReiSlot = false,
}: {
  entry: RankingVtcEntry;
  userId: string;
  metricLabel: string;
  metricValue: number;
  isReiSlot?: boolean;
}) {
  const isSelf = entry.atleta_id === userId;
  const isPodium = entry.posicao <= 3;
  const isReiLeader = isReiSlot && entry.posicao === 1;

  return (
    <li
      className={`${COMUNIDADE_INNER_CARD} flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-2 xs:gap-x-2.5 xs:px-2.5 sm:gap-3 sm:px-3 ${
        isReiLeader
          ? "border-violet-400/35 bg-violet-950/25"
          : isSelf
            ? "border-amber-500/35 bg-amber-950/20"
            : isPodium
              ? "border-violet-500/20 bg-violet-950/10"
              : "border-neutral-800/80 bg-neutral-950/50"
      }`}
    >
      <span
        className={`w-6 shrink-0 text-center font-mono text-[10px] font-bold tabular-nums xs:w-7 xs:text-[11px] ${
          isReiLeader ? "text-violet-100" : isPodium ? "text-violet-200" : "text-amber-200/80"
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
      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] xs:basis-auto">
        <p className="break-words text-pretty text-[10px] font-medium text-neutral-200 xs:text-[11px]">
          {isSelf ? "Tu" : entry.atleta_nome}
          {isReiLeader ? (
            <span className="block xs:inline xs:ml-1 text-[9px] font-bold uppercase tracking-wide text-violet-300/90">
              · líder Rei
            </span>
          ) : null}
        </p>
        <p className="break-all font-mono text-[9px] tabular-nums text-neutral-500 xs:break-words xs:text-[10px]">
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

function resolveActiveList(rankings: RankingsThoth | null, activeTab: TabKey): RankingVtcEntry[] {
  if (!rankings) return [];

  if (activeTab === "global") return rankings.vtc_global;
  if (activeTab === "superiores") return rankings.vtc_faixa?.superiores ?? [];
  if (activeTab === "pernas") return rankings.vtc_faixa?.inferiores ?? rankings.vtc_por_membro.pernas;
  return rankings.vtc_por_membro[activeTab] ?? [];
}

export function RankingsThothPanel({ rankings, userId, loading = false }: RankingsThothPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("superiores");

  const activeList = resolveActiveList(rankings, activeTab);
  const mesLabel = formatMesReferencia(rankings?.mes_referencia);

  const activeLabel =
    activeTab === "global"
      ? "VTC total"
      : activeTab === "superiores"
        ? "VTC superiores"
        : activeTab === "pernas"
          ? "VTC pernas"
          : `VTC ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}`;

  const isReiTab = activeTab === "superiores" || activeTab === "pernas";

  return (
    <section
      className={`${COMUNIDADE_PANEL} border-violet-500/15 bg-gradient-to-br from-neutral-950/95 via-violet-950/10 to-neutral-950/95`}
      aria-label="Ranking mensal VTC da comunidade"
    >
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-violet-300/85`}>Ranking mensal</p>
        <h3 className={`${COMUNIDADE_HEADING} text-violet-50/95`}>
          Top 10: quem lidera em {mesLabel}
        </h3>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Contamos seu <span className="font-medium text-neutral-300">melhor peso do dia</span> em
          cada exercício e somamos tudo no mês. Essa pontuação chama-se{" "}
          <span className="font-medium text-neutral-300">VTC</span>.
        </p>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Nas abas <span className="font-medium text-neutral-300">Superiores</span> e{" "}
          <span className="font-medium text-neutral-300">Pernas</span>, quem fechar o mês em 1º
          lugar torna-se <span className="font-medium text-neutral-300">Rei das Chamas</span> no mês
          seguinte. As outras abas servem para ver o detalhe por músculo.
        </p>
      </header>

      <div className={`mt-4 ${COMUNIDADE_TAB_LIST}`} role="tablist" aria-label="Filtrar ranking por grupo muscular">
        {TABS.map(({ key, label, rei }) => {
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
              {rei ? (
                <>
                  <span className="hidden sm:inline"> (define Rei)</span>
                  <span className="sm:hidden"> (Rei)</span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
      ) : activeList.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="Ainda não há dados neste mês. Registre treinos com peso para entrar na classificação." />
        </div>
      ) : (
        <ul className={`mt-4 ${COMUNIDADE_LIST_SCROLL}`}>
          {activeList.map((entry) => (
            <RankingRow
              key={`${activeTab}-${entry.atleta_id}`}
              entry={entry}
              userId={userId}
              metricLabel={activeLabel}
              metricValue={
                activeTab === "global" ? entry.vtc_total : entry.vtc_grupo || entry.vtc_total
              }
              isReiSlot={isReiTab}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** @deprecated use RankingsThothPanel */
export const RankingsPorMembroPanel = RankingsThothPanel;
