"use client";

import { useEffect, useMemo, useState } from "react";
import { ForjaAthleteCard } from "@/app/dashboard/forja/ForjaAthleteCard";
import {
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_META,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";

const DEFAULT_PAGE_SIZE = 12;

type ForjaClientPickerProps = {
  athletes: ForjaBondedAthlete[];
  /** Chamado ao escolher um cliente — deve navegar para a página do cliente. */
  onSelect: (clientId: string) => void;
  emptyMessage: string;
  vipHighlight?: boolean;
  pageSize?: number;
};

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function matchesAthleteSearch(athlete: ForjaBondedAthlete, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeSearch(
    [athlete.displayName, athlete.lineageName, athlete.forgerName].filter(Boolean).join(" "),
  );
  return haystack.includes(query);
}

export function ForjaClientPicker({
  athletes,
  onSelect,
  emptyMessage,
  vipHighlight = false,
  pageSize = DEFAULT_PAGE_SIZE,
}: ForjaClientPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = normalizeSearch(searchQuery);

  const filtered = useMemo(
    () => athletes.filter((athlete) => matchesAthleteSearch(athlete, normalizedQuery)),
    [athletes, normalizedQuery],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [normalizedQuery, athletes.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageAthletes = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  if (athletes.length === 0) {
    return (
      <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="forja-client-picker-search" className="sr-only">
          {FORJA_COPY.searchPlaceholder}
        </label>
        <input
          id="forja-client-picker-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={FORJA_COPY.searchPlaceholder}
          className={FORJA_INPUT}
          autoComplete="off"
        />
      </div>

      {filtered.length === 0 ? (
        <p className={`${FORJA_META} rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center`}>
          {FORJA_COPY.searchEmpty}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageAthletes.map((athlete) => (
              <ForjaAthleteCard
                key={athlete.bondId}
                athlete={athlete}
                isSelected={false}
                onSelect={onSelect}
                vipHighlight={vipHighlight}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className={`${FORJA_META} text-zinc-500`}>
              {FORJA_COPY.monitor.vtcFeedPageLabel(safePage, totalPages, filtered.length)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={FORJA_GHOST_BUTTON}
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {FORJA_COPY.monitor.vtcFeedPrev}
              </button>
              <button
                type="button"
                className={FORJA_GHOST_BUTTON}
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {FORJA_COPY.monitor.vtcFeedNext}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
