"use client";

import Link from "next/link";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SHELL,
} from "@/lib/dashboard-config";
import { LORE_FITNESS_GLOSSARY } from "@/lib/lore-fitness-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { PROFILE_LEXICO_TITLE } from "@/lib/profile-knowledge-routes";

/** Página dedicada · léxico da lore com significado real na musculação. */
export function ProfileLoreGlossaryPage() {
  return (
    <main className={DASHBOARD_SHELL}>
      <div className="relative z-10 mx-auto w-full max-w-3xl px-1 py-6">
        <Link
          href="/dashboard?tab=perfil"
          className="mb-4 inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/90 hover:text-amber-200"
        >
          ← Voltar ao Perfil
        </Link>

        <BrasaVivaCard
          as="section"
          variant="treino"
          className={DASHBOARD_PANEL_FRAME}
          aria-labelledby="perfil-lexico-page-title"
        >
          <DashboardPanelHeader chip="Léxico" meta="Palavras da forja" />

          <div className={`mt-4 ${DASHBOARD_INNER_FRAME} p-4 sm:p-5`}>
            <h1 id="perfil-lexico-page-title" className={DASHBOARD_SECTION_TITLE}>
              {PROFILE_LEXICO_TITLE}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              Cada palavra da lore e o que ela significa de verdade na musculação.
            </p>

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
          </div>
        </BrasaVivaCard>
      </div>
    </main>
  );
}
