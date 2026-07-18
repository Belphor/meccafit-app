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
import ReactDOM from "react-dom";
import {
  PortalBurnSubmitButton,
  waitPortalBurn,
} from "@/components/portal/PortalBurnSubmitButton";
import { FENYXIA_LOGO_SRC } from "@/components/onboarding/LogoSplashStep";
import { PortalEmberCurtain } from "@/components/portal/PortalEmberCurtain";
import { PortalToast, type PortalToastVariant } from "@/components/portal/PortalToast";
import { PrimeiroAcessoFenyxiaPanel } from "@/components/portal/PrimeiroAcessoFenyxiaPanel";
import { PortalPasswordField } from "@/components/portal/PortalPasswordField";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { SacredPhoenixLogo, type PhoenixTone } from "@/components/SacredPhoenixLogo";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { signInPortal } from "@/app/actions/portal-login";
import { registerCliente } from "@/app/actions/onboarding";
import type { PrimeiroAcessoInput } from "@/lib/portal-onboarding";
import { PORTAL_COPY } from "@/lib/portal-copy";
import {
  clearRememberedCredentials,
  loadRememberedCredentials,
  saveRememberedCredentials,
} from "@/lib/portal-remember-credentials";
import {
  modeAtmosphere,
  PORTAL_BRAND_HEADER,
  PORTAL_BRAND_TO_CARD_GAP,
  PORTAL_BRASAO_PULSE,
  PORTAL_FORM_ATTRS,
  PORTAL_INPUT,
  PORTAL_LABEL,
  PORTAL_LOGIN_CARD,
  PORTAL_PASSWORD_MANAGER_ATTRS,
  PORTAL_SHELL,
} from "@/lib/portal-theme";
import { ONBOARDING_ROUTE } from "@/lib/onboarding-terms";
import { unlockAnimaAudioPlayback } from "@/lib/anima-audio-controller";
import { supabase } from "@/lib/supabase";

type PortalMode = "login_cliente" | "criar_conta";
type PortalStatus = "idle" | "loading" | "success" | "error";

type PortalFeedback = {
  status: PortalStatus;
  message: string;
};

const EMPTY_ONBOARDING: PrimeiroAcessoInput = {
  email: "",
  password: "",
  fullName: "",
};

function SacredPhoenixLogoPortal({ tone }: { tone: PhoenixTone }) {
  return (
    <div className={PORTAL_BRASAO_PULSE}>
      <SacredPhoenixLogo tone={tone} variant="login" />
    </div>
  );
}

type PortalDeBrasaClientProps = {
  initialMode?: PortalMode;
};

