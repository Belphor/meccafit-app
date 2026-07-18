"use client";

import Link from "next/link";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { EvolutionSystemsGuide } from "@/components/evolution/EvolutionSystemsGuide";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SHELL,
} from "@/lib/dashboard-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";
import { LoreEm } from "@/lib/lore-emphasis";
import { PROFILE_FENIX_MEDE_TITLE } from "@/lib/profile-knowledge-routes";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";

/** Página dedicada · referência de como a Fênix mede a evolução do atleta. */
export function ProfileFenixMedePage() {
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
          aria-labelledby="perfil-fenix-mede-page-title"
        >
          <DashboardPanelHeader chip="Referência" meta="Como medimos sua evolução" />

          <div className={`mt-4 ${DASHBOARD_INNER_FRAME} p-4 sm:p-5`}>
            <h1 id="perfil-fenix-mede-page-title" className={DASHBOARD_SECTION_TITLE}>
              {PROFILE_FENIX_MEDE_TITLE}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              VTC, calendário, Ritmo, mapa corporal, inatividade e Ascensão.
            </p>

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
          </div>
        </BrasaVivaCard>
      </div>
    </main>
  );
}
