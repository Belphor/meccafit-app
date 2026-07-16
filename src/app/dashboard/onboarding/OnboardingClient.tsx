"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LogoSplashStep } from "@/components/onboarding/LogoSplashStep";
import { TermsStep } from "@/components/onboarding/TermsStep";
import { WarningManifestoStep } from "@/components/onboarding/WarningManifestoStep";
import { useOnboarding } from "@/hooks/useOnboarding";
import { resolveIgnitePayload } from "@/hooks/usePhoenixVoice";
import { prefetchAnimaTts } from "@/lib/anima-audio-controller";
import { clearPerfilIdentityFieldUnlocks } from "@/lib/anima-perfil-identity-form";
import { clearSpotlightBeatProgress } from "@/lib/anima-perfil-identity-beats";
import { clearEcossistemaTourLocalState } from "@/lib/fenix-ecossistema-tour";
import { CLIENTE_DASHBOARD_ROUTE } from "@/lib/internal-routes";
import {
  resetClientFirstLoginLocalState,
  seedPresentationSkipCeremonyFlow,
} from "@/lib/phoenix-lore";
import { writeLocalProfileDisplayName } from "@/lib/profile-display-name";
import { deleteLocalAvatar } from "@/services/local-storage";

type CeremonyStep = "terms" | "splash" | "manifesto";

type OnboardingClientProps = {
  userId: string;
  /** Diretrizes já aceitas — pula o passo e inicia no logo. */
  termsAccepted: boolean;
  /** Nome do perfil (ou vazio → Nova Chama na voz). */
  profileName: string;
};

export function OnboardingClient({
  userId,
  termsAccepted,
  profileName,
}: OnboardingClientProps) {
  const router = useRouter();
  const { completeOnboarding, isPending, error } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<CeremonyStep>(
    termsAccepted ? "splash" : "terms",
  );
  const [termsSaved, setTermsSaved] = useState(termsAccepted);
  const firstLoginResetDoneRef = useRef(false);

  /** Diretrizes de novo (= 1º login): zera progresso local para reteste limpo. */
  useEffect(() => {
    if (termsAccepted || firstLoginResetDoneRef.current) return;
    firstLoginResetDoneRef.current = true;
    resetClientFirstLoginLocalState(userId);
    clearEcossistemaTourLocalState(userId);
    clearPerfilIdentityFieldUnlocks();
    writeLocalProfileDisplayName(userId, "");
    void deleteLocalAvatar(userId);
  }, [termsAccepted, userId]);

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

  const acceptTerms = useCallback(async () => {
    if (termsSaved) {
      setCurrentStep("splash");
      return;
    }

    const result = await completeOnboarding();
    if (!result.ok) return;

    setTermsSaved(true);
    setCurrentStep("splash");
  }, [completeOnboarding, termsSaved]);

  const enterAltar = useCallback(() => {
    router.push(CLIENTE_DASHBOARD_ROUTE);
    router.refresh();
  }, [router]);

  /**
   * Pular apresentação da 1ª vez:
   * aceita diretrizes → logo FENYXIA → manifesto → Juramento das Cinzas → perfil
   * (nome → gênero → foto → confirmar) → Defina sua meta de treino → pronto.
   * Sem o tour completo do Portal, apenas o passo da meta.
   */
  const skipPresentation = useCallback(async () => {
    if (!termsSaved) {
      const result = await completeOnboarding();
      if (!result.ok) return;
      setTermsSaved(true);
    }

    // Guia de identidade começa do zero após o Juramento.
    clearPerfilIdentityFieldUnlocks();
    clearSpotlightBeatProgress(userId);
    writeLocalProfileDisplayName(userId, "");
    void deleteLocalAvatar(userId);

    // Estado do tour limpo — o passo "meta" é armado ao selar a identidade.
    clearEcossistemaTourLocalState(userId);
    seedPresentationSkipCeremonyFlow(userId);

    setCurrentStep("splash");
  }, [completeOnboarding, termsSaved, userId]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white">
      <AnimatePresence mode="wait">
        {currentStep === "terms" ? (
          <TermsStep
            key="terms"
            onAccept={acceptTerms}
            onSkipPresentation={skipPresentation}
            profileName={profileName}
            error={error}
            isPending={isPending}
          />
        ) : null}
        {currentStep === "splash" ? (
          <LogoSplashStep key="splash" onComplete={goToManifesto} />
        ) : null}
        {currentStep === "manifesto" ? (
          <WarningManifestoStep key="manifesto" onComplete={enterAltar} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
