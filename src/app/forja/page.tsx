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
  PortalBurnSubmitButton,
  waitPortalBurn,
} from "@/components/portal/PortalBurnSubmitButton";
import { PortalEmberCurtain } from "@/components/portal/PortalEmberCurtain";
import { PortalToast, type PortalToastVariant } from "@/components/portal/PortalToast";
import { PortalPasswordField } from "@/components/portal/PortalPasswordField";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { SacredPhoenixLogo } from "@/components/SacredPhoenixLogo";
import { FenyxiaBrandFooter } from "@/components/FenyxiaBrandFooter";
import { signInPortal } from "@/app/actions/portal-login";
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

type PortalStatus = "idle" | "loading" | "error";

/**
 * Login exclusivo de Forjadores / Soberanos.
 * Contas são criadas só no Supabase — sem cadastro público.
 */
export default function ForjaLoginPage() {
  const router = useRouter();
  const atmosphere = modeAtmosphere.forja;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState<{ status: PortalStatus; message: string }>({
    status: "idle",
    message: PORTAL_COPY.forjaLoginIdle,
  });
  const [toast, setToast] = useState<{ message: string; variant: PortalToastVariant } | null>(
    null,
  );
  const [isBurning, setIsBurning] = useState(false);

  const isLoading = feedback.status === "loading" || isBurning;
  const cardClassName = useMemo(
    () => `${PORTAL_LOGIN_CARD} max-w-xl transition-all duration-700 ${atmosphere.card}`,
    [atmosphere.card],
  );

  const showToast = useCallback((message: string) => {
    setToast({ message, variant: "error" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", "/forja");
  }, []);

  useEffect(() => {
    // Credenciais lembradas só existem no cliente; aplicar após montar evita
    // divergência de hidratação com o HTML renderizado no servidor (campos vazios).
    const saved = loadRememberedCredentials("forja");
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberCredentials(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function performLogin() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFeedback({ status: "idle", message: PORTAL_COPY.forjaLoginIdle });
      showToast("Informe o e-mail de acesso.");
      return;
    }
    if (!password.trim()) {
      setFeedback({ status: "idle", message: PORTAL_COPY.forjaLoginIdle });
      showToast(PORTAL_COPY.forjaLoginPasswordHint);
      return;
    }

    setIsBurning(true);
    setFeedback({ status: "loading", message: PORTAL_COPY.forjaLoginBurning });
    setToast(null);

    const burnPromise = waitPortalBurn();

    try {
      const result = await signInPortal(normalizedEmail, password, "forjador");
      if (!result.ok) {
        setIsBurning(false);
        setFeedback({ status: "idle", message: PORTAL_COPY.forjaLoginIdle });
        showToast(result.message);
        return;
      }

      if (rememberCredentials) {
        saveRememberedCredentials("forja", { email: normalizedEmail, password });
      } else {
        clearRememberedCredentials("forja");
      }

      await burnPromise;
      setFeedback({ status: "loading", message: PORTAL_COPY.forjaLoginConfirmed });
      router.push(result.destination);
    } catch {
      setIsBurning(false);
      setFeedback({ status: "idle", message: PORTAL_COPY.forjaLoginIdle });
      showToast(PORTAL_COPY.loginActionFailedForja);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin();
  }

  const submitLabel = isBurning
    ? PORTAL_COPY.submitForjaLogin
    : isLoading
      ? PORTAL_COPY.submitProcessing
      : PORTAL_COPY.submitForjaLogin;

  return (
    <main className={PORTAL_SHELL}>
      <PortalToast
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "error"}
        visible={Boolean(toast)}
        onDismiss={() => setToast(null)}
      />
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,158,11,0.06),rgba(0,0,0,0.82)_45%,#000_82%)]" />
      <div
        className={`pointer-events-none absolute inset-x-[-20%] bottom-[-28%] h-[52vh] bg-gradient-to-t ${atmosphere.aura} blur-3xl transition duration-700 ${
          focused ? "scale-105 opacity-70" : "scale-95 opacity-40"
        }`}
      />
      <PortalEmberCurtain tone="forja" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col items-center justify-between">
        <header className={PORTAL_BRAND_HEADER}>
          <MeccafitCenterBrand variant="portal" />
        </header>

        <form
          onSubmit={handleSubmit}
          className={`${PORTAL_BRAND_TO_CARD_GAP} ${cardClassName}`}
          {...PORTAL_FORM_ATTRS}
        >
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className={PORTAL_BRASAO_PULSE}>
              <SacredPhoenixLogo tone="forja" variant="login" />
            </div>

            <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-wide text-white sm:text-6xl">
              {PORTAL_COPY.forjaLoginTitle}
              <span className="mt-3 block bg-gradient-to-r from-slate-100 via-blue-100 to-slate-500 bg-clip-text text-5xl font-semibold text-transparent sm:text-7xl">
                {PORTAL_COPY.forjaLoginHighlight}
              </span>
            </h1>

            <p className="mt-6 text-sm tracking-[0.12em] text-neutral-500">
              {PORTAL_COPY.forjaLoginSubtitle}
            </p>

            <div className="mt-8 flex w-full flex-col gap-4">
              <div className="w-full">
                <label htmlFor="forja-email" className={PORTAL_LABEL}>
                  E-mail de acesso
                </label>
                <input
                  id="forja-email"
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
                <label htmlFor="forja-password" className={PORTAL_LABEL}>
                  Senha de acesso
                </label>
                <PortalPasswordField
                  id="forja-password"
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
              <label className="flex cursor-pointer items-center gap-3 text-left text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={rememberCredentials}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const checked = event.target.checked;
                    setRememberCredentials(checked);
                    if (!checked) clearRememberedCredentials("forja");
                  }}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-neutral-700 bg-black accent-blue-300"
                />
                <span>{PORTAL_COPY.rememberCredentials}</span>
              </label>
            </div>

            <PortalBurnSubmitButton
              tone="forja"
              label={submitLabel}
              burning={isBurning}
              disabled={isLoading && !isBurning}
              onClick={() => void performLogin()}
            />

            <p
              role="status"
              className={`mt-5 min-h-10 text-center text-xs leading-5 ${
                feedback.status === "loading" ? atmosphere.accent : "text-neutral-600"
              }`}
            >
              {feedback.message}
            </p>

            <button
              type="button"
              onClick={() => router.replace("/")}
              disabled={isLoading}
              className="mt-2 text-xs text-neutral-600 underline-offset-4 transition hover:text-amber-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PORTAL_COPY.forjaBackToCliente}
            </button>
          </div>
        </form>

        <FenyxiaBrandFooter className="border-t-0 pt-4 pb-1" />
      </section>
    </main>
  );
}
