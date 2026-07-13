"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ForjaVipBondResult =
  | { ok: true }
  | { ok: false; message: string };

async function requireForjadorOperator() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, message: "Sessão expirada. Entre novamente na Forja." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false as const, message: "Perfil do forjador não encontrado." };
  }

  const role = String(profile.role ?? "");
  const isForjador =
    role === "forjador" || role === "forjador_linhagem" || role === "forjador_soberano";

  if (!isForjador) {
    return { ok: false as const, message: "Apenas forjadores podem gerenciar vínculos VIP." };
  }

  return {
    ok: true as const,
    supabase,
    operatorId: user.id,
    isSovereign: role === "forjador_soberano",
  };
}

export async function promoteClientToVip(clientId: string): Promise<ForjaVipBondResult> {
  const normalized = clientId.trim();
  if (!normalized) {
    return { ok: false, message: "Selecione um cliente." };
  }

  const gate = await requireForjadorOperator();
  if (!gate.ok) return gate;

  const { data: client, error: clientError } = await gate.supabase
    .from("profiles")
    .select("id, role")
    .eq("id", normalized)
    .maybeSingle();

  if (clientError || !client || client.role !== "cliente") {
    return { ok: false, message: "Cliente inválido." };
  }

  const { data: existing } = await gate.supabase
    .from("forger_client_bonds")
    .select("id, forger_id")
    .eq("client_id", normalized)
    .maybeSingle();

  if (existing) {
    if (existing.forger_id === gate.operatorId) {
      return { ok: false, message: "Este cliente já é VIP vinculado a você." };
    }
    return { ok: false, message: "Este cliente já é VIP de outro forjador." };
  }

  const { error } = await gate.supabase.from("forger_client_bonds").insert({
    forger_id: gate.operatorId,
    client_id: normalized,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Este cliente já é VIP de outro forjador." };
    }
    return { ok: false, message: "Não foi possível tornar o cliente VIP. Tente novamente." };
  }

  return { ok: true };
}

export async function demoteClientFromVip(clientId: string): Promise<ForjaVipBondResult> {
  const normalized = clientId.trim();
  if (!normalized) {
    return { ok: false, message: "Selecione um cliente." };
  }

  const gate = await requireForjadorOperator();
  if (!gate.ok) return gate;

  let query = gate.supabase.from("forger_client_bonds").delete().eq("client_id", normalized);

  if (!gate.isSovereign) {
    query = query.eq("forger_id", gate.operatorId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return { ok: false, message: "Não foi possível remover o vínculo VIP. Tente novamente." };
  }

  if (!data?.length) {
    return {
      ok: false,
      message: gate.isSovereign
        ? "Este cliente não possui vínculo VIP."
        : "Você só pode remover VIP dos seus próprios clientes.",
    };
  }

  return { ok: true };
}
