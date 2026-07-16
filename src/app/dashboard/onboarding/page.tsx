import { redirect } from "next/navigation";
import { OnboardingClient } from "@/app/dashboard/onboarding/OnboardingClient";
import { isForjadorPanelRole } from "@/lib/internal-routes";
import { hasAcceptedTerms } from "@/lib/onboarding-terms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Cerimônia de entrada: logo + manifesto em todo login.
 * Diretrizes (termos) só na primeira vez — enquanto has_accepted_terms for falso.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (isForjadorPanelRole(profile?.role)) {
    redirect("/dashboard/forja");
  }

  const termsAccepted = hasAcceptedTerms(
    user.user_metadata as Record<string, unknown> | undefined,
  );

  return (
    <OnboardingClient
      userId={user.id}
      termsAccepted={termsAccepted}
      profileName={profile?.full_name?.trim() ?? ""}
    />
  );
}
