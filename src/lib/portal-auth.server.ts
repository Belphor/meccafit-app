import type { AuthError } from "@supabase/supabase-js";

export type PortalProfile = {
  full_name: string | null;
  role: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
  nome_linhagem: string | null;
  status_altar: string | null;
};

export function mapAuthError(error: AuthError): string {
  const message = error.message.trim();
  return message.length > 0 ? message : "Não foi possível autenticar agora.";
}
