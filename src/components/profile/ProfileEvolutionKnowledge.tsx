"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { EvolutionSystemsGuide } from "@/components/evolution/EvolutionSystemsGuide";
import { SupportFeedbackPanel } from "@/components/evolution/SupportFeedbackPanel";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import { ProfileLinhagemIdentity } from "@/components/profile/ProfileLinhagemIdentity";
import { FenixAnimationTestPanel } from "@/components/qa/FenixAnimationTestPanel";
import { DASHBOARD_PANEL_FRAME } from "@/lib/dashboard-config";
import { VTC_DEFINITION, VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

type ProfileEvolutionKnowledgeProps = {
  userId: string;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  initialCalorRows?: MuscleCalorRow[];
  initialIgnicao?: number;
};

export function ProfileEvolutionKnowledge({
  userId,
  profileName,
  profilePhotoUrl,
  initialCalorRows = [],
  initialIgnicao = 0,
}: ProfileEvolutionKnowledgeProps) {
  return (
    <div className="space-y-5">
      <ProfileLinhagemIdentity
        userId={userId}
        serverName={profileName}
        initialCalorRows={initialCalorRows}
        initialIgnicao={initialIgnicao}
      />

      <FenixAnimationTestPanel
        userId={userId}
        profileName={profileName}
        profilePhotoUrl={profilePhotoUrl}
      />

      <BrasaVivaCard
        as="section"
        variant="treino"
        className={DASHBOARD_PANEL_FRAME}
        aria-labelledby="perfil-fenix-guide-title"
      >
        <DashboardPanelHeader chip="Referência" meta="Como medimos sua evolução" />

        <h2 id="perfil-fenix-guide-title" className="sr-only">
          Como a Fênix mede sua evolução
        </h2>

        <DashboardClientInfoBlock className="mt-4" label={`O que é ${VTC_DISPLAY_NAME}?`}>
          {VTC_DEFINITION}
        </DashboardClientInfoBlock>

        <div className="mt-4">
          <EvolutionSystemsGuide />
        </div>
      </BrasaVivaCard>

      <SupportFeedbackPanel />
    </div>
  );
}
