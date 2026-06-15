import { redirect } from "next/navigation";

/** Legado · configuração movida para /perfil */
export default function EvolucaoConfigurarRedirectPage() {
  redirect("/perfil");
}
