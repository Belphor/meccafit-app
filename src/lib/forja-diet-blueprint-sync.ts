import type { DietMeal, DietObjective } from "@/lib/diet-data";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { supabase } from "@/lib/supabase";

export type ForjaDietBlueprintSyncResult =
  | { ok: true; blueprintId: string }
  | { ok: false; code: "SESSION" | "VALIDATION" | "RLS" | "NETWORK"; message: string };

export type ForjaDietBlueprintPayload = {
  titulo: string;
  objetivo: DietObjective;
  caloriasAlvo: number;
  proteinasG: number;
  carboidratosG: number;
  gordurasG: number;
  aguaLitros: number;
  observacoes: string | null;
  refeicoes: DietMeal[];
};

const DIET_OBJECTIVES: DietObjective[] = ["hipertrofia", "definicao", "recomposicao", "manutencao"];

function slugifyMealId(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized.slice(0, 48) : `refeicao-${Date.now()}`;
}

export function parseDietObjective(raw: string): DietObjective | null {
  const key = raw.trim().toLowerCase();
  return DIET_OBJECTIVES.includes(key as DietObjective) ? (key as DietObjective) : null;
}

export function validateDietBlueprintPayload(
  payload: ForjaDietBlueprintPayload,
): { ok: true } | { ok: false; message: string } {
  const titulo = payload.titulo.trim();
  if (titulo.length < 3) {
    return { ok: false, message: "Título da dieta deve ter pelo menos 3 caracteres." };
  }

  if (!parseDietObjective(payload.objetivo)) {
    return { ok: false, message: "Objetivo inválido (hipertrofia, definicao, recomposicao, manutencao)." };
  }

  const checks: Array<[string, number, number, number]> = [
    ["Calorias", payload.caloriasAlvo, 800, 10000],
    ["Proteínas", payload.proteinasG, 30, 600],
    ["Carboidratos", payload.carboidratosG, 0, 1200],
    ["Gorduras", payload.gordurasG, 10, 400],
  ];

  for (const [label, value, min, max] of checks) {
    if (!Number.isFinite(value) || value < min || value > max) {
      return { ok: false, message: `${label} inválidas (${min}–${max}).` };
    }
  }

  if (!Number.isFinite(payload.aguaLitros) || payload.aguaLitros <= 0 || payload.aguaLitros > 10) {
    return { ok: false, message: "Água inválida (0,1–10 L)." };
  }

  if (payload.observacoes && payload.observacoes.length > 4000) {
    return { ok: false, message: "Observações excedem 4000 caracteres." };
  }

  return { ok: true };
}

export function normalizeDietMeals(refeicoes: DietMeal[]): DietMeal[] {
  const seenIds = new Set<string>();

  return refeicoes.flatMap((meal) => {
    const nome = meal.nome.trim();
    if (!nome) return [];

    let id = meal.id.trim() || slugifyMealId(nome);
    if (seenIds.has(id)) {
      id = `${id}-${seenIds.size + 1}`;
    }
    seenIds.add(id);

    const itens = meal.itens.flatMap((item) => {
      const alimento = item.alimento.trim();
      if (!alimento) return [];
      return [
        {
          alimento,
          quantidade: item.quantidade.trim(),
          calorias: Number.isFinite(item.calorias) ? Math.max(0, Math.round(item.calorias)) : 0,
          proteinas_g: Number.isFinite(item.proteinas_g) ? Math.max(0, Math.round(item.proteinas_g)) : 0,
        },
      ];
    });

    return [
      {
        id,
        nome,
        horario: meal.horario.trim(),
        itens,
      },
    ];
  });
}

export async function syncForjaDietBlueprint(
  athlete: ForjaBondedAthlete,
  payload: ForjaDietBlueprintPayload,
): Promise<ForjaDietBlueprintSyncResult> {
  const validation = validateDietBlueprintPayload(payload);
  if (!validation.ok) {
    return { ok: false, code: "VALIDATION", message: validation.message };
  }

  if (!athlete.hasVipBond) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Vínculo VIP activo obrigatório para publicar dieta.",
    };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const operatorId = session?.user?.id?.trim();
    if (sessionError || !operatorId) {
      return { ok: false, code: "SESSION", message: "Sessão inválida. Faça login novamente." };
    }

    const refeicoes = normalizeDietMeals(payload.refeicoes);
    const row = {
      titulo: payload.titulo.trim(),
      objetivo: payload.objetivo,
      calorias_alvo: payload.caloriasAlvo,
      proteinas_g: payload.proteinasG,
      carboidratos_g: payload.carboidratosG,
      gorduras_g: payload.gordurasG,
      agua_litros: payload.aguaLitros,
      refeicoes,
      observacoes: payload.observacoes?.trim() || null,
      forger_id: athlete.forgerId,
    };

    const { data: existing, error: fetchError } = await supabase
      .from("diet_blueprints")
      .select("id")
      .eq("client_id", athlete.clientId)
      .eq("activo", true)
      .maybeSingle();

    if (fetchError) {
      const rlsHint = fetchError.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: fetchError.message,
      };
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from("diet_blueprints")
        .update(row)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        const rlsHint = error.message?.toLowerCase().includes("row-level security");
        return {
          ok: false,
          code: rlsHint ? "RLS" : "NETWORK",
          message: error.message,
        };
      }

      if (!data?.id) {
        return { ok: false, code: "NETWORK", message: "Dieta não confirmada pelo núcleo." };
      }

      return { ok: true, blueprintId: data.id };
    }

    const { data, error } = await supabase
      .from("diet_blueprints")
      .insert({
        client_id: athlete.clientId,
        activo: true,
        ...row,
      })
      .select("id")
      .single();

    if (error) {
      const rlsHint = error.message?.toLowerCase().includes("row-level security");
      return {
        ok: false,
        code: rlsHint ? "RLS" : "NETWORK",
        message: error.message,
      };
    }

    if (!data?.id) {
      return { ok: false, code: "NETWORK", message: "Dieta não confirmada pelo núcleo." };
    }

    return { ok: true, blueprintId: data.id };
  } catch {
    return { ok: false, code: "NETWORK", message: "Falha de rede ao publicar dieta." };
  }
}
