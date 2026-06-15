import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ComunidadePageClient } from "@/components/comunidade/comunidade-page-client";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function ComunidadeHudShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#030305] px-[max(1.25rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}

export default async function ComunidadePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <ComunidadeHudShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-cyan-500/10 bg-black/50 p-6 backdrop-blur-sm">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500/60">
              Abrindo comunidade…
            </p>
          </div>
        }
      >
        <ComunidadePageClient userId={user.id} />
      </Suspense>
    </ComunidadeHudShell>
  );
}
