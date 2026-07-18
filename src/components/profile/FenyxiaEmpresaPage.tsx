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

function EmpresaIntroParagraph() {
  return (
    <p className="text-sm leading-relaxed text-neutral-300">
      A <LoreEm>FENYXIA</LoreEm> é uma empresa de tecnologia que cria{" "}
      <LoreEm>sistemas sob medida</LoreEm>. Cada entrega é <LoreEm>exclusiva</LoreEm>,{" "}
      <LoreEm>high code</LoreEm> e <LoreEm>fantasia</LoreEm> aplicada ao produto. Os pontos da{" "}
      <LoreEm>FENYXIA</LoreEm> nascem <LoreEm>únicos para cada cliente</LoreEm>, com identidade
      própria e sem atalho de prateleira.
    </p>
  );
}

function EmpresaShowcaseParagraph() {
  return (
    <p className="text-sm leading-relaxed text-neutral-300">
      O <LoreEm>MECCAFIT</LoreEm> é a primeira obra neste modelo, vitrine viva do que a casa
      forja. Dentro do altar não há cobranças nem monetização.
    </p>
  );
}

function EmpresaContactParagraph() {
  return (
    <p className="text-sm leading-relaxed text-neutral-300">
      Se o trabalho da <LoreEm>FENYXIA</LoreEm> despertou o seu interesse, fale conosco pelo
      atendimento abaixo.
    </p>
  );
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

              <EmpresaIntroParagraph />
              <EmpresaShowcaseParagraph />
              <EmpresaContactParagraph />
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