export function PortalDeBrasaClient({ initialMode = "login_cliente" }: PortalDeBrasaClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PortalMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [onboarding, setOnboarding] = useState<PrimeiroAcessoInput>(EMPTY_ONBOARDING);
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState<PortalFeedback>({
    status: "idle",
    message: initialMode === "criar_conta" ? PORTAL_COPY.onboardingSubtitle : PORTAL_COPY.loginIdle,
  });
  const [toast, setToast] = useState<{ message: string; variant: PortalToastVariant } | null>(
    null,
  );
  const [isBurning, setIsBurning] = useState(false);

  const isCriarContaMode = mode === "criar_conta";
  const isLoginMode = mode === "login_cliente";
  const atmosphere = modeAtmosphere.cliente;
  const isLoading = feedback.status === "loading" || isBurning;

  const dismissToast = useCallback(() => setToast(null), []);
  const showPortalToast = useCallback((message: string, variant: PortalToastVariant = "error") => {
    setToast({ message, variant });
  }, []);

  useEffect(() => {
    // Credenciais lembradas só existem no cliente; aplicar após montar evita
    // divergência de hidratação com o HTML renderizado no servidor (campos vazios).
    const saved = loadRememberedCredentials("cliente");
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberCredentials(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("suspended") !== "1") return;
    void supabase.auth.signOut().finally(() => {
      showPortalToast(PORTAL_COPY.loginAccountSuspended);
      window.history.replaceState({}, "", "/");
    });
  }, [showPortalToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("portal") === "forja") {
      router.replace("/forja");
    }
  }, [router]);

  const submitLabel = isBurning
    ? PORTAL_COPY.submitLogin
    : isLoading
      ? PORTAL_COPY.submitProcessing
      : isCriarContaMode
        ? PORTAL_COPY.submitOnboarding
        : PORTAL_COPY.submitLogin;

  const cardClassName = useMemo(
    () => `${PORTAL_LOGIN_CARD} max-w-xl transition-all duration-700 ${atmosphere.card}`,
    [atmosphere.card],
  );

  const handleOnboardingFieldChange = useCallback(
    (field: keyof PrimeiroAcessoInput, value: string) => {
      setOnboarding((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const goToCriarConta = useCallback(() => {
    setMode("criar_conta");
    setFeedback({ status: "idle", message: PORTAL_COPY.onboardingSubtitle });
    router.replace("/criar-conta");
  }, [router]);

  const goToLogin = useCallback(() => {
    setMode("login_cliente");
    setFeedback({ status: "idle", message: PORTAL_COPY.loginIdle });
    router.replace("/");
  }, [router]);

  async function handleCriarContaSubmit() {
    setFeedback({ status: "loading", message: PORTAL_COPY.onboardingProcessing });
    setToast(null);
    const result = await registerCliente(onboarding);
    if (!result.ok) {
      setFeedback({ status: "error", message: result.message });
      showPortalToast(result.message, "error");
      return;
    }
    setFeedback({ status: "loading", message: PORTAL_COPY.onboardingSuccess });
    showPortalToast(PORTAL_COPY.onboardingSuccess, "success");
    router.replace(ONBOARDING_ROUTE);
  }

  async function handleLoginSubmit() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFeedback({ status: "idle", message: PORTAL_COPY.loginIdle });
      showPortalToast("Informe o e-mail de acesso.");
      return;
    }
    if (!password.trim()) {
      setFeedback({ status: "idle", message: PORTAL_COPY.loginIdle });
      showPortalToast(PORTAL_COPY.loginPasswordHint);
      return;
    }

    setIsBurning(true);
    setFeedback({ status: "loading", message: PORTAL_COPY.loginBurning });
    setToast(null);
    // A barra de brasa dura ~2.8s: aproveita para pré-carregar o logo da
    // cerimônia (LogoSplashStep) e evitar o flash quando o splash monta.
    ReactDOM.preload(FENYXIA_LOGO_SRC, { as: "image" });
    // Libera HTMLAudio no gesto do login — a saudação do dashboard usa isso.
    unlockAnimaAudioPlayback();

    const burnPromise = waitPortalBurn();

    try {
      const result = await signInPortal(normalizedEmail, password, "cliente");
      if (!result.ok) {
        setIsBurning(false);
        setFeedback({ status: "idle", message: PORTAL_COPY.loginIdle });
        showPortalToast(result.message);
        return;
      }

      if (rememberCredentials) {
        saveRememberedCredentials("cliente", { email: normalizedEmail, password });
      } else {
        clearRememberedCredentials("cliente");
      }

      await burnPromise;
      setFeedback({ status: "loading", message: PORTAL_COPY.loginConfirmed });
      router.replace(result.destination);
    } catch {
      setIsBurning(false);
      setFeedback({ status: "idle", message: PORTAL_COPY.loginIdle });
      showPortalToast(PORTAL_COPY.loginActionFailedCliente);
    }
  }

  async function handlePortalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCriarContaMode) {
      await handleCriarContaSubmit();
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
        className={`pointer-events-none absolute inset-x-[-20%] bottom-[-28%] h-[52vh] bg-gradient-to-t ${atmosphere.aura} blur-3xl transition duration-700 ${
          focused ? "scale-105 opacity-70" : "scale-95 opacity-40"
        }`}
      />
      <PortalEmberCurtain tone="cliente" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col items-center justify-between">
        <header className={PORTAL_BRAND_HEADER}>
          <MeccafitCenterBrand variant="portal" />
        </header>

        <form
          onSubmit={handlePortalSubmit}
          className={`${PORTAL_BRAND_TO_CARD_GAP} ${cardClassName}`}
          {...PORTAL_FORM_ATTRS}
        >
          <div className="mx-auto flex max-w-md flex-col items-center">
            <SacredPhoenixLogoPortal tone="cliente" />

            <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-wide text-white sm:text-6xl">
              {isCriarContaMode ? (
                <>
                  {PORTAL_COPY.onboardingTitle}
                  <span className="mt-3 block bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    {PORTAL_COPY.onboardingHighlight}
                  </span>
                </>
              ) : (
                <>
                  {PORTAL_COPY.leaveYesterday}
                  <span className="mt-3 block bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-semibold text-transparent sm:text-5xl">
                    {PORTAL_COPY.rebirthToday}
                  </span>
                </>
              )}
            </h1>

            <p className="mt-6 text-sm tracking-[0.12em] text-neutral-500">
              {isCriarContaMode ? PORTAL_COPY.onboardingSubtitle : PORTAL_COPY.loginSubtitle}
            </p>

            {isCriarContaMode ? (
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
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="Digite seu email"
                    className={PORTAL_INPUT}
                    name="access-email"
                    inputMode="email"
                    {...PORTAL_PASSWORD_MANAGER_ATTRS}
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="portal-password" className={PORTAL_LABEL}>
                    Senha de acesso
                  </label>
                  <PortalPasswordField
                    id="portal-password"
                    value={password}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setPassword(event.target.value)
                    }
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={isLoading}
                    placeholder="Digite sua senha"
                  />
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-left text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={rememberCredentials}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const checked = event.target.checked;
                      setRememberCredentials(checked);
                      if (!checked) clearRememberedCredentials("cliente");
                    }}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-neutral-700 bg-black accent-amber-500"
                  />
                  <span>{PORTAL_COPY.rememberCredentials}</span>
                </label>
              </div>
            ) : null}

            {isCriarContaMode ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleCriarContaSubmit()}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitLabel}
              </button>
            ) : (
              <PortalBurnSubmitButton
                tone="cliente"
                label={submitLabel}
                burning={isBurning}
                disabled={isLoading && !isBurning}
                onClick={() => void handleLoginSubmit()}
              />
            )}

            <p
              role="status"
              className={`mt-5 min-h-10 text-center text-xs leading-5 transition-colors ${
                feedback.status === "error"
                  ? "text-red-300"
                  : feedback.status === "loading"
                    ? atmosphere.accent
                    : "text-neutral-600"
              }`}
            >
              {feedback.message}
            </p>

            {isCriarContaMode ? (
              <button
                type="button"
                onClick={goToLogin}
                disabled={isLoading}
                className="mt-2 inline-flex min-h-11 items-center justify-center text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PORTAL_COPY.onboardingAlreadyHaveAccount}
              </button>
            ) : null}

            {isLoginMode ? (
              <>
                <button
                  type="button"
                  onClick={goToCriarConta}
                  disabled={isLoading}
                  className="mt-2 inline-flex min-h-11 items-center justify-center text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PORTAL_COPY.createAccountCta}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/forja")}
                  className="mt-2 inline-flex min-h-11 items-center justify-center text-xs text-neutral-600 underline-offset-4 transition hover:text-blue-100 hover:underline"
                >
                  {PORTAL_COPY.forjaLoginCta}
                </button>
              </>
            ) : null}
          </div>
        </form>

        <FenyxiaBrandFooter className="border-t-0 pt-4 pb-1" />
      </section>
    </main>
  );
}
