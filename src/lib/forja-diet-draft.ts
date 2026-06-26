import type { DietMeal } from "@/lib/diet-data";
import {
  parseDietObjective,
  type ForjaDietBlueprintPayload,
} from "@/lib/forja-diet-blueprint-sync";
import type { ForjaDietBlueprintDraft, ForjaDietMealDraft } from "@/lib/forja-dashboard";

function parseMealItemsFromText(raw: string): DietMeal["itens"] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split(/[|;]/).map((part) => part.trim());
      const alimento = parts[0] ?? "";
      if (!alimento) return [];

      return [
        {
          alimento,
          quantidade: parts[1] ?? "",
          calorias: Number(parts[2]) || 0,
          proteinas_g: Number(parts[3]) || 0,
        },
      ];
    });
}

function mapMealDraft(meal: ForjaDietMealDraft): DietMeal {
  const nome = meal.nome.trim();
  return {
    id: meal.id.trim() || nome.toLowerCase().replace(/\s+/g, "-"),
    nome,
    horario: meal.horario.trim(),
    itens: parseMealItemsFromText(meal.alimentosTexto),
  };
}

export function parseDietBlueprintDraft(
  draft: ForjaDietBlueprintDraft,
): { ok: true; payload: ForjaDietBlueprintPayload } | { ok: false; message: string } {
  const titulo = draft.titulo.trim();
  const objetivo = parseDietObjective(draft.objetivo);
  const caloriasAlvo = Number(draft.caloriasAlvo.trim());
  const proteinasG = Number(draft.proteinasG.trim());
  const carboidratosG = Number(draft.carboidratosG.trim());
  const gordurasG = Number(draft.gordurasG.trim());
  const aguaLitros = Number(draft.aguaLitros.trim() || "3");

  if (!titulo) {
    return { ok: false, message: "Informe o título da dieta." };
  }
  if (!objetivo) {
    return { ok: false, message: "Selecione um objetivo válido." };
  }
  if (!Number.isFinite(caloriasAlvo)) {
    return { ok: false, message: "Informe as calorias alvo." };
  }
  if (!Number.isFinite(proteinasG)) {
    return { ok: false, message: "Informe as proteínas alvo (g)." };
  }
  if (!Number.isFinite(carboidratosG)) {
    return { ok: false, message: "Informe os carboidratos alvo (g)." };
  }
  if (!Number.isFinite(gordurasG)) {
    return { ok: false, message: "Informe as gorduras alvo (g)." };
  }

  const refeicoes = draft.refeicoes.map(mapMealDraft).filter((meal) => meal.nome.length > 0);

  return {
    ok: true,
    payload: {
      titulo,
      objetivo,
      caloriasAlvo,
      proteinasG,
      carboidratosG,
      gordurasG,
      aguaLitros,
      observacoes: draft.observacoes.trim() || null,
      refeicoes,
    },
  };
}
