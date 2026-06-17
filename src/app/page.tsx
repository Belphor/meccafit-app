"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  checkForgeIgnitionAvailable,
  validateForgeIgnitionKey,
} from "@/app/actions/forge-ignition";
import { requestForjadorCadastroOtp } from "@/app/actions/forge-registration";
import { PortalEmberCurtain } from "@/components/portal/PortalEmberCurtain";
import { PortalToast, type PortalToastVariant } from "@/components/portal/PortalToast";
import { PrimeiroAcessoFenyxiaPanel } from "@/components/portal/PrimeiroAcessoFenyxiaPanel";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { SacredPhoenixLogo, type PhoenixTone } from "@/components/SacredPhoenixLogo";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { fetchAuthenticatedProfile, mapAuthError } from "@/lib/portal-auth";
import { validateInviteToken } from "@/app/actions/invite-onboarding";
import { registerPrimeiroAcesso } from "@/app/actions/onboarding";
import type { PrimeiroAcessoInput } from "@/lib/portal-onboarding";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  modeAtmosphere,
  PORTAL_BRAND_HEADER,
  PORTAL_BRAND_TO_CARD_GAP,
  PORTAL_BRASAO_PULSE,
  PORTAL_FORJA_LABEL,
  PORTAL_INPUT,
  PORTAL_LABEL,
  PORTAL_LOGIN_CARD,
  PORTAL_SHELL,
  type PortalTone,
} from "@/lib/portal-theme";
import { resolveClienteDashboardRoute, resolvePostLoginRoute } from "@/lib/internal-routes";
import { supabase } from "@/lib/supabase";

type PortalMode = "login_cliente" | "primeiro_acesso" | "ignicao_forja" | "cadastro_forja";
type PortalStatus = "idle" | "loading" | "success" | "error";

type PortalFeedback = {
  status: PortalStatus;
  message: string;
};

type PortalToastState = {
  message: string;
  variant: PortalToastVariant;
};

const EMPTY_ONBOARDING: PrimeiroAcessoInput = {
  email: "",
  password: "",
  fullName: "",
  birthDate: "",
};

function SacredPhoenixLogoPortal({ tone }: { tone: PhoenixTone }) {
  return (
    <div className={PORTAL_BRASAO_PULSE}>
      <SacredPhoenixLogo tone={tone} variant="login" />
    </div>
  );
}

