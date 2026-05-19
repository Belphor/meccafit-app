"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PhoenixInput from "@/components/PhoenixInput";
import { supabase } from "@/lib/supabase";

type DashboardProfile = {
  id: string;
  full_name: string | null;
  data_nascimento: string | null;
  status_altar: string | null;
};

type DashboardStatus = "idle" | "loading" | "ready" | "error";

const BIOLOGICAL_BALANCE_MIN_AGE = 40;
const BIOLOGICAL_BALANCE_MULTIPLIER = 1.5;

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsedBirthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsedBirthDate.getFullYear();
  const monthDiff = today.getMonth() - parsedBirthDate.getMonth();
  const dayDiff = today.getDate() - parsedBirthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function resolveIsIncubating(status: string | null): boolean {
  const normalizedStatus = status?.trim().toLowerCase();
  return normalizedStatus === "incubating" || normalizedStatus === "incubacao" || normalizedStatus === "incubação";
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("idle");
  const [baseVtc, setBaseVtc] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setStatus("loading");

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const userId = sessionData.session?.user.id;
        if (!userId) {
          if (!isMounted) return;
          setProfile(null);
          setStatus("ready");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, data_nascimento, status_altar")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        setProfile(data);
        setStatus("ready");
      } catch {
        if (!isMounted) return;
        setErrorMessage("Não foi possível carregar o perfil energético.");
        setStatus("error");
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const age = useMemo(() => calculateAge(profile?.data_nascimento ?? null), [profile?.data_nascimento]);
  const isIncubating = resolveIsIncubating(profile?.status_altar ?? null);
  const hasBiologicalBalance = age !== null && age >= BIOLOGICAL_BALANCE_MIN_AGE;
  const finalVtc = hasBiologicalBalance ? baseVtc * BIOLOGICAL_BALANCE_MULTIPLIER : baseVtc;

  const handleVolumeCommitted = useCallback((volume: number) => {
    setBaseVtc(volume);
  }, []);

  const formattedVtc = useMemo(
    () => finalVtc.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
    [finalVtc],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,245,160,0.14),rgba(10,10,10,0.92)_38%,#0a0a0a_78%)]" />
      <div className="solar-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-[8%] h-[38vh] w-[38vh] -translate-x-1/2 rounded-full bg-[#ffbf00]/10 blur-3xl will-change-transform" />
      <div className="pointer-events-none absolute bottom-[-12%] left-1/2 h-[44vh] w-[72vw] -translate-x-1/2 rounded-full bg-[#ff8c00]/10 blur-3xl will-change-transform" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col items-center gap-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[#ffbf00]/85">Meccafit Center</p>
          <div className="solar-phoenix-aura relative mx-auto grid size-28 place-items-center sm:size-32">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,245,160,0.35)_0%,rgba(255,191,0,0.12)_42%,transparent_72%)] blur-md" />
            <svg viewBox="0 0 120 120" className="relative size-20 fill-none text-[#ffd700] sm:size-24" aria-hidden>
              <path d="M60 12 72 44 108 52 78 74 86 108 60 90 34 108 42 74 12 52 48 44 60 12Z" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
              <path d="M60 28c10 18 6 30-6 44 12-8 20-22 22-40 18 18 10 46-18 62-28-26-34-52-18-66 2 14 10 28 22 36-12-14-16-26-6-44Z" stroke="#ffbf00" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-wide text-white sm:text-6xl">
            DEIXE O ONTEM PARA TRÁS.
            <span className="solar-plasma-text mt-2 block bg-gradient-to-r from-[#e25822] via-[#ff8c00] via-[#ffbf00] to-[#fff5a0] bg-[length:240%_240%] bg-clip-text text-3xl text-transparent sm:text-5xl">RENASÇA HOJE</span>
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#ffd700]/45">Aba 1 · Treino. Carga e séries ficam locais; o VTC só nasce quando você sai do campo.</p>
        </header>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="solar-card-glow rounded-[2rem] border border-[#ffbf00]/20 bg-neutral-900/40 p-6 backdrop-blur-md sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-[#ffbf00]/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#ffbf00]">Aba 1</p>
                <h2 className="mt-2 font-serif text-3xl text-[#fff5a0]">Treino</h2>
              </div>
              <span className="rounded-full border border-[#ffbf00]/25 bg-[#ffbf00]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#ffd700]">Solar</span>
            </div>
            <div className="mt-8 flex justify-center">
              <PhoenixInput userId={profile?.id} onVolumeCommitted={handleVolumeCommitted} />
            </div>
          </article>
          <aside className="solar-card-glow rounded-[2rem] border border-[#ffbf00]/20 bg-neutral-900/40 p-6 backdrop-blur-md sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#ffbf00]">Braseiro Energético</p>
            <div className="mt-6 rounded-3xl border border-[#ffbf00]/12 bg-[#ffbf00]/[0.04] p-5">
              {isIncubating ? (
                <p className="font-serif text-2xl leading-9 text-[#fff5a0] drop-shadow-[0_0_20px_rgba(255,191,0,0.22)]">
                  Aguarde o despertar. Suas chamas estão em incubação...
                </p>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff8c00]">Volume Total de Carga</p>
                  <strong className="mt-3 block font-serif text-5xl text-[#ffd700] drop-shadow-[0_0_24px_rgba(255,191,0,0.22)]">{formattedVtc}</strong>
                  <span className="mt-2 block text-xs uppercase tracking-[0.22em] text-[#e25822]/80">
                    VTC final{hasBiologicalBalance ? " · Balança 1.5x" : ""}
                  </span>
                </>
              )}
            </div>
            <dl className="mt-6 grid gap-3 text-sm text-[#ffd700]/55">
              <div className="flex justify-between gap-4 border-b border-[#ffbf00]/10 pb-3">
                <dt>Cliente</dt>
                <dd className="text-right text-[#fff5a0]/85">{profile?.full_name ?? "Sessão não identificada"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#ffbf00]/10 pb-3">
                <dt>Idade</dt>
                <dd className="text-right text-[#fff5a0]/85">{age ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#ffbf00]/10 pb-3">
                <dt>Balança Biológica</dt>
                <dd className="text-right text-[#fff5a0]/85">{hasBiologicalBalance ? "1.5x ativo" : "Padrão"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Status</dt>
                <dd className="text-right text-[#fff5a0]/85">{status === "loading" ? "Carregando" : profile?.status_altar ?? "Altar padrão"}</dd>
              </div>
            </dl>
            {errorMessage ? (
              <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-200">{errorMessage}</p>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
