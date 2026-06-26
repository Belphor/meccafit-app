import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/database.types";

export type DietObjective = "hipertrofia" | "definicao" | "recomposicao" | "manutencao";

export type DietMealItem = {
  alimento: string;
  quantidade: string;
  calorias: number;
  proteinas_g: number;
};

export type DietMeal = {
  id: string;
  nome: string;
  horario: string;
  itens: DietMealItem[];
};

export type DietBlueprint = {
  id: string;
  clientId: string;
  forgerId: string;
  titulo: string;
  objetivo: DietObjective;
  caloriasAlvo: number;
  proteinasG: number;
  carboidratosG: number;
  gordurasG: number;
  aguaLitros: number;
  refeicoes: DietMeal[];
  observacoes: string | null;
  forgerName: string | null;
  atualizadoEm: string;
};

export const DIET_OBJECTIVE_LABELS: Record<DietObjective, string> = {
  hipertrofia: "Hipertrofia",
  definicao: "Definição",
  recomposicao: "Recomposição",
  manutencao: "Manutenção",
};

type DietBlueprintRow = {
  id: string;
  client_id: string;
  forger_id: string;
  titulo: string;
  objetivo: string;
  calorias_alvo: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  agua_litros: number;
  refeicoes: Json;
  observacoes: string | null;
  atualizado_em: string;
};

function parseMealItems(raw: unknown): DietMealItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const alimento = typeof row.alimento === "string" ? row.alimento.trim() : "";
    const quantidade = typeof row.quantidade === "string" ? row.quantidade.trim() : "";
    if (!alimento) return [];

    return [
      {
        alimento,
        quantidade,
        calorias: Number(row.calorias) || 0,
        proteinas_g: Number(row.proteinas_g) || 0,
      },
    ];
  });
}

function parseMeals(raw: unknown): DietMeal[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const nome = typeof row.nome === "string" ? row.nome.trim() : "";
    if (!id || !nome) return [];

    return [
      {
        id,
        nome,
        horario: typeof row.horario === "string" ? row.horario : "",
        itens: parseMealItems(row.itens),
      },
    ];
  });
}

function parseObjective(value: string): DietObjective {
  if (
    value === "hipertrofia" ||
    value === "definicao" ||
    value === "recomposicao" ||
    value === "manutencao"
  ) {
    return value;
  }
  return "recomposicao";
}

function mapBlueprintRow(row: DietBlueprintRow, forgerName: string | null): DietBlueprint {
  return {
    id: row.id,
    clientId: row.client_id,
    forgerId: row.forger_id,
    titulo: row.titulo,
    objetivo: parseObjective(row.objetivo),
    caloriasAlvo: row.calorias_alvo,
    proteinasG: row.proteinas_g,
    carboidratosG: row.carboidratos_g,
    gordurasG: row.gorduras_g,
    aguaLitros: Number(row.agua_litros),
    refeicoes: parseMeals(row.refeicoes),
    observacoes: row.observacoes,
    forgerName,
    atualizadoEm: row.atualizado_em,
  };
}

export async function fetchActiveDietBlueprint(
  userId: string,
): Promise<{ blueprint: DietBlueprint | null; error?: string }> {
  const { data, error } = await supabase
    .from("diet_blueprints")
    .select(
      "id, client_id, forger_id, titulo, objetivo, calorias_alvo, proteinas_g, carboidratos_g, gorduras_g, agua_litros, refeicoes, observacoes, atualizado_em",
    )
    .eq("client_id", userId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table")) {
      return { blueprint: null, error: "MIGRATION_PENDING" };
    }
    return { blueprint: null, error: error.message };
  }

  if (!data) {
    return { blueprint: null };
  }

  const row = data as DietBlueprintRow;
  const { data: forgerProfile } = await supabase
    .from("profiles")
    .select("full_name, nome_linhagem")
    .eq("id", row.forger_id)
    .maybeSingle();

  const forgerName =
    forgerProfile?.full_name?.trim() ||
    forgerProfile?.nome_linhagem?.trim() ||
    null;

  return { blueprint: mapBlueprintRow(row, forgerName) };
}

export function sumMealMacros(refeicoes: DietMeal[]): {
  calorias: number;
  proteinasG: number;
} {
  return refeicoes.reduce(
    (acc, meal) => {
      for (const item of meal.itens) {
        acc.calorias += item.calorias;
        acc.proteinasG += item.proteinas_g;
      }
      return acc;
    },
    { calorias: 0, proteinasG: 0 },
  );
}
