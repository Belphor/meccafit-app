import { MedidasPageClient } from "@/app/(authenticated)/forjador/medidas/MedidasPageClient";
import { loadBondedAthletes } from "@/lib/forja-athletes.server";
import type { ForjaDashboardPayload } from "@/lib/forja-dashboard";
import { resolveMedidasAthletes } from "@/lib/medidas-access";
import { resolveForjadorOperator } from "@/lib/forjador-page-context.server";

export default async function ForjadorMedidasPage() {
  const { operator, sovereign, userId } = await resolveForjadorOperator();

  const allAthletes = await loadBondedAthletes(userId, sovereign);
  const athletes = resolveMedidasAthletes(allAthletes, userId, sovereign);

  const payload: ForjaDashboardPayload = {
    operator,
    athletes,
  };

  return <MedidasPageClient payload={payload} />;
}
