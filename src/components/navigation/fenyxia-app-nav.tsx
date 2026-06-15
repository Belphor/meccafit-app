"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

const DASHBOARD_SECTIONS = [
  { id: "treino", label: "Treino" },
  { id: "evolucao", label: "Evolução" },
  { id: "comunidade", label: "Comunidade" },
  { id: "perfil", label: "Perfil" },
] as const;

export function FenyxiaAppNav() {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!onDashboard) {
    return null;
  }

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-orange-500/10 bg-black/85 px-2 py-2 backdrop-blur-md"
      aria-label="Atalhos do portal"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between gap-1">
        {DASHBOARD_SECTIONS.map((section) => (
          <li key={section.id} className="flex-1">
            <Link
              href={`/dashboard#${section.id}`}
              className={`${DASHBOARD_TAP_TARGET} flex h-full w-full items-center justify-center rounded-xl border border-transparent px-1 py-2.5 text-center text-neutral-500 transition-[border-color,background-color,color] duration-200 hover:border-orange-500/12 hover:text-neutral-300`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                {section.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
