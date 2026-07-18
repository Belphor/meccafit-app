import Link from "next/link";
import { resolveForjadorWorkspaceNav, type ForjadorNavRoute } from "@/lib/forjador-vip-nav";

type ForjaWorkspaceNavProps = {
  isSovereign: boolean;
  activeHref: ForjadorNavRoute;
};

export function ForjaWorkspaceNav({ isSovereign, activeHref }: ForjaWorkspaceNavProps) {
  return (
    <nav
      aria-label="Navegação forjador"
      className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
    >
      {resolveForjadorWorkspaceNav(isSovereign).map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex min-h-11 shrink-0 items-center rounded-xl border px-3 py-2.5 text-xs font-medium transition sm:px-4",
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
  );
}
