import { redirect } from "next/navigation";
import { ProfileLoreGlossaryPage } from "@/components/profile/ProfileLoreGlossaryPage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function LexicoRoutePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <ProfileLoreGlossaryPage />;
}
