"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type PortalMode = "login_cliente" | "ignicao_forja" | "cadastro_forja";
type PortalTone = "cliente" | "forja";
type PortalStatus = "idle" | "loading" | "success" | "error";

type PortalFeedback = {
  status: PortalStatus;
  message: string;
};

type PortalProfile = {
  full_name: string | null;
  role: "forjador" | "cliente";
  nome_linhagem: string | null;
  status_altar: string | null;
};

type PortalAtmosphere = {
  accent: string;
  card: string;
  aura: string;
  particlePrimary: string;
  particleSecondary: string;
  logoStroke: string;
  logoSecondaryStroke: string;
};

type EmberParticle = {
  id: number;
  left: string;
  size: string;
  delay: string;
  duration: string;
  opacity: string;
  drift: string;
};

type EmberParticleStyle = CSSProperties & {
  "--duration": string;
  "--drift": string;
};

const modeAtmosphere: Record<PortalTone, PortalAtmosphere> = {
  cliente: {
    accent: "text-amber-500",
    card: "border-orange-500/15 shadow-[0_0_80px_rgba(249,115,22,0.12)]",
    aura: "from-orange-950/10 via-orange-600/20 to-amber-400/10",
    particlePrimary: "bg-orange-500/20",
    particleSecondary: "bg-amber-400/30",
    logoStroke: "#f97316",
    logoSecondaryStroke: "#fbbf24",
  },
  forja: {
    accent: "text-blue-100",
    card: "border-blue-100/15 shadow-[0_0_80px_rgba(147,197,253,0.1)]",
    aura: "from-blue-950/10 via-slate-200/16 to-cyan-300/10",
    particlePrimary: "bg-white/20",
    particleSecondary: "bg-blue-300/25",
    logoStroke: "#dbeafe",
    logoSecondaryStroke: "#93c5fd",
  },
};

const emberParticles: readonly EmberParticle[] = [
  { id: 1, left: "6%", size: "h-1 w-1", delay: "0s", duration: "14s", opacity: "opacity-35", drift: "18px" },
  { id: 2, left: "13%", size: "h-1.5 w-1.5", delay: "1.7s", duration: "18s", opacity: "opacity-20", drift: "-24px" },
  { id: 3, left: "21%", size: "h-1.5 w-1.5", delay: "0.9s", duration: "20s", opacity: "opacity-30", drift: "34px" },
  { id: 4, left: "29%", size: "h-1 w-2", delay: "3.1s", duration: "15s", opacity: "opacity-20", drift: "-14px" },
  { id: 5, left: "37%", size: "h-1 w-1", delay: "2.2s", duration: "19s", opacity: "opacity-35", drift: "28px" },
  { id: 6, left: "45%", size: "h-1.5 w-1", delay: "0.4s", duration: "17s", opacity: "opacity-25", drift: "-32px" },
  { id: 7, left: "53%", size: "h-1 w-1", delay: "4s", duration: "22s", opacity: "opacity-30", drift: "12px" },
  { id: 8, left: "61%", size: "h-1.5 w-1.5", delay: "1.2s", duration: "16s", opacity: "opacity-20", drift: "-20px" },
  { id: 9, left: "70%", size: "h-1 w-2", delay: "2.8s", duration: "21s", opacity: "opacity-30", drift: "30px" },
  { id: 10, left: "78%", size: "h-1 w-1", delay: "0.2s", duration: "15.5s", opacity: "opacity-35", drift: "-18px" },
  { id: 11, left: "86%", size: "h-1.5 w-1", delay: "3.7s", duration: "23s", opacity: "opacity-20", drift: "22px" },
  { id: 12, left: "94%", size: "h-1 w-1", delay: "1.9s", duration: "18.5s", opacity: "opacity-30", drift: "-26px" },
];

function mapAuthError(error: AuthError): string {
  const message = error.message.trim();
  return message.length > 0 ? message : "Não foi possível autenticar agora.";
}

