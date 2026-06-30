"use client";

import {
  DASHBOARD_CLIENT_INFO_LABEL,
  DASHBOARD_CLIENT_INFO_TEXT,
  DASHBOARD_INNER_FRAME,
} from "@/lib/dashboard-config";
import {
  EVOLUTION_SYSTEMS_OVERVIEW,
  FENIX_EVOLUTION_SYSTEMS,
  type FenixEvolutionSystemId,
} from "@/lib/fenix-evolution-glossary";

/** Ordem alinhada à aba Evolução: Ritmo → Brasas → Chama (+ Gravidade) → Altar. Ascensão e Inatividade ficam no Perfil. */
const SYSTEM_ORDER: FenixEvolutionSystemId[] = [
  "ritmo_fenix",
  "brasas_musculares",
  "chama_acumulada",
  "gravidade_termica",
  "chama_altar",
];

const SYSTEM_ACCENT: Record<FenixEvolutionSystemId, string> = {
  chama_altar: "border-orange-500/20 text-amber-400/90",
  chama_acumulada: "border-amber-500/25 text-amber-300/90",
  gravidade_termica: "border-orange-500/30 text-orange-300/90",
  brasas_musculares: "border-cyan-500/20 text-cyan-400/85",
  ritmo_fenix: "border-amber-500/20 text-amber-300/85",
  ascensao: "border-yellow-500/25 text-yellow-300/90",
};

/** Guia de sistemas da Fênix — exibido na aba Perfil. */
export function EvolutionSystemsGuide() {
  return (
    <div className={`${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
      <div>
        <p className={DASHBOARD_CLIENT_INFO_LABEL}>Como a Fênix mede sua evolução</p>
        <p className={`${DASHBOARD_CLIENT_INFO_TEXT} mt-2`}>{EVOLUTION_SYSTEMS_OVERVIEW}</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SYSTEM_ORDER.map((id) => {
          const system = FENIX_EVOLUTION_SYSTEMS[id];
          return (
            <li
              key={id}
              className={`rounded-xl border bg-black/30 px-3.5 py-3 ${SYSTEM_ACCENT[id].split(" ")[0]}`}
            >
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.18em] ${SYSTEM_ACCENT[id].split(" ").slice(1).join(" ")}`}
              >
                {system.loreName}
              </p>
              <p className="mt-1 text-sm font-medium text-amber-50">{system.metricName}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{system.period}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{system.explanation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
