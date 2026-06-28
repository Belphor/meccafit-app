import { redirect } from "next/navigation";
import { DietaPageClient } from "@/app/(authenticated)/forjador/dieta/DietaPageClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import { filterVipAthletes } from "@/lib/forja-athlete-lists";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { isForjadorPanelRole, isForjadorSovereign } from "@/lib/internal-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ForjadorDietaPage() {
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
  const athletes = filterVipAthletes(
    await loadBondedAthletes(user.id, sovereign),
    user.id,
    sovereign,
  );

  const payload: ForjaDashboardPayload = {
    operator: {
      displayName:
        profile.full_name?.trim() || profile.nome_linhagem?.trim() || "Forjador",
      role: profile.role,
      userId: user.id,
      isSovereign: sovereign,
    },
    athletes,
  };

  return <DietaPageClient payload={payload} />;
}