async function fetchAuthenticatedProfile(userId: string): Promise<PortalProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, nome_linhagem, status_altar")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function SacredPhoenixLogo({ tone }: { tone: PortalTone }) {
  const atmosphere = modeAtmosphere[tone];

  return (
    <div className="relative grid size-48 place-items-center">
      <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${atmosphere.aura} blur-3xl opacity-80`} />
      <svg
        viewBox="0 0 240 240"
        aria-label="Logotipo linear sagrado da Fênix"
        className="relative size-36 animate-[fenyxia-pulse_1s_ease-in-out_infinite] fill-none filter drop-shadow-[0_0_16px_rgba(234,88,12,0.38)] will-change-transform sm:size-40"
      >
        <circle cx="120" cy="120" r="88" stroke={atmosphere.logoStroke} strokeOpacity="0.18" strokeWidth="1" />
        <circle cx="120" cy="120" r="62" stroke={atmosphere.logoSecondaryStroke} strokeOpacity="0.18" strokeWidth="1" />
        <path d="M120 18 144 82 212 92 160 136 176 204 120 168 64 204 80 136 28 92 96 82 120 18Z" stroke={atmosphere.logoStroke} strokeOpacity="0.32" strokeWidth="1" />
        <path d="M120 34c18 32 8 54-10 78 22-13 36-36 38-64 31 31 44 82 14 122-14 18-29 32-42 42-13-10-28-24-42-42-30-40-17-91 14-122 2 28 16 51 38 64-18-24-28-46-10-78Z" stroke={atmosphere.logoStroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M120 82c13 18 12 35 2 53 13-6 22-20 24-36 19 24 12 57-26 91-38-34-45-67-26-91 2 16 11 30 24 36-10-18-11-35 2-53Z" stroke={atmosphere.logoSecondaryStroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 128c27-10 46-7 65 12 19-19 38-22 65-12" stroke={atmosphere.logoSecondaryStroke} strokeOpacity="0.62" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M82 72 120 140 158 72M78 174h84M96 194h48" stroke={atmosphere.logoStroke} strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round" />
        <path d="M120 18v194M28 92h184M64 204 176 36M176 204 64 36" stroke={atmosphere.logoStroke} strokeOpacity="0.08" strokeWidth="1" />
        <circle cx="120" cy="140" r="4" fill={atmosphere.logoSecondaryStroke} fillOpacity="0.85" stroke="none" />
      </svg>
    </div>
  );
}

function EmberCurtain({ tone }: { tone: PortalTone }) {
  const atmosphere = modeAtmosphere[tone];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {emberParticles.map((particle, index) => {
        const style: EmberParticleStyle = {
          left: particle.left,
          animationDelay: particle.delay,
          "--duration": particle.duration,
          "--drift": particle.drift,
        };

        return (
          <span
            key={particle.id}
            className={`absolute bottom-[-2rem] ${particle.size} ${particle.opacity} ${index % 2 === 0 ? atmosphere.particlePrimary : atmosphere.particleSecondary
              } animate-[ember-rise_var(--duration)_linear_infinite] rounded-[2px] blur-[0.2px] will-change-transform`}
            style={style}
          />
        );
      })}
    </div>
  );
}

const FORGE_IGNITION_KEY = "MECCA-VIP-FORGE";
const SUPREME_MASTER_EMAIL = "master@meccafit.com";

export default function PortalDeBrasaLuxuryEssay() {
  const [mode, setMode] = useState<PortalMode>("login_cliente");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgeCode, setForgeCode] = useState("");
  const [forjadorName, setForjadorName] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [lineageName, setLineageName] = useState("");
  const [focused, setFocused] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PortalFeedback>({
    status: "idle",
    message: "Aproxime-se do altar para reacender sua jornada.",
  });

  const isLoginMode = mode === "login_cliente";
  const isIgnitionMode = mode === "ignicao_forja";
  const isForgeRegisterMode = mode === "cadastro_forja";
  const tone: PortalTone = isLoginMode ? "cliente" : "forja";
  const atmosphere = modeAtmosphere[tone];
  const isLoading = feedback.status === "loading";
  const normalizedLoginEmail = email.trim().toLowerCase();
  const isSupremeMaster = normalizedLoginEmail === SUPREME_MASTER_EMAIL;
  const clienteInviteLocked = isLoginMode && !inviteToken && !isSupremeMaster;
  const submitLabel = isLoading
    ? "PROCESSANDO..."
    : isForgeRegisterMode
      ? "Iniciar Inscrição"
      : "REACENDER MINHA CHAMA";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite")?.trim();
    setInviteToken(invite && invite.length > 0 ? invite : null);
  }, []);

  const cardClassName = useMemo(
    () =>
      `w-full ${isForgeRegisterMode ? "max-w-2xl" : "max-w-xl"} rounded-[2.25rem] border bg-black/60 p-7 text-center backdrop-blur-2xl transition-all duration-700 ${atmosphere.card} sm:p-11`,
    [atmosphere.card, isForgeRegisterMode],
  );

  const resetForgeState = useCallback(() => {
    setForgeCode("");
    setForjadorName("");
    setCorporateEmail("");
    setLineageName("");
  }, []);

  const returnToLogin = useCallback(() => {
    setMode("login_cliente");
    resetForgeState();
    setFeedback({
      status: "idle",
      message: "Cliente, administrador ou Dono Supremo acessam pelo altar principal.",
    });
  }, [resetForgeState]);

  const startForgeIgnition = useCallback(() => {
    setMode("ignicao_forja");
    resetForgeState();
    setFeedback({
      status: "idle",
      message: "Insira a Chave de Ignição da Forja.",
    });
  }, [resetForgeState]);

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
  }

  function handleForgeCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setForgeCode(value);

    if (value.trim() === FORGE_IGNITION_KEY) {
      setMode("cadastro_forja");
      setFeedback({
        status: "success",
        message: "Forja ativada. Informe os dados da sua Linhagem.",
      });
    }
  }

  function handleForjadorNameChange(event: ChangeEvent<HTMLInputElement>) {
    setForjadorName(event.target.value);
  }

  function handleCorporateEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setCorporateEmail(event.target.value);
  }

  function handleLineageNameChange(event: ChangeEvent<HTMLInputElement>) {
    setLineageName(event.target.value);
  }

  async function handleLoginSubmit() {
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      setFeedback({ status: "error", message: "Informe o e-mail de acesso." });
      return;
    }

    if (!normalizedPassword) {
      setFeedback({ status: "error", message: "Informe a senha de teste. Use senha123 para os usuários criados no Supabase." });
      return;
    }

    if (clienteInviteLocked) {
      setFeedback({ status: "error", message: "Apenas Linhagens Selecionadas possuem acesso ao Altar." });
      return;
    }

    setFeedback({ status: "loading", message: "Abrindo o Portal de Brasa..." });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (!error && data.user) {
        await fetchAuthenticatedProfile(data.user.id);
      }

      setFeedback(
        error
          ? { status: "error", message: mapAuthError(error) }
          : { status: "success", message: "Acesso confirmado. O altar reconheceu sua presença." },
      );
    } catch {
      setFeedback({ status: "error", message: "Falha inesperada de autenticação. Tente novamente." });
    }
  }

  async function handleForgeRegistrationSubmit() {
    const normalizedForjadorName = forjadorName.trim();
    const normalizedCorporateEmail = corporateEmail.trim();
    const normalizedLineageName = lineageName.trim();

    if (!normalizedForjadorName || !normalizedCorporateEmail || !normalizedLineageName) {
      setFeedback({
        status: "error",
        message: "Preencha Nome, E-mail Corporativo e Nome da Linhagem.",
      });
      return;
    }

    setFeedback({
      status: "loading",
      message: "Iniciando ingestão segura no Supabase...",
    });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedCorporateEmail,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: normalizedForjadorName,
            nome_linhagem: normalizedLineageName,
            role: "forjador",
          },
        },
      });

      setFeedback(
        error
          ? { status: "error", message: mapAuthError(error) }
          : { status: "success", message: "Ingestão iniciada. Verifique o e-mail corporativo para concluir a ativação." },
      );
    } catch {
      setFeedback({ status: "error", message: "Falha inesperada ao iniciar o cadastro da Forja." });
    }
  }

  async function handlePortalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isIgnitionMode) {
      setFeedback({
        status: "error",
        message: "Digite a Chave de Ignição correta para liberar o cadastro.",
      });
      return;
    }

    if (isForgeRegisterMode) {
      await handleForgeRegistrationSubmit();
      return;
    }

    await handleLoginSubmit();
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-black px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,158,11,0.09),rgba(0,0,0,0.78)_45%,#000_82%)]" />
      <div
        className={`pointer-events-none absolute inset-x-[-20%] bottom-[-28%] h-[52vh] bg-gradient-to-t ${atmosphere.aura} blur-3xl transition duration-700 ${focused ? "scale-105 opacity-80" : "scale-95 opacity-45"
          }`}
      />
      <EmberCurtain tone={tone} />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center justify-between">
        <header className="pt-1 text-center">
          <p className="font-serif text-sm font-semibold uppercase tracking-[0.25em] text-amber-500 sm:text-base">
            MECCAFIT CENTER
          </p>
        </header>

        <form onSubmit={handlePortalSubmit} className={cardClassName}>
          <div className="mx-auto flex max-w-md flex-col items-center">
            <SacredPhoenixLogo tone={tone} />

            <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-wide text-white sm:text-6xl">
              {isLoginMode ? (
                <>
                  DEIXE O ONTEM PARA TRÁS.
                  <span className="mt-3 block bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    RENASÇA HOJE.
                  </span>
                </>
              ) : (
                <>
                  Ative a sua
                  <span className="mt-3 block bg-gradient-to-r from-slate-100 via-blue-100 to-slate-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    Forja.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-6 text-sm tracking-[0.12em] text-neutral-500">
              {isLoginMode ? "Pronto para queimar os velhos hábitos?" : "A Forja responde apenas à chave correta."}
            </p>

            {isLoginMode ? (
              <div className="mt-8 flex w-full flex-col gap-4">
                <div className="w-full">
                  <label htmlFor="portal-email" className={`mb-2 block text-left text-[10px] uppercase tracking-[0.3em] ${atmosphere.accent}`}>
                    E-mail de acesso
                  </label>
                  <input
                    id="portal-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="cliente@meccafit.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/75 px-5 py-4 text-sm text-white outline-none transition duration-300 placeholder:text-neutral-700 focus:border-amber-400/50 focus:bg-black/95 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="w-full">
                  <label htmlFor="portal-password" className={`mb-2 block text-left text-[10px] uppercase tracking-[0.3em] ${atmosphere.accent}`}>
                    Senha de acesso
                  </label>
                  <input
                    id="portal-password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="senha123"
                    className="w-full rounded-2xl border border-amber-400/15 bg-white/[0.025] px-5 py-4 text-sm text-amber-100 outline-none transition duration-300 placeholder:text-neutral-700 focus:border-amber-400/50 focus:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            ) : null}

            {isIgnitionMode ? (
              <div className="mt-8 w-full">
                <label htmlFor="forge-code" className="mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-blue-100">
                  Insira a Chave de Ignição da Forja
                </label>
                <input
                  id="forge-code"
                  type="text"
                  value={forgeCode}
                  onChange={handleForgeCodeChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={isLoading}
                  placeholder="MECCA-VIP-FORGE"
                  className="w-full rounded-2xl border border-blue-100/15 bg-black/75 px-5 py-4 text-sm text-white outline-none transition duration-300 placeholder:text-neutral-700 focus:border-blue-200/50 focus:bg-black/95 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            ) : null}

            {isForgeRegisterMode ? (
              <div className="mt-8 grid w-full grid-rows-[1fr] opacity-100 transition-all duration-700 ease-out">
                <div className="overflow-hidden">
                  <div className="forge-reveal flex flex-col gap-4 rounded-3xl border border-blue-100/10 bg-white/[0.025] p-4">
                    <div className="w-full">
                      <label htmlFor="forjador-name" className="mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-blue-100">
                        Nome do Forjador
                      </label>
                      <input
                        id="forjador-name"
                        type="text"
                        value={forjadorName}
                        onChange={handleForjadorNameChange}
                        disabled={isLoading}
                        placeholder="Ex: Aurelius"
                        className="w-full rounded-2xl border border-blue-100/15 bg-black/75 px-5 py-4 text-sm text-white outline-none transition duration-300 placeholder:text-neutral-700 focus:border-blue-200/50 focus:bg-black/95 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="corporate-email" className="mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-blue-100">
                        E-mail Corporativo
                      </label>
                      <input
                        id="corporate-email"
                        type="email"
                        value={corporateEmail}
                        onChange={handleCorporateEmailChange}
                        disabled={isLoading}
                        placeholder="forjador@meccafit.com"
                        className="w-full rounded-2xl border border-blue-100/15 bg-black/75 px-5 py-4 text-sm text-white outline-none transition duration-300 placeholder:text-neutral-700 focus:border-blue-200/50 focus:bg-black/95 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="lineage-name" className="mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-blue-100">
                        Nome da Linhagem
                      </label>
                      <input
                        id="lineage-name"
                        type="text"
                        value={lineageName}
                        onChange={handleLineageNameChange}
                        disabled={isLoading}
                        placeholder="Ex: Linhagem Brasa Real"
                        className="w-full rounded-2xl border border-blue-100/15 bg-black/75 px-5 py-4 text-sm text-white outline-none transition duration-300 placeholder:text-neutral-700 focus:border-blue-200/50 focus:bg-black/95 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {clienteInviteLocked ? (
              <p className="mt-4 rounded-2xl border border-orange-500/15 bg-orange-950/10 p-3 text-center text-xs leading-5 text-orange-200/80">
                Apenas Linhagens Selecionadas possuem acesso ao Altar. O Dono Supremo pode acessar com e-mail administrativo.
              </p>
            ) : null}

            {!isIgnitionMode ? (
              <button
                type="submit"
                disabled={isLoading}
                className={`mt-4 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${isLoginMode
                  ? "bg-gradient-to-r from-orange-600 to-amber-500 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)]"
                  : "bg-gradient-to-r from-white via-blue-100 to-slate-300 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.38),0_0_52px_rgba(147,197,253,0.28)]"
                  }`}
              >
                {submitLabel}
              </button>
            ) : null}

            <p
              role="status"
              className={`mt-5 min-h-10 text-center text-xs leading-5 transition-colors ${feedback.status === "error"
                ? "text-red-300"
                : feedback.status === "success"
                  ? "text-emerald-300"
                  : feedback.status === "loading"
                    ? atmosphere.accent
                    : "text-neutral-600"
                }`}
            >
              {feedback.message}
            </p>

            {isLoginMode ? (
              <button
                type="button"
                onClick={startForgeIgnition}
                className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-blue-100 hover:underline"
              >
                Sou um Forjador (Ativar Minha Forja)
              </button>
            ) : (
              <button
                type="button"
                onClick={returnToLogin}
                disabled={isLoading}
                className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Voltar para o Altar
              </button>
            )}
          </div>
        </form>

        <footer className="pb-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-neutral-700 transition duration-300 hover:text-amber-500 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            POWERED BY FENYXIA
          </p>
        </footer>
      </section>
    </main>
  );
}
