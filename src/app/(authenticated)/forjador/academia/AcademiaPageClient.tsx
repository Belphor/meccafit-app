"use client";

import Link from "next/link";
import { AcademiaConfigPanel } from "@/components/forjador/academia-config-panel";
import { ForjaSignOutButton } from "@/app/dashboard/forja/ForjaSignOutButton";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import {
  FORJA_AMBIENT,
  FORJA_COMMAND_PANEL,
  FORJA_META,
  FORJA_PAGE_TITLE,
  FORJA_SECTION_CHIP,
  FORJA_SHELL,
} from "@/lib/forja-config";
import { resolveForjaRoleLabel } from "@/lib/forja-copy";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { resolveForjadorWorkspaceNav } from "@/lib/forjador-vip-nav";

type AcademiaPageClientProps = {
  payload: ForjaDashboardPayload;
};

export function AcademiaPageClient({ payload }: AcademiaPageClientProps) {
  const navItems = resolveForjadorWorkspaceNav(payload.operator.isSovereign);

  return (
    <main className={FORJA_SHELL}>
      <div className={FORJA_AMBIENT} aria-hidden />
      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 pb-5">
          <div>
            <MeccafitCenterBrand variant="portal" />
            <p className={`${FORJA_SECTION_CHIP} mt-3`}>
              {resolveForjaRoleLabel(payload.operator.role)}
            </p>
            <h1 className={`${FORJA_PAGE_TITLE} mt-1`}>Academia</h1>
            <p className={`${FORJA_META} mt-1.5 max-w-2xl`}>
              Termômetro coletivo da Comunidade e manutenção dos limiares de fase. Somente o Forjador
              Soberano edita metas e dificuldade.
            </p>
          </div>
          <ForjaSignOutButton className="shrink-0" />
        </header>

        <nav aria-label="Navegação forjador" className="mt-4 flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive = item.href === "/forjador/academia";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex min-h-11 items-center rounded-xl border px-4 py-2.5 text-xs font-medium transition",
                  isActive
                    ? "border-zinc-500 bg-zinc-800/80 text-zinc-100"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`${FORJA_COMMAND_PANEL} mt-6`}>
          <AcademiaConfigPanel isSovereign={payload.operator.isSovereign} />
        </div>

        <FenyxiaBrandFooter className="mt-10" />
      </section>
    </main>
  );
}
