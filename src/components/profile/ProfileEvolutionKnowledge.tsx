"use client";

import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { EvolutionSystemsGuide } from "@/components/evolution/EvolutionSystemsGuide";
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
} from "@/lib/dashboard-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

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

        <div className={`mt-4 ${DASHBOARD_INNER_FRAME} p-4 sm:p-5`}>
          <details className="group">
            <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex w-full items-center justify-between gap-3">
                <span className="min-w-0 space-y-1.5">
                  <h2 id="perfil-fenix-guide-title" className={DASHBOARD_SECTION_TITLE}>
                    Como a Fênix mede sua evolução
                  </h2>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    VTC, calendário, Ritmo, mapa corporal, inatividade e Ascensão. Toque para
                    abrir.
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

            <div className="mt-4 space-y-4">
              <DashboardClientInfoBlock label={`O que é ${VTC_DISPLAY_NAME}?`}>
                <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> é a carga máxima validada em quilogramas por
                exercício. Registramos apenas o <LoreEm>pico de cada movimento</LoreEm>, sem
                multiplicar repetições ou séries. É a base de todos os sistemas da Fênix: Chama
                Acumulada, Brasas Musculares, Ritmo e Gravidade Térmica.
              </DashboardClientInfoBlock>

              <DashboardClientInfoBlock label="Disciplina do calendário e do VTC">
                Só os mais disciplinados entram no ranking. Se faltar à forja ou não seguir o
                calendário, o input de <LoreEm>Volume de Carga Máxima</LoreEm> não libera. O{" "}
                <LoreEm>VTC</LoreEm> só abre quando o dia da planilha coincide com o{" "}
                <LoreEm>calendário de referência de Brasília</LoreEm>, depois de concluir a última
                série. Mudar a data no celular não engana a forja.
              </DashboardClientInfoBlock>

              <DashboardClientInfoBlock label="Meta, Ritmo e Mapa corporal">
                Na aba <LoreEm>Evolução</LoreEm>, os dias de treino planejados definem a sua meta
                mensal de <LoreEm>{VTC_DISPLAY_NAME}</LoreEm>. O <LoreEm>Ritmo da Fênix</LoreEm> mostra
                quanto dessa meta você cumpriu nos últimos 30 dias. O{" "}
                <LoreEm>Mapa de calor muscular</LoreEm> revela onde as Brasas ficaram mais fortes nos
                últimos 14 dias. Se o Ritmo cair abaixo de <LoreEm>50 por cento</LoreEm> após o
                acolhimento, as cores ficam mais suaves até a consistência reacender.
              </DashboardClientInfoBlock>

              <DashboardClientInfoBlock label="Inatividade da Linhagem">
                Se você ficar <LoreEm>30 dias sem entrar no app</LoreEm>, a chama da linhagem apaga
                gradualmente: sua fase <LoreEm>desce um nível de forma definitiva</LoreEm>. Ao
                voltar, um aviso permanece na tela até você{" "}
                <LoreEm>concluir qualquer série no Treino</LoreEm>. Ao reacender a chama, a
                regressão permanece. O ritual só dispensa o alerta e confirma que você retomou a
                forja.
              </DashboardClientInfoBlock>

              <DashboardClientInfoBlock label={FENIX_EVOLUTION_SYSTEMS.ascensao.loreName}>
                <LoreEm>Ascensão</LoreEm> celebra quando você supera seu próprio recorde de{" "}
                <LoreEm>{VTC_DISPLAY_NAME}</LoreEm> naquele exercício. É um momento visual de
                vitória. <LoreEm>Não altera fase</LoreEm>, mapa corporal nem Ritmo da Fênix.
              </DashboardClientInfoBlock>

              <EvolutionSystemsGuide />
            </div>
          </details>
        </div>
      </BrasaVivaCard>

      <ProfileFenyxiaEmpresaCard />

      <FenyxiaSuportePanel />
    </div>
  );
}
