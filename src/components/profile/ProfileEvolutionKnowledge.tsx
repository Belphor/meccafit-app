"use client";

import Link from "next/link";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import { FenyxiaSuportePanel } from "@/components/profile/FenyxiaSuportePanel";
import { ProfileFenyxiaEmpresaCard } from "@/components/profile/ProfileFenyxiaEmpresaCard";
import { ProfileHistoriaCard } from "@/components/profile/ProfileHistoriaCard";
import { ProfileLinhagemIdentity } from "@/components/profile/ProfileLinhagemIdentity";
import { ProfileLoreGlossaryCard } from "@/components/profile/ProfileLoreGlossaryCard";
import type { ProfileSexo } from "@/lib/profile-identity";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  EXERCISE_VIDEO_BUTTON,
} from "@/lib/dashboard-config";
import {
  PROFILE_FENIX_MEDE_ROUTE,
  PROFILE_FENIX_MEDE_TITLE,
} from "@/lib/profile-knowledge-routes";

type ProfileEvolutionKnowledgeProps = {
  userId: string;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  profileSexo?: ProfileSexo | null;
  identidadeConfirmada?: boolean;
  onIdentityConfirmed?: () => void;
  initialCalorRows?: MuscleCalorRow[];
  initialIgnicao?: number;
};

export function ProfileEvolutionKnowledge({
  userId,
  profileName,
  profileSexo = null,
  identidadeConfirmada = false,
  onIdentityConfirmed,
  initialCalorRows = [],
  initialIgnicao = 0,
}: ProfileEvolutionKnowledgeProps) {
  return (
    <div className="space-y-5">
      <ProfileLinhagemIdentity
        userId={userId}
        serverName={profileName}
        serverSexo={profileSexo}
        identidadeConfirmada={identidadeConfirmada}
        onIdentityConfirmed={onIdentityConfirmed}
        initialCalorRows={initialCalorRows}
        initialIgnicao={initialIgnicao}
      />

      <ProfileHistoriaCard />

      <ProfileLoreGlossaryCard />

      <BrasaVivaCard
        as="section"
        variant="treino"
        className={DASHBOARD_PANEL_FRAME}
        aria-labelledby="perfil-fenix-guide-title"
      >
        <DashboardPanelHeader chip="Referência" meta="Como medimos sua evolução" />

        <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-4 p-4 sm:p-5`}>
          <div className="space-y-1.5">
            <h2 id="perfil-fenix-guide-title" className={DASHBOARD_SECTION_TITLE}>
              {PROFILE_FENIX_MEDE_TITLE}
            </h2>
            <p className="text-sm leading-relaxed text-neutral-400">
              VTC, Calendário, Ritmo, Mapa Corporal, Inatividade e Ascensão.
            </p>
          </div>

          <Link
            href={PROFILE_FENIX_MEDE_ROUTE}
            className={`${EXERCISE_VIDEO_BUTTON} w-full justify-center px-4 py-3 text-center text-[10px] leading-snug tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em]`}
            aria-label={`Abrir ${PROFILE_FENIX_MEDE_TITLE}`}
          >
            Abrir referência completa
          </Link>
        </div>
      </BrasaVivaCard>

      <ProfileFenyxiaEmpresaCard />

      <FenyxiaSuportePanel />
    </div>
  );
}
