"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

const APP_TABS = [
  { href: "/evolucao", label: "Evolução" },
  { href: "/dashboard", label: "Treino" },
  { href: "/comunidade", label: "Comunidade" },
  { href: "/perfil", label: "Perfil" },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FenyxiaAppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-orange-500/10 bg-black/85 px-2 py-2 backdrop-blur-md"
      aria-label="Navegação principal FENYXIA"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between gap-1">
        {APP_TABS.map((tab) => {
          const isActive = isTabActive(pathname, tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`${DASHBOARD_TAP_TARGET} flex h-full w-full items-center justify-center rounded-xl border px-1 py-2.5 text-center transition-[border-color,background-color,color] duration-200 ${
                  isActive
                    ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-100"
                    : "border-transparent bg-transparent text-neutral-500 hover:border-orange-500/12 hover:text-neutral-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
