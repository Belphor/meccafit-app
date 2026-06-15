import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EvolucaoPageClient } from "@/components/evolution/evolucao-page-client";
import type { EvolutionCalorPayload } from "@/components/evolution/human-body-constants";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Controlador server — consome RPC get_muscular_evolution */
async function fetchEvolutionCalorPayload(): Promise<EvolutionCalorPayload> {
  const supabase = await createSupabaseServerClient();
  return fetchMuscularEvolutionPayload(supabase);
}

async function fetchProfileName(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  return data?.full_name?.trim() || null;
}

function EvolucaoHudShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#030305] px-[max(1.25rem,env(safe-area-inset-left))] py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] pr-[max(1.25rem,env(safe-area-inset-right))] text-white">
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

async function EvolucaoPageContent({ userId }: { userId: string }) {
  const [initialPayload, profileName] = await Promise.all([
    fetchEvolutionCalorPayload(),
    fetchProfileName(userId),
  ]);

  return (
    <EvolucaoPageClient
      userId={userId}
      initialPayload={initialPayload}
      profileName={profileName}
      variant="page"
    />
  );
}

export default async function EvolucaoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <EvolucaoHudShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-cyan-500/10 bg-black/50 p-6 backdrop-blur-sm">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500/60">
              Sincronizando evolução…
            </p>
          </div>
        }
      >
        <EvolucaoPageContent userId={user.id} />
      </Suspense>
    </EvolucaoHudShell>
  );
}
