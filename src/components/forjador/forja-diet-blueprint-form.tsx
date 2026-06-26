"use client";

import { memo, useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import { parseDietBlueprintDraft } from "@/lib/forja-diet-draft";
import { syncForjaDietBlueprint } from "@/lib/forja-diet-blueprint-sync";
import { DIET_OBJECTIVE_LABELS, type DietObjective } from "@/lib/diet-data";
import {
  EMPTY_DIET_BLUEPRINT_DRAFT,
  EMPTY_DIET_MEAL_DRAFT,
  type ForjaBondedAthlete,
  type ForjaDietBlueprintDraft,
  type ForjaDietMealDraft,
} from "@/lib/forja-dashboard";

type ForjaDietBlueprintFormProps = {
  athlete: ForjaBondedAthlete | null;
};

type DietPhase = "idle" | "syncing" | "success" | "error";

const OBJECTIVE_OPTIONS = Object.entries(DIET_OBJECTIVE_LABELS) as Array<[DietObjective, string]>;

function ForjaDietBlueprintFormComponent({ athlete }: ForjaDietBlueprintFormProps) {
  const [draft, setDraft] = useState<ForjaDietBlueprintDraft>(EMPTY_DIET_BLUEPRINT_DRAFT);
  const [phase, setPhase] = useState<DietPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const canPublish = athlete?.hasVipBond !== false;
  const isSyncing = phase === "syncing";

  const handleFieldChange = useCallback(
    (field: keyof Omit<ForjaDietBlueprintDraft, "refeicoes">) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setDraft((current) => ({ ...current, [field]: event.target.value }));
        setPhase("idle");
        setMessage(null);
      },
    [],
  );

  const handleMealChange = useCallback(
    (index: number, field: keyof ForjaDietMealDraft, value: string) => {
      setDraft((current) => ({
        ...current,
        refeicoes: current.refeicoes.map((meal, mealIndex) =>
          mealIndex === index ? { ...meal, [field]: value } : meal,
        ),
      }));
      setPhase("idle");
      setMessage(null);
    },
    [],
  );

  const handleAddMeal = useCallback(() => {
    setDraft((current) => ({
      ...current,
      refeicoes: [
        ...current.refeicoes,
        {
          ...EMPTY_DIET_MEAL_DRAFT,
          id: `refeicao-${current.refeicoes.length + 1}`,
          nome: "",
          horario: "",
        },
      ],
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!athlete) return;

      if (!athlete.hasVipBond) {
        setPhase("error");
        setMessage(FORJA_COPY.diet.noVipBond);
        return;
      }

      const parsed = parseDietBlueprintDraft(draft);
      if (!parsed.ok) {
        setPhase("error");
        setMessage(parsed.message);
        return;
      }

      setPhase("syncing");
      setMessage(null);

      const result = await syncForjaDietBlueprint(athlete, parsed.payload);
      if (!result.ok) {
        setPhase("error");
        setMessage(result.message);
        return;
      }

      setPhase("success");
      setMessage(FORJA_COPY.diet.success(athlete.displayName, parsed.payload.titulo));
      setDraft(EMPTY_DIET_BLUEPRINT_DRAFT);
    },
    [athlete, draft],
  );

  if (!athlete) {
    return null;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className={`${FORJA_COMMAND_INNER} mt-8 border-t border-zinc-800/80 pt-6`}>
        <p className={FORJA_SECTION_CHIP}>Dieta · exclusivo VIP</p>
      <h3 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.diet.title}</h3>
      <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.diet.hint}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="forja-diet-titulo" className={FORJA_LABEL}>
            {FORJA_COPY.diet.planTitle}
          </label>
          <input
            id="forja-diet-titulo"
            type="text"
            value={draft.titulo}
            onChange={handleFieldChange("titulo")}
            placeholder="Ex.: Recomposição Termogénica"
            className={FORJA_INPUT}
            autoComplete="off"
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div>
          <label htmlFor="forja-diet-objetivo" className={FORJA_LABEL}>
            {FORJA_COPY.diet.objective}
          </label>
          <select
            id="forja-diet-objetivo"
            value={draft.objetivo}
            onChange={handleFieldChange("objetivo")}
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          >
            {OBJECTIVE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="forja-diet-agua" className={FORJA_LABEL}>
            {FORJA_COPY.diet.water}
          </label>
          <input
            id="forja-diet-agua"
            type="number"
            inputMode="decimal"
            min={0.1}
            max={10}
            step={0.1}
            value={draft.aguaLitros}
            onChange={handleFieldChange("aguaLitros")}
            placeholder="3"
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div>
          <label htmlFor="forja-diet-calorias" className={FORJA_LABEL}>
            {FORJA_COPY.diet.calories}
          </label>
          <input
            id="forja-diet-calorias"
            type="number"
            inputMode="numeric"
            min={800}
            max={10000}
            value={draft.caloriasAlvo}
            onChange={handleFieldChange("caloriasAlvo")}
            placeholder="2400"
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div>
          <label htmlFor="forja-diet-proteinas" className={FORJA_LABEL}>
            {FORJA_COPY.diet.protein}
          </label>
          <input
            id="forja-diet-proteinas"
            type="number"
            inputMode="numeric"
            min={30}
            max={600}
            value={draft.proteinasG}
            onChange={handleFieldChange("proteinasG")}
            placeholder="180"
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div>
          <label htmlFor="forja-diet-carbo" className={FORJA_LABEL}>
            {FORJA_COPY.diet.carbs}
          </label>
          <input
            id="forja-diet-carbo"
            type="number"
            inputMode="numeric"
            min={0}
            max={1200}
            value={draft.carboidratosG}
            onChange={handleFieldChange("carboidratosG")}
            placeholder="240"
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div>
          <label htmlFor="forja-diet-gorduras" className={FORJA_LABEL}>
            {FORJA_COPY.diet.fat}
          </label>
          <input
            id="forja-diet-gorduras"
            type="number"
            inputMode="numeric"
            min={10}
            max={400}
            value={draft.gordurasG}
            onChange={handleFieldChange("gordurasG")}
            placeholder="70"
            className={FORJA_INPUT}
            disabled={isSyncing || !canPublish}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="forja-diet-observacoes" className={FORJA_LABEL}>
            {FORJA_COPY.diet.notes}
          </label>
          <textarea
            id="forja-diet-observacoes"
            value={draft.observacoes}
            onChange={handleFieldChange("observacoes")}
            rows={2}
            placeholder="Orientações gerais, suplementação…"
            className={`${FORJA_INPUT} min-h-11 resize-y py-3`}
            disabled={isSyncing || !canPublish}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-200">{FORJA_COPY.diet.mealsTitle}</p>
          <button
            type="button"
            onClick={handleAddMeal}
            className={FORJA_GHOST_BUTTON}
            disabled={isSyncing || !canPublish}
          >
            {FORJA_COPY.diet.addMeal}
          </button>
        </div>
        <p className={FORJA_META}>{FORJA_COPY.diet.mealsHint}</p>

        {draft.refeicoes.map((meal, index) => (
          <article
            key={`${meal.id}-${index}`}
            className="rounded-xl border border-zinc-800/80 bg-black/25 p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`forja-meal-nome-${index}`} className={FORJA_LABEL}>
                  Refeição
                </label>
                <input
                  id={`forja-meal-nome-${index}`}
                  type="text"
                  value={meal.nome}
                  onChange={(event) => handleMealChange(index, "nome", event.target.value)}
                  placeholder="Almoço"
                  className={FORJA_INPUT}
                  disabled={isSyncing || !canPublish}
                />
              </div>
              <div>
                <label htmlFor={`forja-meal-horario-${index}`} className={FORJA_LABEL}>
                  Horário
                </label>
                <input
                  id={`forja-meal-horario-${index}`}
                  type="text"
                  value={meal.horario}
                  onChange={(event) => handleMealChange(index, "horario", event.target.value)}
                  placeholder="12:30"
                  className={FORJA_INPUT}
                  disabled={isSyncing || !canPublish}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`forja-meal-itens-${index}`} className={FORJA_LABEL}>
                  Alimentos
                </label>
                <textarea
                  id={`forja-meal-itens-${index}`}
                  value={meal.alimentosTexto}
                  onChange={(event) => handleMealChange(index, "alimentosTexto", event.target.value)}
                  rows={3}
                  placeholder={"Ovos mexidos | 3 un | 210 | 18\nAveia | 60g | 230 | 8"}
                  className={`${FORJA_INPUT} min-h-20 resize-y py-3 font-mono text-xs`}
                  disabled={isSyncing || !canPublish}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5">
        <button type="submit" className={FORJA_PRIMARY_BUTTON} disabled={isSyncing || !canPublish}>
          {isSyncing ? FORJA_COPY.diet.submitting : FORJA_COPY.diet.submit}
        </button>
      </div>

      {message ? (
        <p
          role={phase === "error" ? "alert" : "status"}
          className={phase === "error" ? FORJA_FEEDBACK_ERROR : FORJA_FEEDBACK_OK}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export const ForjaDietBlueprintForm = memo(ForjaDietBlueprintFormComponent);
