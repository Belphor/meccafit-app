"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HAS_ACCEPTED_TERMS_KEY } from "@/lib/onboarding-terms";

export type CompleteOnboardingResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Atualiza user_metadata.has_accepted_terms no Auth (aceite único do gate FENYXIA).
 */
export function useOnboarding() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = useCallback(async (): Promise<CompleteOnboardingResult> => {
    setIsPending(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { [HAS_ACCEPTED_TERMS_KEY]: true },
      });

      if (updateError || !data.user) {
        const message =
          updateError?.message?.trim() ||
          "Não foi possível registrar o aceite. Tente novamente.";
        setError(message);
        return { ok: false, message };
      }

      return { ok: true };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.trim()
          ? cause.message
          : "Não foi possível registrar o aceite. Tente novamente.";
      setError(message);
      return { ok: false, message };
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    completeOnboarding,
    isPending,
    error,
  };
}
