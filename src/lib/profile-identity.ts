import { supabase } from "@/lib/supabase";
import {
  notifyProfileDisplayNameUpdated,
  writeLocalProfileDisplayName,
} from "@/lib/profile-display-name";

export type ProfileSexo = "masculino" | "feminino";

export type ProfileIdentityState = {
  fullName: string;
  sexo: ProfileSexo | null;
  perfilIdentidadeConfirmada: boolean;
  animaPortalVisto: boolean;
};

export async function confirmProfileIdentity(
  userId: string,
  fullName: string,
  sexo: ProfileSexo,
): Promise<ProfileIdentityState> {
  const trimmed = fullName.trim();
  if (trimmed.length < 2) {
    throw new Error("Informe um nome com pelo menos 2 caracteres.");
  }
  if (!sexo) {
    throw new Error("Selecione masculino ou feminino.");
  }

  const { data, error } = await supabase.rpc(
    "client_confirm_profile_identity" as "client_submit_feedback",
    { p_full_name: trimmed, p_sexo: sexo } as never,
  );

  if (error) {
    if (error.code === "PGRST202") {
      throw new Error("Servidor ainda não atualizado. Tente novamente em instantes.");
    }
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Resposta inválida ao confirmar identidade.");
  }

  const row = data as Record<string, unknown>;
  if (row.error) {
    const message =
      typeof row.message === "string" ? row.message : "Não foi possível confirmar a identidade.";
    throw new Error(message);
  }

  writeLocalProfileDisplayName(userId, trimmed);
  notifyProfileDisplayNameUpdated();

  return {
    fullName: trimmed,
    sexo,
    perfilIdentidadeConfirmada: true,
    animaPortalVisto: true,
  };
}

export async function markEcossistemaTourComplete(): Promise<void> {
  const { data, error } = await supabase.rpc(
    "client_complete_ecossistema_tour" as "client_submit_feedback",
    {} as never,
  );

  if (error) {
    if (error.code === "PGRST202") return;
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const row = data as Record<string, unknown>;
  if (row.error) {
    throw new Error(typeof row.message === "string" ? row.message : "Erro ao concluir tour.");
  }
}

export async function markAnimaPortalVisto(): Promise<void> {
  const { data, error } = await supabase.rpc(
    "client_mark_anima_portal_visto" as "client_submit_feedback",
    {} as never,
  );

  if (error) {
    if (error.code === "PGRST202") return;
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const row = data as Record<string, unknown>;
  if (row.error) {
    throw new Error(typeof row.message === "string" ? row.message : "Erro ao registrar portal.");
  }
}

export function parseProfileSexo(value: unknown): ProfileSexo | null {
  if (value === "masculino" || value === "feminino") return value;
  return null;
}
