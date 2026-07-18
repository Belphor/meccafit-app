import { redirect } from "next/navigation";
import { ProfileFenixMedePage } from "@/components/profile/ProfileFenixMedePage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ComoFenixMedeRoutePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <ProfileFenixMedePage />;
}
