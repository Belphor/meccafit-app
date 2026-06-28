"use client";

import { useMemo, useState } from "react";
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
}: {
  label: string;
  athletes: ForjaBondedAthlete[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  vipHighlight?: boolean;
}) {
  if (athletes.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="sticky top-0 z-[1] bg-black/90 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        {label}
        <span className="ml-2 tabular-nums text-zinc-700">{athletes.length}</span>
      </p>
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
  const normalizedQuery = normalizeSearch(searchQuery);

  const filteredAthletes = useMemo(
    () => athletes.filter((athlete) => matchesAthleteSearch(athlete, normalizedQuery)),
    [athletes, normalizedQuery],
  );

  const lists = splitAthletesByVipBond(filteredAthletes);
  const visible = vipOnly ? lists.vip : lists.all;

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
    </div>
  ) : null;

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
        <div className={FORJA_SIDEBAR_SCROLL}>
          {visible.map((athlete) => (
            <ForjaAthleteCard
              key={athlete.bondId}
              athlete={athlete}
              isSelected={selectedClientId === athlete.clientId}
              onSelect={onSelect}
              vipHighlight={vipOnly}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {searchInput}
      <div className={`${FORJA_SIDEBAR_SCROLL} space-y-4`}>
        <AthleteSection
          label="Clientes VIP"
          athletes={lists.vip}
          selectedClientId={selectedClientId}
          onSelect={onSelect}
          vipHighlight
        />
        <AthleteSection
          label="Clientes comuns"
          athletes={lists.comum}
          selectedClientId={selectedClientId}
          onSelect={onSelect}
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
