import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subgrupo?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient userId={user.id} subgroupParam={params.subgrupo ?? null} />
    </Suspense>
  );
}
