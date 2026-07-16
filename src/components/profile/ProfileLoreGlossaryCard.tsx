"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";
import { LORE_FITNESS_GLOSSARY } from "@/lib/lore-fitness-glossary";
import { LoreEm } from "@/lib/lore-emphasis";

/** Card minimizado · léxico da lore com significado real na musculação. */
export function ProfileLoreGlossaryCard() {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      data-tour-target="perfil-lexico"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="perfil-lexico-title"
    >
      <DashboardPanelHeader chip="Léxico" meta="Palavras da forja" />

      <div className={`mt-4 ${DASHBOARD_INNER_FRAME} p-4 sm:p-5`}>
        <details className="group">
          <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex w-full items-center justify-between gap-3">
              <span className="min-w-0 space-y-1.5">
                <h2 id="perfil-lexico-title" className={DASHBOARD_SECTION_TITLE}>
                  Léxico da Forja
                </h2>
                <p className="text-sm leading-relaxed text-neutral-400">
                  Cada palavra da lore e seu significado real na musculação. Toque para abrir.
                </p>
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-200/90 transition group-open:rotate-180"
                aria-hidden
              >
                ▾
              </span>
            </span>
          </summary>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {LORE_FITNESS_GLOSSARY.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-orange-500/14 bg-black/30 px-3.5 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400/85">
                  <LoreEm>{entry.term}</LoreEm>
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-300">
                  {entry.meaning}
                </p>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </BrasaVivaCard>
  );
}
