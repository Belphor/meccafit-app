import type { ReactNode } from "react";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FORJA_META, FORJA_PAGE_TITLE, FORJA_SECTION_CHIP } from "@/lib/forja-config";

type ForjaWorkspaceHeaderProps = {
  chip: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
};

/**
 * Cabeçalho padronizado de todas as abas do painel do forjador.
 * O botão SAIR fica fixo no topo à direita em qualquer aba/tamanho de tela
 * (o container de texto encolhe com `min-w-0` em vez de empurrar o botão).
 */
export function ForjaWorkspaceHeader({ chip, title, subtitle }: ForjaWorkspaceHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-zinc-900 pb-5">
      <div className="min-w-0">
        <MeccafitCenterBrand variant="portal" />
        <p className={`${FORJA_SECTION_CHIP} mt-3`}>{chip}</p>
        <h1 className={`${FORJA_PAGE_TITLE} mt-1`}>{title}</h1>
        {subtitle ? <div className={`${FORJA_META} mt-1.5 max-w-2xl`}>{subtitle}</div> : null}
      </div>
      <ForjaSignOutButton className="shrink-0" />
    </header>
  );
}
