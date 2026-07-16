"use client";

import Link from "next/link";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SHELL,
  DASHBOARD_TAP_TARGET,
} from "@/lib/dashboard-config";
import {
  FENYXIA_EMPRESA_CHIP,
  FENYXIA_EMPRESA_META,
  FENYXIA_EMPRESA_TITLE,
} from "@/lib/fenyxia-empresa";
import {
  buildEmpresaInterestWhatsAppMessage,
  buildFenyxiaWhatsAppUrl,
  FENYXIA_CEO,
} from "@/lib/fenyxia-contact";
import { LoreEm } from "@/lib/lore-emphasis";

function openEmpresaWhatsApp() {
  const url = buildFenyxiaWhatsAppUrl(buildEmpresaInterestWhatsAppMessage());
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Página dedicada · apresentação da Empresa FENYXIA. */
export function FenyxiaEmpresaPage() {
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
          aria-labelledby="fenyxia-empresa-page-title"
        >
          <DashboardPanelHeader chip={FENYXIA_EMPRESA_CHIP} meta={FENYXIA_EMPRESA_META} />

          <div className={`mt-4 ${DASHBOARD_INNER_FRAME} space-y-5 p-4 sm:p-5`}>
            <div className="space-y-3">
              <h1 id="fenyxia-empresa-page-title" className={DASHBOARD_SECTION_TITLE}>
                {FENYXIA_EMPRESA_TITLE}
              </h1>

              <p className="text-sm leading-relaxed text-neutral-300">
                A <LoreEm>FENYXIA</LoreEm> está em processo de fundação. O{" "}
                <LoreEm>MECCAFIT</LoreEm> é o primeiro projeto no modelo da casa:{" "}
                <LoreEm>exclusividade</LoreEm>, <LoreEm>high code</LoreEm> e{" "}
                <LoreEm>fantasia</LoreEm> como fonte de criação.
              </p>

              <p className="text-sm leading-relaxed text-neutral-300">
                Este produto é uma demonstração do que a empresa pode entregar. Serve como
                vitrine. Dentro do altar não há cobranças nem monetização.
              </p>

              <p className="text-sm leading-relaxed text-neutral-300">
                Se quiser saber mais, ou se o trabalho da <LoreEm>FENYXIA</LoreEm> despertou o seu
                interesse, fale conosco pelo atendimento abaixo.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/45 via-black/50 to-black/65 px-4 py-5 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/85">
                Atendimento Fenyxia
              </p>
              <p className="mt-3 text-xl font-bold text-amber-50 sm:text-2xl">{FENYXIA_CEO.name}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-200/90">{FENYXIA_CEO.role}</p>
            </div>

            <button
              type="button"
              onClick={openEmpresaWhatsApp}
              className={`${DASHBOARD_TAP_TARGET} w-full rounded-full border border-emerald-400/45 bg-gradient-to-r from-emerald-900/80 to-emerald-950/90 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.18)] transition hover:border-emerald-300/55 hover:from-emerald-800/80 hover:to-emerald-900/90`}
            >
              Enviar pelo WhatsApp
            </button>
          </div>
        </BrasaVivaCard>
      </div>
    </main>
  );
}
