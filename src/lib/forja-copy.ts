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
  const countLabel = `${athleteCount} cliente${athleteCount === 1 ? "" : "s"}`;
  if (operator.isSovereign) {
    return `${operator.displayName} · ${countLabel}`;
  }
  return `${operator.displayName} · ${countLabel}`;
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
    description: "Exercício, carga, séries e descanso.",
  },
  {
    id: "planilha",
    label: "Rotina semanal",
    description: "Importar rotina Seg–Sáb via CSV/XLSX.",
  },
  {
    id: "planilha_treino",
    label: "Prescrição Sheets",
    description: "Importar prescrições via CSV/XLSX.",
  },
  {
    id: "planilha_dieta",
    label: "Dieta VIP",
    description: "Plano nutricional — só clientes VIP.",
    vipOnly: true,
  },
];

export const FORJA_COPY = {
  sidebarSovereign: "Todos os clientes",
  sidebarPersonal: "Meus clientes",
  emptyAthletes: "Nenhum cliente vinculado ao seu perfil.",
  emptyAthletesSovereign: "Nenhum cliente cadastrado.",
  selectAthlete: "Selecione um cliente na lista.",
  signOut: "Sair",
  athleteVipBadge: "VIP",
  athleteStandardBadge: "Comum",
  prescription: {
    title: "Prescrição de treino",
    hint: "Aparece na aba Treino do cliente com cronômetro de descanso.",
    exercise: "Exercício",
    muscleGroup: "Grupo muscular",
    weight: "Peso (kg)",
    reps: "Repetições",
    sets: "Séries",
    restExercise: "Descanso deste exercício (s)",
    restDefault: "Descanso padrão (s)",
    restHint: "Usado quando o exercício não tem descanso próprio (15–600 s).",
    submit: "Salvar prescrição",
    submitting: "Salvando…",
    success: (name: string, series: string, reps: string, weight: string, exercise: string) =>
      `Prescrição salva para ${name}: ${series}×${reps} @ ${weight} kg · ${exercise}.`,
  },
  diet: {
    title: "Plano nutricional VIP",
    hint: "Publica na aba Dieta do cliente.",
    lockedHint: "Cliente sem vínculo VIP — crie o bond antes de publicar dieta.",
    noVipBond: "Vínculo VIP necessário para dieta. Treino e rotina funcionam para todos.",
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
      `Dieta «${titulo}» publicada para ${name}.`,
  },
  planilha: {
    title: "Rotina semanal",
    hint: "Exporte a folha como CSV ou XLSX.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar…",
    columns: "Colunas: dia_semana (1–6) · grupo_muscular · ordem (opcional)",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de importar.",
    success: (name: string, rows: number) =>
      `Rotina aplicada a ${name} · ${rows} registo(s).`,
  },
  planilhaTreino: {
    title: "Prescrição (Sheets)",
    hint: "Exporte a folha como CSV ou XLSX.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar…",
    columns:
      "Colunas: grupo_muscular · exercicio · peso · repeticoes · series · descanso_segundos · descanso_padrao_seg",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de importar.",
    success: (name: string, rows: number) =>
      `Prescrição importada para ${name} · ${rows} exercício(s).`,
  },
  planilhaDieta: {
    title: "Dieta VIP (Sheets)",
    hint: "Só clientes VIP. Exporte como CSV ou XLSX.",
    vipRequired: "Selecione um cliente VIP.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar…",
    columns:
      "Colunas: titulo · objetivo · calorias_alvo · proteinas_alvo · carboidratos_alvo · gorduras_alvo · agua_litros · observacoes · refeicao · horario · alimento · quantidade · calorias · proteinas_g",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de importar.",
    success: (name: string, titulo: string, meals: number) =>
      `Dieta «${titulo}» aplicada a ${name} · ${meals} refeição(ões).`,
  },
  searchPlaceholder: "Pesquisar por nome…",
  searchEmpty: "Nenhum cliente corresponde à pesquisa.",
  monitor: {
    title: "Monitoramento",
    hint: "Visão global de VTC de todos os clientes — controle comunitário entre forjadores.",
    globalHint:
      "Todos os forjadores consultam estatísticas agregadas. Ações disciplinares ficam com o Forjador Soberano.",
    filterLabel: "Filtrar clientes",
    segments: {
      todos: "Todos",
      vip: "VIP",
      comum: "Comuns",
      meus: "Meus",
    },
    statsTitle: "Resumo do monitoramento",
    statsHint: "Picos de VTC acima de 4× a média dos últimos 7 dias são destacados em amarelo.",
    statsTotal: "Clientes",
    statsVip: "VIP",
    statsComum: "Comuns",
    statsVtcToday: "VTC hoje",
    statsSpikes: "Picos",
    clearSelection: "Limpar seleção",
    clientDetail: "Detalhe do cliente",
    vtcFeedTitle: "Atualizações VTC",
    vtcFeedSubtitle: "Controle geral de volume",
    vtcFeedHint:
      "Volume térmico de hoje, ordenado por atividade. Clique em uma linha para ver alertas do cliente.",
    vtcFeedEmpty: "Nenhum cliente cadastrado ou migration pendente.",
    vtcColClient: "Cliente",
    vtcColType: "Tipo",
    vtcColForjador: "Personal",
    vtcColToday: "VTC hoje",
    vtcColAvg7d: "Média 7d",
    vtcCol30d: "VTC 30d",
    vtcColPhase: "Fase",
    vtcSpike: "Pico",
    vtcOwnClient: "Seu cliente",
    vtcOtherClient: "Outro personal",
    globalAlerts: "Alertas globais",
    globalEmpty: "Nenhum alerta detectado na plataforma.",
    refresh: "Atualizar",
    loading: "Analisando…",
    empty: "Nenhum alerta para este cliente.",
    readOnly: "Consulta apenas — ações reservadas ao Forjador Soberano.",
    tribunal: "Ações administrativas",
    tribunalHint: "Alterações ficam registradas no audit log ARGOS.",
    phase: "Fase (1–5)",
    vtcToday: "VTC hoje (+ kg)",
    vtcSimulate: "Simular VTC (+25 kg)",
    vtcSimulateHint: "Registro de teste via núcleo ARGOS — sem custo adicional.",
    modifyStats: "Aplicar alterações",
    reactivate: "Reativar conta",
    deactivate: "Suspender conta",
    purify: "Reset mensal",
    purifyConfirm: (name: string) =>
      `Reset mensal de ${name}? VTC do mês será zerado e fase volta a Cinzas.`,
    deactivateConfirm: (name: string) => `Suspender o acesso de ${name}?`,
    actionSuccess: "Operação concluída.",
    invalidPhase: "Fase deve ser entre 1 e 5.",
  },
} as const;
