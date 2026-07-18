import { redirect } from "next/navigation";
import { ForjaTreinoDetailClient } from "@/app/dashboard/forja/[clientId]/ForjaTreinoDetailClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import { resolveForjadorOperator } from "@/lib/forjador-page-context.server";

export default async function ForjaTreinoDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { operator, sovereign } = await resolveForjadorOperator();

  const athletes = await loadBondedAthletes(operator.userId, sovereign);
  const athlete = athletes.find((item) => item.clientId === clientId);

  if (!athlete) {
    redirect("/dashboard/forja");
  }

  return <ForjaTreinoDetailClient operator={operator} athlete={athlete} />;
}
