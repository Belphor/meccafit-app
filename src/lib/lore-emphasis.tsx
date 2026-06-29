import type { ReactNode } from "react";

/** Destaque de termos de lore em textos ao cliente. */
export function LoreEm({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-amber-50">{children}</strong>;
}
