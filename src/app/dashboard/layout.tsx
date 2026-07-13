import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isForjadorPanelRole } from "@/lib/internal-routes";
import {
  hasAcceptedTerms,
  isOnboardingPath,
  ONBOARDING_ROUTE,
} from "@/lib/onboarding-terms";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Gate de compliance pós-login — bloqueia /dashboard/* até
 * user_metadata.has_accepted_terms === true (clientes).
 * Cerimônia (logo + manifesto) permanece acessível após o aceite;
 * as diretrizes só aparecem na primeira vez.
 * Forjadores seguem para o painel da forja sem este fluxo.
 * Pathname vem de `x-pathname` (proxy) para evitar loop SSR.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return children;
  }

  const { data: roleRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isForjadorPanelRole(roleRow?.role)) {
    return children;
  }

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  // Sem pathname confiável, o proxy é a fonte da verdade — evita redirect loop.
  if (!pathname) {
    return children;
  }

  const onOnboarding = isOnboardingPath(pathname);
  const accepted = hasAcceptedTerms(
    user.user_metadata as Record<string, unknown> | undefined,
  );

  if (!accepted && !onOnboarding) {
    redirect(ONBOARDING_ROUTE);
  }

  return children;
}
