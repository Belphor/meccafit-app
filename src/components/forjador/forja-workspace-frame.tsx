import type { ReactNode } from "react";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { FORJA_AMBIENT, FORJA_SHELL } from "@/lib/forja-config";

type ForjaWorkspaceFrameProps = {
  children: ReactNode;
  maxWidthClassName?: string;
  footerClassName?: string;
};

export function ForjaWorkspaceFrame({
  children,
  maxWidthClassName = "max-w-7xl",
  footerClassName = "mt-10 border-zinc-900",
}: ForjaWorkspaceFrameProps) {
  return (
    <main className={FORJA_SHELL}>
      <div className={FORJA_AMBIENT} aria-hidden />
      <section className={`relative z-10 mx-auto flex w-full flex-col ${maxWidthClassName}`}>
        {children}
        <FenyxiaBrandFooter className={footerClassName} />
      </section>
    </main>
  );
}
