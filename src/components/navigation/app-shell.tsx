import { Suspense } from "react";
import { FenyxiaAppNav } from "@/components/navigation/fenyxia-app-nav";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ children, className = "" }: AppShellProps) {
  return (
    <div className={`relative min-h-dvh bg-black text-white ${className}`}>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</div>
      <Suspense fallback={null}>
        <FenyxiaAppNav />
      </Suspense>
    </div>
  );
}
