import { redirect } from "next/navigation";
import { FenyxiaEmpresaPage } from "@/components/profile/FenyxiaEmpresaPage";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function FenyxiaEmpresaRoutePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <FenyxiaEmpresaPage />;
}
