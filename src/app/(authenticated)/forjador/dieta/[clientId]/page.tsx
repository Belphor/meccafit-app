import { redirect } from "next/navigation";
import { DietaDetailClient } from "@/app/(authenticated)/forjador/dieta/[clientId]/DietaDetailClient";
import { filterVipAthletes } from "@/lib/forja-athlete-lists";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import { resolveForjadorOperator } from "@/lib/forjador-page-context.server";

export default async function ForjadorDietaDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { operator, sovereign } = await resolveForjadorOperator();

  const athletes = filterVipAthletes(
    await loadBondedAthletes(operator.userId, sovereign),
    operator.userId,
    sovereign,
  );
  const athlete = athletes.find((item) => item.clientId === clientId);

  if (!athlete) {
    redirect("/forjador/dieta");
  }

  return <DietaDetailClient operator={operator} athlete={athlete} />;
}
