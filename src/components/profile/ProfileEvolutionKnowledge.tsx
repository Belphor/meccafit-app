"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { EvolutionSystemsGuide } from "@/components/evolution/EvolutionSystemsGuide";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import { FenyxiaSuportePanel } from "@/components/profile/FenyxiaSuportePanel";
import { ProfileLinhagemIdentity } from "@/components/profile/ProfileLinhagemIdentity";
import { FenixAnimationTestPanel } from "@/components/qa/FenixAnimationTestPanel";
import { DASHBOARD_PANEL_FRAME } from "@/lib/dashboard-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

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
          <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> é a carga máxima validada em quilogramas por exercício.
          Registramos apenas o <LoreEm>pico de cada movimento</LoreEm>, sem multiplicar repetições ou
          séries. É a base de todos os sistemas da Fênix: Chama Acumulada, Brasas Musculares, Ritmo e
          Gravidade Térmica.
        </DashboardClientInfoBlock>

        <DashboardClientInfoBlock className="mt-4" label="Inatividade da Linhagem">
          Se você ficar <LoreEm>30 dias sem entrar no app</LoreEm>, a chama da linhagem apaga
          gradualmente: sua fase <LoreEm>desce um nível de forma definitiva</LoreEm>. Ao voltar, um
          aviso permanece na tela até você <LoreEm>concluir qualquer série no Treino</LoreEm>. Ao
          reacender a chama, a regressão permanece; o ritual só dispensa o alerta e confirma que você
          retomou a forja.
        </DashboardClientInfoBlock>

        <DashboardClientInfoBlock className="mt-4" label={FENIX_EVOLUTION_SYSTEMS.ascensao.loreName}>
          <LoreEm>Ascensão</LoreEm> celebra quando você supera seu próprio recorde de{" "}
          <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> naquele exercício. É um momento visual de vitória.{" "}
          <LoreEm>Não altera fase</LoreEm>, mapa corporal nem Ritmo da Fênix.
        </DashboardClientInfoBlock>

        <div className="mt-4">
          <EvolutionSystemsGuide />
        </div>
      </BrasaVivaCard>

      <FenyxiaSuportePanel />
    </div>
  );
}
