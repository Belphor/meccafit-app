"use client";

import { useEffect, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  BRASA_PANEL,
  DASHBOARD_INNER_FRAME,
  DASHBOARD_META_CHIP,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";
import {
  DIET_OBJECTIVE_LABELS,
  fetchActiveDietBlueprint,
  sumMealMacros,
  type DietBlueprint,
  type DietMeal,
} from "@/lib/diet-data";
import { VIP_CLIENT_LABEL } from "@/lib/vip-client";

type DietaPanelProps = {
  userId: string;
};

function MacroRing({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent: string;
}) {
  return (
    <div className={`${BRASA_PANEL} rounded-2xl border px-3 py-3 text-center`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 font-serif text-xl ${accent}`}>
        {value}
        <span className="ml-0.5 text-xs text-neutral-400">{unit}</span>
      </p>
    </div>
  );
}

function MealCard({ meal }: { meal: DietMeal }) {
  const mealTotals = sumMealMacros([meal]);

  return (
    <article className={`${BRASA_PANEL} rounded-2xl border px-4 py-4`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-base text-amber-50">{meal.nome}</h3>
        {meal.horario ? (
          <span className={DASHBOARD_META_CHIP}>{meal.horario}</span>
        ) : null}
      </header>
      <ul className="mt-3 space-y-2">
        {meal.itens.map((item, index) => (
          <li
            key={`${meal.id}-${index}`}
            className="rounded-xl border border-orange-500/12 bg-black/25 px-3 py-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-100/95">{item.alimento}</p>
                {item.quantidade ? (
                  <p className="mt-0.5 text-xs text-amber-200/70">{item.quantidade}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-xs text-amber-200/80">
                <p>{item.calorias} kcal</p>
                <p className="text-emerald-300/85">{item.proteinas_g}g prot.</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {meal.itens.length > 0 ? (
        <p className="mt-3 text-right text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          Refeição · {mealTotals.calorias} kcal · {mealTotals.proteinasG}g proteína
        </p>
      ) : null}
    </article>
  );
}

function DietBlueprintView({ blueprint }: { blueprint: DietBlueprint }) {
  const mealTotals = useMemo(() => sumMealMacros(blueprint.refeicoes), [blueprint.refeicoes]);
  const objetivoLabel = DIET_OBJECTIVE_LABELS[blueprint.objetivo];

  return (
    <div className="mt-4 space-y-4">
      <div className={`${DASHBOARD_INNER_FRAME} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={DASHBOARD_SECTION_TITLE}>{blueprint.titulo}</h2>
            <p className="mt-2 text-sm text-amber-100/80">
              Objetivo: <span className="text-emerald-300/90">{objetivoLabel}</span>
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
            {VIP_CLIENT_LABEL}
          </span>
        </div>

        {blueprint.forgerName ? (
          <p className="mt-3 text-xs text-amber-200/75">
            Forjado por <span className="text-amber-100">{blueprint.forgerName}</span>
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroRing
            label="Calorias"
            value={blueprint.caloriasAlvo}
            unit="kcal"
            accent="text-amber-300"
          />
          <MacroRing
            label="Proteína"
            value={blueprint.proteinasG}
            unit="g"
            accent="text-emerald-300"
          />
          <MacroRing
            label="Carbo"
            value={blueprint.carboidratosG}
            unit="g"
            accent="text-orange-300"
          />
          <MacroRing
            label="Gordura"
            value={blueprint.gordurasG}
            unit="g"
            accent="text-rose-300/90"
          />
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Hidratação alvo: {blueprint.aguaLitros}L/dia · Soma das refeições: {mealTotals.calorias}{" "}
          kcal
        </p>
      </div>

      {blueprint.observacoes ? (
        <div className={`${BRASA_PANEL} rounded-2xl border px-4 py-3`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/90">
            Notas do Forjador
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/85">{blueprint.observacoes}</p>
        </div>
      ) : null}

      {blueprint.refeicoes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
            Refeições do dia
          </p>
          {blueprint.refeicoes.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      ) : null}

      <p className="text-center text-[11px] text-neutral-600">
        Plano actualizado em{" "}
        {new Date(blueprint.atualizadoEm).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

export function DietaPanel({ userId }: DietaPanelProps) {
  const [blueprint, setBlueprint] = useState<DietBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const result = await fetchActiveDietBlueprint(userId);
      if (cancelled) return;

      if (result.error && result.error !== "MIGRATION_PENDING") {
        setError(result.error);
      }
      setBlueprint(result.blueprint);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
      <DashboardPanelHeader chip="Dieta" meta="Consultoria personal · exclusivo VIP" />

      {loading ? (
        <div className={`${DASHBOARD_INNER_FRAME} mt-4 p-8 text-center`}>
          <p className="text-sm text-amber-200/75">Carregando plano termogénico...</p>
        </div>
      ) : error ? (
        <div className={`${DASHBOARD_INNER_FRAME} mt-4 p-5 text-center`}>
          <p className="text-sm text-rose-300/90">Não foi possível carregar a dieta: {error}</p>
        </div>
      ) : blueprint ? (
        <DietBlueprintView blueprint={blueprint} />
      ) : (
        <div className={`${DASHBOARD_INNER_FRAME} mt-4 p-5 text-center`}>
          <h2 className={DASHBOARD_SECTION_TITLE}>Plano nutricional VIP</h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/85">
            O seu vínculo VIP está activo. O Forjador ainda não publicou o blueprint nutricional —
            assim que for forjado, as refeições e macros aparecem aqui, alinhadas ao treino personal.
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            Enquanto isso, mantenha pureza diária (água, sono, treino) para sustentar a recomposição
            termogénica.
          </p>
        </div>
      )}
    </BrasaVivaCard>
  );
}
