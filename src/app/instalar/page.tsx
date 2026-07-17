import type { Metadata } from "next";
import { InstalarClient } from "./InstalarClient";

export const metadata: Metadata = {
  title: "Instalar — FENYXIA Meccafit",
  description: "Instale o app FENYXIA Meccafit na sua tela inicial.",
};

/** Página pública de instalação do PWA (destino após o handshake do balcão). */
export default function InstalarPage() {
  return <InstalarClient />;
}
