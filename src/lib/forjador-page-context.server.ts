import { redirect } from "next/navigation";
import type { ForjaOperatorProfile } from "@/lib/forja-dashboard";
import { isForjadorPanelRole, isForjadorSovereign } from "@/lib/internal-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ForjadorOperatorContext = {
  operator: ForjaOperatorProfile;
  sovereign: boolean;
  userId: string;
};

/**
 * Autentica e resolve o operador (forjador) do lado do servidor.
 * Redireciona para "/" (sem sessão) ou "/dashboard" (sem permissão de forjador).
 */
export async function resolveForjadorOperator(): Promise<ForjadorOperatorContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, nome_linhagem")
    .eq("id", user.id)
    .maybeSingle();

  if (!isForjadorPanelRole(profile?.role)) {
    redirect("/dashboard");
  }

  const sovereign = isForjadorSovereign(profile.role);

  const operator: ForjaOperatorProfile = {
    displayName: profile.full_name?.trim() || profile.nome_linhagem?.trim() || "Forjador",
    role: profile.role,
    userId: user.id,
    isSovereign: sovereign,
  };

  return { operator, sovereign, userId: user.id };
}
