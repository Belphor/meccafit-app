import { redirect } from "next/navigation";

export default function EvolucaoConfigurarRedirectPage() {
  redirect("/dashboard?tab=perfil");
}
