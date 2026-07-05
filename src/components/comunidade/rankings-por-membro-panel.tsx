"use client";

import { useMemo, useState } from "react";
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
import type { ComunidadePhotoResolver } from "@/lib/comunidade-avatar";
import type { ProfileSexo } from "@/lib/profile-identity";
import type { RankingsThoth, RankingsThothSlice, RankingVtcEntry } from "@/lib/comunidade-data";
import { LoreEm } from "@/lib/lore-emphasis";

type RankingsThothPanelProps = {
  rankings: RankingsThoth | null;
  userId: string;
  userSexo?: ProfileSexo | null;
  resolvePhotoUrl?: ComunidadePhotoResolver;
  loading?: boolean;
};

type GeneroTab = ProfileSexo;
type MuscleTabKey = "superiores" | "pernas" | "global" | "peito" | "ombros" | "costas";

const GENERO_TABS: { key: GeneroTab; label: string }[] = [
  { key: "masculino", label: "Masculino" },
  { key: "feminino", label: "Feminino" },
];

const MUSCLE_TABS: { key: MuscleTabKey; label: string; rei?: boolean }[] = [
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

function resolveReiLeaderLabel(genero: GeneroTab, faixa: "superiores" | "pernas"): string {
  if (genero === "feminino") {
    return faixa === "superiores" ? "· líder Rainha Superiores" : "· líder Rainha Pernas";
  }
  return faixa === "superiores" ? "· líder Rei Superiores" : "· líder Rei Pernas";
}

function RankingRow({
  entry,
  userId,
  metricLabel,
  metricValue,
  isReiSlot = false,
  reiLeaderLabel,
  resolvePhotoUrl,
}: {
  entry: RankingVtcEntry;
  userId: string;
  metricLabel: string;
  metricValue: number;
  isReiSlot?: boolean;
  reiLeaderLabel?: string;
  resolvePhotoUrl?: ComunidadePhotoResolver;
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
        photoUrl={resolvePhotoUrl?.(entry.atleta_id, entry.atleta_avatar_path)}
        temCinturaoDuelo={entry.temCinturaoDuelo}
        isReiDasChamas={entry.isReiDasChamas}
        isPilarCooperativo={entry.isPilarCooperativo}
        size="sm"
      />
      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] xs:basis-auto">
        <p className="break-words text-pretty text-[10px] font-medium text-neutral-200 xs:text-[11px]">
          {isSelf ? "Tu" : entry.atleta_nome}
          {isReiLeader && reiLeaderLabel ? (
            <span className="block xs:ml-1 text-[9px] font-bold uppercase tracking-wide text-violet-300/90">
              {reiLeaderLabel}
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

function resolveActiveList(slice: RankingsThothSlice | null, activeTab: MuscleTabKey): RankingVtcEntry[] {
  if (!slice) return [];

  if (activeTab === "global") return slice.vtc_global;
  if (activeTab === "superiores") return slice.vtc_faixa?.superiores ?? [];
  if (activeTab === "pernas") return slice.vtc_faixa?.inferiores ?? slice.vtc_por_membro.pernas;
  return slice.vtc_por_membro[activeTab] ?? [];
}

function resolveRankingSlice(
  rankings: RankingsThoth | null,
  genero: GeneroTab,
): RankingsThothSlice | null {
  if (!rankings) return null;
  const fromGenero = rankings.por_genero?.[genero];
  if (fromGenero) return fromGenero;
  return rankings;
}

export function RankingsThothPanel({
  rankings,
  userId,
  userSexo = null,
  resolvePhotoUrl,
  loading = false,
}: RankingsThothPanelProps) {
  const [activeGenero, setActiveGenero] = useState<GeneroTab>(userSexo ?? "masculino");
  const [activeTab, setActiveTab] = useState<MuscleTabKey>("superiores");

  const activeSlice = useMemo(
    () => resolveRankingSlice(rankings, activeGenero),
    [activeGenero, rankings],
  );

  const activeList = resolveActiveList(activeSlice, activeTab);
  const mesLabel = formatMesReferencia(activeSlice?.mes_referencia ?? rankings?.mes_referencia);

  const activeLabel =
    activeTab === "global"
      ? "VTC total"
      : activeTab === "superiores"
        ? "VTC superiores"
        : activeTab === "pernas"
          ? "VTC pernas"
          : `VTC ${MUSCLE_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}`;

  const isReiTab = activeTab === "superiores" || activeTab === "pernas";
  const reiLeaderLabel = isReiTab
    ? resolveReiLeaderLabel(activeGenero, activeTab as "superiores" | "pernas")
    : undefined;

  const generoArenaLabel = activeGenero === "feminino" ? "feminina" : "masculina";

  return (
    <section
      className={`${COMUNIDADE_PANEL} border-violet-500/15 bg-gradient-to-br from-neutral-950/95 via-violet-950/10 to-neutral-950/95`}
      aria-label="Ranking mensal VTC da comunidade"
    >
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-violet-300/85`}>Ranking mensal</p>
        <h3 className={`${COMUNIDADE_HEADING} text-violet-50/95`}>
          Top 10 · arena {generoArenaLabel} · {mesLabel}
        </h3>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Contamos seu <LoreEm>melhor peso do dia</LoreEm> em cada exercício e somamos tudo no mês.
          Essa pontuação chama-se <LoreEm>VTC</LoreEm>.
        </p>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Nas abas <LoreEm>Superiores</LoreEm> e <LoreEm>Pernas</LoreEm>, quem fechar o mês em 1º
          lugar torna-se <LoreEm>Rei ou Rainha das Chamas</LoreEm> no mês seguinte, dentro da arena
          do seu gênero. As outras abas mostram o detalhe por músculo.
        </p>
      </header>

      <div className={`mt-4 ${COMUNIDADE_TAB_LIST}`} role="tablist" aria-label="Filtrar ranking por gênero">
        {GENERO_TABS.map(({ key, label }) => {
          const selected = activeGenero === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveGenero(key)}
              className={`${COMUNIDADE_TAB_BUTTON} ${
                selected
                  ? "border-amber-400/40 bg-amber-950/35 text-amber-100"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-3 ${COMUNIDADE_TAB_LIST}`}
        role="tablist"
        aria-label="Filtrar ranking por grupo muscular"
      >
        {MUSCLE_TABS.map(({ key, label, rei }) => {
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
                  <span className="hidden sm:inline"> (título)</span>
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
          <EmptyState message="Ainda não há dados neste mês para esta arena. Registre treinos com peso para entrar na classificação." />
        </div>
      ) : (
        <ul className={`mt-4 ${COMUNIDADE_LIST_SCROLL}`}>
          {activeList.map((entry) => (
            <RankingRow
              key={`${activeGenero}-${activeTab}-${entry.atleta_id}`}
              entry={entry}
              userId={userId}
              metricLabel={activeLabel}
              metricValue={
                activeTab === "global" ? entry.vtc_total : entry.vtc_grupo || entry.vtc_total
              }
              isReiSlot={isReiTab}
              reiLeaderLabel={reiLeaderLabel}
              resolvePhotoUrl={resolvePhotoUrl}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** @deprecated use RankingsThothPanel */
export const RankingsPorMembroPanel = RankingsThothPanel;
