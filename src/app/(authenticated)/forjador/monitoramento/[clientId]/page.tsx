import { redirect } from "next/navigation";
import { MonitoramentoDetailClient } from "@/app/(authenticated)/forjador/monitoramento/[clientId]/MonitoramentoDetailClient";
import { loadMonitoringAthletes } from "@/lib/forja-athletes.server";
import { resolveForjadorOperator } from "@/lib/forjador-page-context.server";

export default async function ForjadorMonitoramentoDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { operator, userId } = await resolveForjadorOperator();

  const athletes = await loadMonitoringAthletes(userId);
  const athlete = athletes.find((item) => item.clientId === clientId);

  if (!athlete) {
    redirect("/forjador/monitoramento");
  }

  return <MonitoramentoDetailClient operator={operator} athlete={athlete} />;
}
