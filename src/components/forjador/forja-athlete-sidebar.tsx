"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ForjaAthleteCard } from "@/app/dashboard/forja/ForjaAthleteCard";
import {
  FORJA_EMPTY_STATE,
  FORJA_INPUT,
  FORJA_META,
  FORJA_SECTION_CHIP,
  FORJA_SIDEBAR_SCROLL,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import { splitAthletesByVipBond } from "@/lib/forja-athlete-lists";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";

type ForjaAthleteSidebarProps = {
  athletes: ForjaBondedAthlete[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  emptyMessage: string;
  /** Se true, mostra secções VIP e Comum separadas. */
  splitByVip?: boolean;
  vipOnly?: boolean;
  /** Barra de pesquisa por nome / linhagem. */
  searchable?: boolean;
};

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAthleteSearch(athlete: ForjaBondedAthlete, query: string): boolean {
  if (!query) return true;
  const haystack = [athlete.displayName, athlete.lineageName, athlete.forgerName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function AthleteSection({
  label,
  athletes,
  selectedClientId,
  onSelect,
  vipHighlight = false,
  forceOpen = false,
}: {
  label: string;
  athletes: ForjaBondedAthlete[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  vipHighlight?: boolean;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(forceOpen);

  useEffect(() => {
    if (!forceOpen) return;

    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [forceOpen]);

  if (athletes.length === 0) return null;

  return (
    <details
      className="group rounded-xl border border-zinc-900/80 bg-zinc-950/20"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
          <span className="ml-2 tabular-nums text-zinc-600">{athletes.length}</span>
          <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600 group-open:hidden">
            · toque para expandir
          </span>
        </p>
      </summary>
      <div className="space-y-2 border-t border-zinc-900/60 px-2 pb-2 pt-2">
        {athletes.map((athlete) => (
          <ForjaAthleteCard
            key={athlete.bondId}
            athlete={athlete}
            isSelected={selectedClientId === athlete.clientId}
            onSelect={onSelect}
            vipHighlight={vipHighlight}
          />
        ))}
      </div>
    </details>
  );
}

function AthleteCardList({
  athletes,
  selectedClientId,
  onSelect,
  vipHighlight = false,
}: {
  athletes: ForjaBondedAthlete[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  vipHighlight?: boolean;
}) {
  return (
    <>
      {athletes.map((athlete) => (
        <ForjaAthleteCard
          key={athlete.bondId}
          athlete={athlete}
          isSelected={selectedClientId === athlete.clientId}
          onSelect={onSelect}
          vipHighlight={vipHighlight}
        />
      ))}
    </>
  );
}

export function ForjaAthleteSidebar({
  athletes,
  selectedClientId,
  onSelect,
  emptyMessage,
  splitByVip = true,
  vipOnly = false,
  searchable = true,
}: ForjaAthleteSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const normalizedQuery = normalizeSearch(searchQuery);
  const hasSearch = normalizedQuery.length > 0;

  const filteredAthletes = useMemo(
    () => athletes.filter((athlete) => matchesAthleteSearch(athlete, normalizedQuery)),
    [athletes, normalizedQuery],
  );

  const lists = splitAthletesByVipBond(filteredAthletes);
  const visible = vipOnly ? lists.vip : lists.all;

  useEffect(() => {
    if (!hasSearch || visible.length === 0) return;

    const timer = window.setTimeout(() => setListOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [hasSearch, visible.length]);

  if (athletes.length === 0) {
    return (
      <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center`}>
        {emptyMessage}
      </p>
    );
  }

  const searchInput = searchable ? (
    <div className="mb-3">
      <label htmlFor="forja-athlete-search" className="sr-only">
        {FORJA_COPY.searchPlaceholder}
      </label>
      <input
        id="forja-athlete-search"
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={FORJA_COPY.searchPlaceholder}
        className={FORJA_INPUT}
        autoComplete="off"
      />
      <p className={`${FORJA_META} mt-1.5 text-zinc-600`}>{FORJA_COPY.monitor.sidebarSearchHint}</p>
    </div>
  ) : null;

  const wrapCollapsibleList = (content: ReactNode, count: number) => (
    <details
      className="group rounded-xl border border-zinc-900/80 bg-zinc-950/20"
      open={listOpen}
      onToggle={(event) => setListOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {FORJA_COPY.monitor.sidebarListLabel}
          <span className="ml-2 tabular-nums text-zinc-600">{count}</span>
          <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600 group-open:hidden">
            · toque para expandir
          </span>
        </p>
      </summary>
      <div className={`${FORJA_SIDEBAR_SCROLL} border-t border-zinc-900/60 px-2 pb-2 pt-2`}>
        {content}
      </div>
    </details>
  );

  if (visible.length === 0) {
    return (
      <>
        {searchInput}
        <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center`}>
          {FORJA_COPY.searchEmpty}
        </p>
      </>
    );
  }

  if (!splitByVip || vipOnly) {
    return (
      <>
        {searchInput}
        {wrapCollapsibleList(
          <AthleteCardList
            athletes={visible}
            selectedClientId={selectedClientId}
            onSelect={onSelect}
            vipHighlight={vipOnly}
          />,
          visible.length,
        )}
      </>
    );
  }

  return (
    <>
      {searchInput}
      <div className="space-y-4">
        <AthleteSection
          label="Clientes VIP"
          athletes={lists.vip}
          selectedClientId={selectedClientId}
          onSelect={onSelect}
          vipHighlight
          forceOpen={hasSearch && lists.vip.length > 0}
        />
        <AthleteSection
          label="Clientes comuns"
          athletes={lists.comum}
          selectedClientId={selectedClientId}
          onSelect={onSelect}
          forceOpen={hasSearch && lists.comum.length > 0}
        />
        {lists.vip.length === 0 && lists.comum.length === 0 ? (
          <div className={FORJA_EMPTY_STATE}>
            <p className={FORJA_SECTION_CHIP}>Lista vazia</p>
            <p className={`${FORJA_META} mt-2`}>{emptyMessage}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
