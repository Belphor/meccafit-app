import { redirect } from "next/navigation";

export default function EvolucaoRedirectPage() {
  redirect("/dashboard?tab=evolucao");
}