export default function PortalDeBrasaPage() {
  const router = useRouter();
  const dashboardRoute = resolveClienteDashboardRoute();
  const [inviteToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const invite = new URLSearchParams(window.location.search).get("invite")?.trim();
    return invite && invite.length > 0 ? invite : null;
  });
  const [mode, setMode] = useState<PortalMode>(() =>
    inviteToken ? "primeiro_acesso" : "login_cliente",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [onboarding, setOnboarding] = useState<PrimeiroAcessoInput>(EMPTY_ONBOARDING);
  const [forgeCode, setForgeCode] = useState("");
  const [forjadorName, setForjadorName] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [lineageName, setLineageName] = useState("");
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState<PortalFeedback>({
    status: "idle",
    message: inviteToken ? PORTAL_COPY.onboardingSubtitle : PORTAL_COPY.loginIdle,
  });
  const [toast, setToast] = useState<PortalToastState | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showPortalToast = useCallback((message: string, variant: PortalToastVariant = "error") => {
    setToast({ message, variant });
  }, []);

  const resetLoginFeedback = useCallback(() => {
    setFeedback({
      status: "idle",
      message: PORTAL_COPY.loginIdle,
    });
  }, []);

  const isLoginMode = mode === "login_cliente";
  const isPrimeiroAcessoMode = mode === "primeiro_acesso";
  const isIgnitionMode = mode === "ignicao_forja";
  const isForgeRegisterMode = mode === "cadastro_forja";
  const tone: PortalTone = isLoginMode || isPrimeiroAcessoMode ? "cliente" : "forja";
  const atmosphere = modeAtmosphere[tone];
  const isLoading = feedback.status === "loading";

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;

    void validateInviteToken(inviteToken).then((result) => {
      if (cancelled || result.valid) return;
      setMode("login_cliente");
      setFeedback({ status: "error", message: result.message ?? PORTAL_COPY.onboardingInviteInvalid });
    });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const submitLabel = isLoading
    ? PORTAL_COPY.submitProcessing
    : isPrimeiroAcessoMode
      ? PORTAL_COPY.submitOnboarding
      : isIgnitionMode
        ? PORTAL_COPY.submitValidateForge
        : isForgeRegisterMode
          ? PORTAL_COPY.submitRegister
          : PORTAL_COPY.submitLogin;

  const cardClassName = useMemo(
    () =>
      `${PORTAL_LOGIN_CARD} ${isForgeRegisterMode ? "max-w-2xl" : "max-w-xl"} transition-all duration-700 ${atmosphere.card}`,
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
      message: PORTAL_COPY.loginAltarAccess,
    });
  }, [resetForgeState]);

  const handleOnboardingFieldChange = useCallback(
    (field: keyof PrimeiroAcessoInput, value: string) => {
      setOnboarding((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const startForgeIgnition = useCallback(async () => {
    setFeedback({ status: "loading", message: PORTAL_COPY.forgeValidating });

    try {
      const { configured } = await checkForgeIgnitionAvailable();
      if (!configured) {
        setFeedback({ status: "error", message: PORTAL_COPY.forgeNotConfigured });
        return;
      }

      setMode("ignicao_forja");
      resetForgeState();
      setFeedback({
        status: "idle",
        message: PORTAL_COPY.forgeKeyPrompt,
      });
    } catch {
      setFeedback({ status: "error", message: PORTAL_COPY.forgeNotConfigured });
    }
  }, [resetForgeState]);

  async function handleIgnitionSubmit() {
    const normalizedCode = forgeCode.trim();
    if (!normalizedCode) {
      setFeedback({ status: "error", message: PORTAL_COPY.forgeKeyInvalid });
      return;
    }

    setFeedback({ status: "loading", message: PORTAL_COPY.forgeValidating });

    try {
      const result = await validateForgeIgnitionKey(normalizedCode);
      if (!result.configured) {
        setFeedback({ status: "error", message: PORTAL_COPY.forgeNotConfigured });
        return;
      }

      if (!result.valid) {
        setFeedback({ status: "error", message: PORTAL_COPY.forgeKeyInvalid });
        return;
      }

      setMode("cadastro_forja");
      setFeedback({
        status: "success",
        message: PORTAL_COPY.forgeActivated,
      });
    } catch {
      setFeedback({ status: "error", message: PORTAL_COPY.forgeKeyInvalid });
    }
  }

  async function handlePrimeiroAcessoSubmit() {
    if (!inviteToken) return;

    setFeedback({ status: "loading", message: PORTAL_COPY.onboardingProcessing });

    const result = await registerPrimeiroAcesso(inviteToken, onboarding);

    if (!result.ok) {
      setFeedback({ status: "error", message: result.message });
      return;
    }

    setFeedback({ status: "loading", message: PORTAL_COPY.onboardingSuccess });
    router.replace(dashboardRoute);
  }

  async function handleLoginSubmit() {
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      resetLoginFeedback();
      showPortalToast("Informe o e-mail de acesso.");
      return;
    }

    if (!normalizedPassword) {
      resetLoginFeedback();
      showPortalToast(PORTAL_COPY.loginPasswordHint);
      return;
    }

    setFeedback({ status: "loading", message: PORTAL_COPY.loginOpening });
    setToast(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        resetLoginFeedback();
        showPortalToast(mapAuthError(error));
        return;
      }

      if (!data.user) {
        resetLoginFeedback();
        showPortalToast(PORTAL_COPY.loginSessionError);
        return;
      }

      const profile = await fetchAuthenticatedProfile(data.user.id);

      if (!profile) {
        await supabase.auth.signOut();
        resetLoginFeedback();
        showPortalToast(PORTAL_COPY.loginProfileMissing);
        return;
      }

      const destination = resolvePostLoginRoute(profile.role);

      if (!destination) {
        await supabase.auth.signOut();
        resetLoginFeedback();
        showPortalToast(PORTAL_COPY.loginRoleUnauthorized);
        return;
      }

      setFeedback({ status: "loading", message: PORTAL_COPY.loginConfirmed });

      if (profile.role === "forjador_soberano") {
        router.push(destination);
        return;
      }

      router.replace(destination);
    } catch {
      resetLoginFeedback();
      showPortalToast(PORTAL_COPY.loginDbError);
    }
  }

  async function handleForgeRegistrationSubmit() {
    const normalizedForjadorName = forjadorName.trim();
    const normalizedCorporateEmail = corporateEmail.trim();
    const normalizedLineageName = lineageName.trim();

    if (!normalizedForjadorName || !normalizedCorporateEmail || !normalizedLineageName) {
      setFeedback({ status: "error", message: PORTAL_COPY.forgeRegisterIncomplete });
      return;
    }

    setFeedback({ status: "loading", message: PORTAL_COPY.forgeRegisterLoading });

    try {
      const result = await requestForjadorCadastroOtp({
        forgeKey: forgeCode.trim(),
        email: normalizedCorporateEmail,
        forjadorName: normalizedForjadorName,
        lineageName: normalizedLineageName,
      });

      setFeedback(
        result.ok
          ? { status: "success", message: result.message }
          : { status: "error", message: result.message },
      );
    } catch {
      setFeedback({ status: "error", message: PORTAL_COPY.forgeRegisterError });
    }
  }

  async function handlePortalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPrimeiroAcessoMode) {
      await handlePrimeiroAcessoSubmit();
      return;
    }

    if (isIgnitionMode) {
      await handleIgnitionSubmit();
      return;
    }

    if (isForgeRegisterMode) {
      await handleForgeRegistrationSubmit();
      return;
    }

    await handleLoginSubmit();
  }

  return (
    <main className={PORTAL_SHELL}>
      <PortalToast
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "error"}
        visible={Boolean(toast)}
        onDismiss={dismissToast}
      />
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,158,11,0.06),rgba(0,0,0,0.82)_45%,#000_82%)]" />
      <div
        className={`pointer-events-none absolute inset-x-[-20%] bottom-[-28%] h-[52vh] bg-gradient-to-t ${atmosphere.aura} blur-3xl transition duration-700 ${focused ? "scale-105 opacity-70" : "scale-95 opacity-40"
          }`}
      />
      <PortalEmberCurtain tone={tone} />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center justify-between">
        <header className={PORTAL_BRAND_HEADER}>
          <MeccafitCenterBrand variant="portal" />
        </header>

        <form onSubmit={handlePortalSubmit} className={`${PORTAL_BRAND_TO_CARD_GAP} ${cardClassName}`}>
          <div className="mx-auto flex max-w-md flex-col items-center">
            <SacredPhoenixLogoPortal tone={tone} />

            <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-wide text-white sm:text-6xl">
              {isPrimeiroAcessoMode ? (
                <>
                  {PORTAL_COPY.onboardingTitle}
                  <span className="mt-3 block bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    QR-Code Incandescente
                  </span>
                </>
              ) : isLoginMode ? (
                <>
                  {PORTAL_COPY.leaveYesterday}
                  <span className="mt-3 block bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    {PORTAL_COPY.rebirthToday}
                  </span>
                </>
              ) : (
                <>
                  {PORTAL_COPY.forgeActivateTitle}
                  <span className="mt-3 block bg-gradient-to-r from-slate-100 via-blue-100 to-slate-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    {PORTAL_COPY.forgeActivateHighlight}
                  </span>
                </>
              )}
            </h1>

            <p className="mt-6 text-sm tracking-[0.12em] text-neutral-500">
              {isPrimeiroAcessoMode
                ? PORTAL_COPY.onboardingSubtitle
                : isLoginMode
                  ? PORTAL_COPY.loginSubtitle
                  : PORTAL_COPY.forgeSubtitle}
            </p>

            {isPrimeiroAcessoMode ? (
              <PrimeiroAcessoFenyxiaPanel
                values={onboarding}
                disabled={isLoading}
                onChange={handleOnboardingFieldChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            ) : null}

            {isLoginMode ? (
              <div className="mt-8 flex w-full flex-col gap-4">
                <div className="w-full">
                  <label htmlFor="portal-email" className={PORTAL_LABEL}>
                    E-mail de acesso
                  </label>
                  <input
                    id="portal-email"
                    type="email"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="Digite seu email"
                    className={PORTAL_INPUT}
                    autoComplete="email"
                  />
                </div>

                <div className="w-full">
                  <label htmlFor="portal-password" className={PORTAL_LABEL}>
                    Senha de acesso
                  </label>
                  <input
                    id="portal-password"
                    type="password"
                    value={password}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="Digite sua senha"
                    className={PORTAL_INPUT}
                    autoComplete="current-password"
                  />
                </div>
              </div>
            ) : null}

            {isIgnitionMode ? (
              <div className="mt-8 w-full">
                <label htmlFor="forge-code" className={PORTAL_FORJA_LABEL}>
                  {PORTAL_COPY.forgeKeyPrompt}
                </label>
                <input
                  id="forge-code"
                  type="password"
                  value={forgeCode}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setForgeCode(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={isLoading}
                  placeholder={PORTAL_COPY.forgeKeyPlaceholder}
                  className={PORTAL_INPUT}
                  autoComplete="off"
                />
              </div>
            ) : null}

            {isForgeRegisterMode ? (
              <div className="mt-8 grid w-full grid-rows-[1fr] opacity-100 transition-all duration-700 ease-out">
                <div className="overflow-hidden">
                  <div className="forge-reveal flex flex-col gap-4 rounded-3xl border border-blue-100/10 bg-black/40 p-4">
                    <div className="w-full">
                      <label htmlFor="forjador-name" className={PORTAL_FORJA_LABEL}>
                        Nome do Forjador
                      </label>
                      <input
                        id="forjador-name"
                        type="text"
                        value={forjadorName}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setForjadorName(event.target.value)
                        }
                        disabled={isLoading}
                        placeholder="Ex: Aurelius"
                        className={PORTAL_INPUT}
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="corporate-email" className={PORTAL_FORJA_LABEL}>
                        E-mail Corporativo
                      </label>
                      <input
                        id="corporate-email"
                        type="email"
                        value={corporateEmail}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setCorporateEmail(event.target.value)
                        }
                        disabled={isLoading}
                        placeholder="forjador@meccafit.com"
                        className={PORTAL_INPUT}
                        autoComplete="email"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="lineage-name" className={PORTAL_FORJA_LABEL}>
                        Nome da Linhagem
                      </label>
                      <input
                        id="lineage-name"
                        type="text"
                        value={lineageName}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setLineageName(event.target.value)
                        }
                        disabled={isLoading}
                        placeholder="Ex: Linhagem Brasa Real"
                        className={PORTAL_INPUT}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className={`mt-4 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${isLoginMode || isPrimeiroAcessoMode
                  ? "bg-gradient-to-r from-orange-600 to-amber-500 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)]"
                  : "bg-gradient-to-r from-white via-blue-100 to-slate-300 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.38),0_0_52px_rgba(147,197,253,0.28)]"
                }`}
            >
              {submitLabel}
            </button>

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

            {isPrimeiroAcessoMode ? (
              <button
                type="button"
                onClick={() => router.replace("/")}
                disabled={isLoading}
                className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PORTAL_COPY.onboardingAlreadyHaveAccount}
              </button>
            ) : null}

            {isLoginMode ? (
              <button
                type="button"
                onClick={() => void startForgeIgnition()}
                className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-blue-100 hover:underline"
              >
                {PORTAL_COPY.forgeCta}
              </button>
            ) : null}

            {!isLoginMode && !isPrimeiroAcessoMode ? (
              <button
                type="button"
                onClick={returnToLogin}
                disabled={isLoading}
                className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PORTAL_COPY.forgeBackToAltar}
              </button>
            ) : null}
          </div>
        </form>

        <FenyxiaBrandFooter className="border-t-0 pt-4 pb-1" />
      </section>
    </main>
  );
}
