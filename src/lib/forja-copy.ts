import type { ForjaWorkspaceTab, ForjaOperatorProfile } from "@/lib/forja-dashboard";

export const FORJA_ROLE_LABELS: Record<string, string> = {
  forjador_soberano: "Forjador Soberano",
  forjador_linhagem: "Forjador de Linhagem",
  forjador: "Forjador",
};

export function resolveForjaRoleLabel(role: string): string {
  return FORJA_ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export function resolveForjaPanelTitle(operator: ForjaOperatorProfile): string {
  return operator.isSovereign ? "Central da Forja" : "Painel do Personal";
}

export function resolveForjaPanelSubtitle(operator: ForjaOperatorProfile, athleteCount: number): string {
  const countLabel = `${athleteCount} atleta${athleteCount === 1 ? "" : "s"}`;
  if (operator.isSovereign) {
    return `${operator.displayName} · ${countLabel} · gestão de toda a academia`;
  }
  return `${operator.displayName} · ${countLabel} · treino para todos · dieta exclusiva VIP`;
}

export const FORJA_WORKSPACE_TABS: Array<{
  id: ForjaWorkspaceTab;
  label: string;
  description: string;
  vipOnly?: boolean;
}> = [
  {
    id: "comando",
    label: "Prescrição",
    description: "Monte exercícios, carga e cronômetro de descanso para qualquer atleta.",
  },
  {
    id: "planilha",
    label: "Rotina semanal",
    description: "Importe Seg–Sáb via Google Sheets (grupos musculares por dia).",
  },
  {
    id: "planilha_dieta",
    label: "Dieta VIP",
    description: "Importe plano nutricional — exclusivo clientes com vínculo VIP.",
    vipOnly: true,
  },
  {
    id: "antifraude",
    label: "Monitoramento",
    description: "Alertas ARGOS e ações administrativas (soberano).",
  },
];

export const FORJA_COPY = {
  sidebarSovereign: "Todos os atletas",
  sidebarPersonal: "Meus atletas",
  emptyAthletes: "Nenhum atleta vinculado ao seu perfil (forjador_id).",
  emptyAthletesSovereign: "Nenhum cliente cadastrado na academia.",
  selectAthlete: "Selecione um atleta na lista ao lado para continuar.",
  signOut: "Sair",
  athleteVipBadge: "VIP",
  athleteStandardBadge: "Comum",
  prescription: {
    title: "Prescrição de treino",
    hint: "Disponível para todos os atletas. Aparece na aba Treino com cronômetro de descanso configurável.",
    exercise: "Exercício",
    muscleGroup: "Grupo muscular",
    weight: "Peso (kg)",
    reps: "Repetições",
    sets: "Séries",
    restExercise: "Descanso deste exercício (s)",
    restDefault: "Descanso padrão do atleta (s)",
    restHint: "O padrão alimenta o cronômetro quando o exercício não tem descanso próprio (15–600 s).",
    submit: "Salvar prescrição",
    submitting: "Salvando…",
    success: (name: string, series: string, reps: string, weight: string, exercise: string) =>
      `Prescrição salva para ${name}: ${series}×${reps} @ ${weight} kg · ${exercise}.`,
  },
  diet: {
    title: "Plano nutricional VIP",
    hint: "Exclusivo para atletas com vínculo VIP. Publica na aba Dieta do dashboard.",
    lockedHint:
      "Este atleta não possui vínculo VIP. Crie o bond em forger_client_bonds para liberar dieta.",
    noVipBond:
      "Vínculo VIP obrigatório. Apenas a dieta é exclusiva VIP — treino e rotina estão liberados para todos.",
    planTitle: "Título do plano",
    objective: "Objetivo",
    calories: "Calorias alvo (kcal)",
    protein: "Proteínas (g)",
    carbs: "Carboidratos (g)",
    fat: "Gorduras (g)",
    water: "Água (L/dia)",
    notes: "Observações",
    mealsTitle: "Refeições",
    mealsHint: "Um alimento por linha: nome | quantidade | kcal | proteínas (g)",
    addMeal: "Adicionar refeição",
    submit: "Publicar dieta VIP",
    submitting: "Publicando…",
    success: (name: string, titulo: string) =>
      `Dieta «${titulo}» publicada para ${name}. Visível na aba Dieta.`,
  },
  planilha: {
    title: "Rotina semanal (Google Sheets)",
    hint: "Exporte a folha como CSV ou XLSX. Processamento local — nada vai para servidores externos.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar ficheiro…",
    columns: "Colunas: dia_semana (1–6) · grupo_muscular (PEITO, COSTAS…) · ordem (opcional)",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar pré-visualização",
    selectAthlete: "Selecione um atleta antes de importar.",
    success: (name: string, rows: number) =>
      `Rotina aplicada a ${name} · ${rows} registo(s) na planilha semanal.`,
  },
  planilhaDieta: {
    title: "Dieta VIP (Google Sheets)",
    hint: "Exclusivo VIP. Exporte a folha do Google Sheets como CSV ou XLSX.",
    vipRequired: "Selecione um atleta VIP para importar dieta.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar planilha de dieta…",
    columns:
      "Colunas: titulo · objetivo · calorias_alvo · proteinas_alvo · carboidratos_alvo · gorduras_alvo · agua_litros · observacoes · refeicao · horario · alimento · quantidade · calorias · proteinas_g",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar pré-visualização",
    selectAthlete: "Selecione um atleta antes de importar.",
    success: (name: string, titulo: string, meals: number) =>
      `Dieta «${titulo}» aplicada a ${name} · ${meals} refeição(ões) publicada(s).`,
  },
  monitor: {
    title: "Monitoramento ARGOS",
    hint: "Sinais automáticos de volume, conta suspensa e inconsistências de fase.",
    refresh: "Atualizar",
    loading: "A analisar registos…",
    empty: "Nenhum alerta no escopo seleccionado.",
    readOnly: "Modo consulta — alterações administrativas reservadas ao Forjador Soberano.",
    tribunal: "Acções administrativas",
    tribunalHint: "Alterações irreversíveis ficam registadas no audit log.",
    phase: "Fase do atleta (1–5)",
    vtcToday: "VTC de hoje (+ kg)",
    modifyStats: "Aplicar alterações",
    reactivate: "Reactivar conta",
    deactivate: "Suspender conta",
    purify: "Reset mensal (Cinzas)",
    purifyConfirm: (name: string) =>
      `Confirmar reset mensal de ${name}? VTC/VRA do mês serão zerados e a fase volta a Cinzas.`,
    deactivateConfirm: (name: string) => `Suspender o acesso de ${name}?`,
    actionSuccess: "Operação concluída e registada no audit log.",
    invalidPhase: "Informe uma fase entre 1 e 5.",
  },
} as const;
