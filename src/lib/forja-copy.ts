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
  return `${operator.displayName} · ${countLabel}`;
}

/** Abas internas do painel de treinos (somente treino). */
export const FORJA_WORKSPACE_TABS: Array<{
  id: ForjaWorkspaceTab;
  label: string;
  description: string;
}> = [
  {
    id: "comando",
    label: "Montar treino",
    description: "Defina exercício, carga, séries e tempo de descanso para o cliente.",
  },
  {
    id: "planilha",
    label: "Rotina da semana",
    description: "Envie a planilha com os dias de treino de segunda a sábado.",
  },
  {
    id: "planilha_treino",
    label: "Importar exercícios",
    description: "Carregue vários exercícios de uma vez a partir da sua planilha.",
  },
];

export const FORJA_COPY = {
  sidebarSovereign: "Todos os clientes",
  sidebarPersonal: "Meus clientes",
  emptyAthletes: "Nenhum cliente vinculado ao seu perfil.",
  emptyAthletesSovereign: "Nenhum cliente cadastrado.",
  selectAthlete: "Selecione um cliente na lista ao lado.",
  signOut: "Sair",
  athleteVipBadge: "VIP",
  athleteStandardBadge: "Comum",
  prescription: {
    title: "Prescrição de treino",
    hint: "O cliente verá este treino na aba Treino, com cronômetro de descanso.",
    exercise: "Exercício",
    muscleGroup: "Grupo muscular",
    weight: "Peso (kg)",
    reps: "Repetições",
    sets: "Séries",
    restExercise: "Descanso deste exercício (segundos)",
    restDefault: "Descanso padrão (segundos)",
    restHint: "Usado quando o exercício não tiver descanso próprio.",
    submit: "Salvar treino",
    submitting: "Salvando…",
    success: (name: string, series: string, reps: string, weight: string, exercise: string) =>
      `Treino salvo para ${name}: ${series}×${reps} com ${weight} kg · ${exercise}.`,
  },
  diet: {
    title: "Plano alimentar VIP",
    hint: "Publicado na aba Dieta do cliente VIP.",
    lockedHint: "Este cliente ainda não é VIP. Vincule-o antes de montar a dieta.",
    noVipBond: "Plano alimentar disponível apenas para clientes VIP.",
    planTitle: "Nome do plano",
    objective: "Objetivo",
    calories: "Calorias por dia",
    protein: "Proteínas (g)",
    carbs: "Carboidratos (g)",
    fat: "Gorduras (g)",
    water: "Água (litros/dia)",
    notes: "Observações",
    mealsTitle: "Refeições",
    mealsHint: "Liste os alimentos de cada refeição.",
    addMeal: "Adicionar refeição",
    submit: "Publicar plano",
    submitting: "Publicando…",
    success: (name: string, titulo: string) => `Plano «${titulo}» publicado para ${name}.`,
  },
  planilha: {
    title: "Rotina da semana",
    hint: "Use a planilha modelo ou exporte a sua do Google Sheets / Excel.",
    drop: "Arraste a planilha aqui",
    dropBusy: "Lendo arquivo…",
    columns: "Cada linha: dia da semana (1 a 6), grupo muscular e ordem.",
    chooseFile: "Escolher planilha",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de enviar.",
    success: (name: string, rows: number) => `Rotina aplicada a ${name} · ${rows} dia(s).`,
  },
  planilhaTreino: {
    title: "Importar exercícios",
    hint: "Carregue a planilha com exercícios, cargas e descansos.",
    drop: "Arraste a planilha aqui",
    dropBusy: "Lendo arquivo…",
    columns: "Informe grupo muscular, exercício, peso, repetições, séries e descanso.",
    chooseFile: "Escolher planilha",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de enviar.",
    success: (name: string, rows: number) =>
      `${rows} exercício(s) importados para ${name}.`,
  },
  planilhaDieta: {
    title: "Plano alimentar (planilha)",
    hint: "Disponível apenas para clientes VIP.",
    vipRequired: "Selecione um cliente VIP.",
    drop: "Arraste a planilha aqui",
    dropBusy: "Lendo arquivo…",
    columns: "Inclua título, metas e refeições do dia.",
    chooseFile: "Escolher planilha",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de enviar.",
    success: (name: string, titulo: string, meals: number) =>
      `Plano «${titulo}» aplicado a ${name} · ${meals} refeição(ões).`,
  },
  searchPlaceholder: "Pesquisar por nome…",
  searchEmpty: "Nenhum cliente corresponde à pesquisa.",
  monitor: {
    title: "Monitoramento",
    hint: "Acompanhe o volume de treino (VTC) de todos os clientes da academia.",
    globalHint:
      "Todos os forjadores podem consultar. Suspensões e punições ficam com o Forjador Soberano.",
    filterLabel: "Filtrar clientes",
    segments: {
      todos: "Todos",
      vip: "VIP",
      comum: "Comuns",
      meus: "Meus",
    },
    statsTitle: "Resumo do monitoramento",
    statsHint: "Linhas em amarelo indicam volume muito acima da média recente.",
    statsTotal: "Clientes",
    statsVip: "VIP",
    statsComum: "Comuns",
    statsVtcToday: "VTC hoje",
    statsSpikes: "Alertas",
    clearSelection: "Limpar seleção",
    clientDetail: "Detalhe do cliente",
    vtcFeedTitle: "Volume de treino hoje",
    vtcFeedSubtitle: "Ranking por atividade",
    vtcFeedHint: "Toque em uma linha para ver os alertas daquele cliente.",
    vtcFeedEmpty: "Nenhum cliente encontrado.",
    vtcColClient: "Cliente",
    vtcColType: "Tipo",
    vtcColForjador: "Personal",
    vtcColToday: "Hoje",
    vtcColAvg7d: "Média 7 dias",
    vtcCol30d: "Últimos 30 dias",
    vtcColPhase: "Fase",
    vtcSpike: "Alerta",
    vtcOwnClient: "Seu cliente",
    vtcOtherClient: "Outro personal",
    globalAlerts: "Alertas gerais",
    globalEmpty: "Nenhum alerta no momento.",
    refresh: "Atualizar",
    loading: "Analisando…",
    empty: "Nenhum alerta para este cliente.",
    readOnly: "Somente leitura — punições são feitas pelo Forjador Soberano.",
    tribunal: "Ações do Soberano",
    tribunalHint: "Todas as alterações ficam registradas.",
    phase: "Fase (1 a 5)",
    vtcToday: "Adicionar volume hoje (kg)",
    vtcSimulate: "Simular volume (+25 kg)",
    vtcSimulateHint: "Registro de teste para validar o painel.",
    modifyStats: "Salvar alterações",
    reactivate: "Reativar conta",
    deactivate: "Suspender conta",
    purify: "Reset do mês",
    purifyConfirm: (name: string) =>
      `Zerar o volume do mês de ${name} e voltar a fase para Cinzas?`,
    deactivateConfirm: (name: string) => `Suspender o acesso de ${name}?`,
    actionSuccess: "Alteração salva.",
    invalidPhase: "A fase deve ser entre 1 e 5.",
  },
  medidas: {
    title: "Medidas corporais",
    description:
      "Registre peso, dobras e composição do cliente VIP. Guarde no aparelho e publique quando estiver pronto.",
    formTitle: "Nova medição",
    historyTitle: "Histórico",
    publish: "Publicar para o cliente",
    saveLocal: "Guardar rascunho",
    skinfolds: "Dobras da pele (mm)",
  },
  sovereign: {
    title: "Ferramentas avançadas",
    description:
      "Use apenas quando precisar corrigir dados ou suspender um cliente. As ações ficam registradas.",
    clearLocal: "Apagar rascunhos deste aparelho",
    deleteRemote: "Apagar medição publicada",
    resetMonth: "Zerar volume do mês",
    suspend: "Suspender acesso",
    reactivate: "Reativar acesso",
  },
} as const;
