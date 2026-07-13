"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LogoSplashStep } from "@/components/onboarding/LogoSplashStep";
import { TermsStep } from "@/components/onboarding/TermsStep";
import { WarningManifestoStep } from "@/components/onboarding/WarningManifestoStep";
import { useOnboarding } from "@/hooks/useOnboarding";
import { resolveIgnitePayload } from "@/hooks/usePhoenixVoice";
import { prefetchAnimaTts } from "@/lib/anima-audio-controller";
import { CLIENTE_DASHBOARD_ROUTE } from "@/lib/internal-routes";

type CeremonyStep = "terms" | "splash" | "manifesto";

type OnboardingClientProps = {
  /** Diretrizes já aceitas — pula o passo e inicia no logo. */
  termsAccepted: boolean;
  /** Nome do perfil (ou vazio → Nova Chama na voz). */
  profileName: string;
};

export function OnboardingClient({ termsAccepted, profileName }: OnboardingClientProps) {
  const router = useRouter();
  const { completeOnboarding, error } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<CeremonyStep>(
    termsAccepted ? "splash" : "terms",
  );

  const goToSplash = useCallback(() => {
    setCurrentStep("splash");
  }, []);

  const goToManifesto = useCallback(() => {
    setCurrentStep("manifesto");
  }, []);

  /** Durante logo + manifesto, pré-carrega a narratividade do card intro (tier 1). */
  useEffect(() => {
    if (currentStep !== "splash" && currentStep !== "manifesto") return;

    const { text } = resolveIgnitePayload({
      tier: 1,
      fullName: profileName,
      allowIntroFallback: true,
    });
    if (!text.trim()) return;

    prefetchAnimaTts(text);
  }, [currentStep, profileName]);

  const enterAltar = useCallback(async () => {
    if (!termsAccepted) {
      const result = await completeOnboarding();
      if (!result.ok) return;
    }
    router.push(CLIENTE_DASHBOARD_ROUTE);
    router.refresh();
  }, [completeOnboarding, router, termsAccepted]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white">
      <AnimatePresence mode="wait">
        {currentStep === "terms" ? (
          <TermsStep key="terms" onAccept={goToSplash} />
        ) : null}
        {currentStep === "splash" ? (
          <LogoSplashStep key="splash" onComplete={goToManifesto} />
        ) : null}
        {currentStep === "manifesto" ? (
          <WarningManifestoStep
            key="manifesto"
            onComplete={() => {
              void enterAltar();
            }}
            error={error}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
