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
  return operator.isSovereign ? "Central da Forja" : "Painel do Forjador";
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
    description:
      "Escolha o dia da planilha, marque os grupos musculares e monte cada exercício com séries, repetições e descanso.",
  },
  {
    id: "planilha",
    label: "Importar treino",
    description:
      "Envie a planilha com dias, grupos e exercícios. O treino anterior do cliente é substituído por completo.",
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
  vipBond: {
    chip: "Vínculo",
    title: "Status VIP",
    hint: "Torne o cliente VIP para liberar dieta, medidas e treino personal.",
    promote: "Tornar VIP",
    demote: "Remover VIP",
    working: "Atualizando…",
    promoteSuccess: "Cliente tornado VIP.",
    demoteSuccess: "Vínculo VIP removido.",
    suspended: "Conta suspensa — não é possível alterar o VIP.",
    ownedByOther: "Este VIP pertence a outro forjador.",
    unavailable: "Ação indisponível para este cliente.",
  },
  prescription: {
    title: "Prescrição de treino",
    hint: "Escolha o dia da planilha; marque os grupos musculares desse dia e monte cada exercício com séries, repetições e descanso.",
    trainingDay: "Dia da planilha",
    trainingDayHint:
      "O cliente escolhe este dia na aba Treino para ver os grupos e exercícios prescritos.",
    dayMuscles: "Grupos musculares deste dia",
    dayMusclesHint: "Até 5 grupos; aparecem na tabela semanal do cliente.",
    dayMusclesRequired: "Marque pelo menos um grupo muscular para este dia.",
    dayMusclesMax: "Máximo de 5 grupos por dia.",
    exercise: "Exercício",
    videoUrl: "Link do vídeo",
    videoUrlHint:
      "Cole qualquer link do YouTube ou Vimeo (watch, shorts ou youtu.be). O app converte para o cliente. Opcional.",
    videoUrlInvalid: "Informe um link válido começando com http:// ou https://.",
    muscleGroup: "Grupo muscular",
    progression: "Técnica (selecione uma ou mais)",
    repsPerSet: "Repetições por série",
    repsFailure: "FALHA",
    sets: "Séries",
    restExercise: "Descanso deste exercício (segundos)",
    restDefault: "Descanso padrão (segundos)",
    restHint: "Usado quando o exercício não tiver descanso próprio.",
    cardioMeta: "Meta de cardio (minutos/dia)",
    cardioHint: "Tempo diário de cardio que o cliente vê na aba Treino (de 5 a 180 min).",
    submit: "Salvar treino",
    submitting: "Salvando…",
    success: (name: string, dayLabel: string, series: string, repsSummary: string, exercise: string) =>
      `Treino salvo para ${name}, ${dayLabel}: ${series} séries, ${repsSummary}, ${exercise}.`,
  },
  diet: {
    title: "Plano alimentar",
    hint: "Plano de longo prazo publicado na aba Nutrição do cliente VIP.",
    lockedHint: "Este cliente ainda não é VIP; vincule-o antes de montar a dieta.",
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
    mealsHint: "Liste os alimentos de cada refeição com horário e porções.",
    addMeal: "Adicionar refeição",
    submit: "Publicar plano",
    submitting: "Publicando…",
    success: (name: string, titulo: string) => `Plano «${titulo}» publicado para ${name}.`,
  },
  planilha: {
    title: "Importar treino",
    hint: "Envie a planilha com dias, grupos e exercícios. O treino anterior do cliente é substituído por completo.",
    drop: "Arraste a planilha aqui",
    dropBusy: "Lendo arquivo…",
    columns:
      "Colunas obrigatórias: dia_semana (1 a 6), grupo_muscular, exercicio, repeticoes, series. Opcional: peso, descanso_segundos, tecnica, meta_cardio.",
    chooseFile: "Escolher planilha",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de enviar.",
    success: (name: string, rows: number) =>
      `Treino forjado para ${name}: ${rows} exercício(s) na semana.`,
  },
  planilhaDieta: {
    title: "Importar planilha",
    hint: "Disponível apenas para clientes VIP.",
    vipRequired: "Selecione um cliente VIP.",
    drop: "Arraste a planilha aqui",
    dropBusy: "Lendo arquivo…",
    columns: "Inclua título, metas e refeições do dia.",
    chooseFile: "Escolher planilha",
    clearPreview: "Limpar",
    selectAthlete: "Selecione um cliente antes de enviar.",
    success: (name: string, titulo: string, meals: number) =>
      `Plano «${titulo}» aplicado a ${name}: ${meals} refeição(ões).`,
  },
  searchPlaceholder: "Pesquisar por nome",
  searchEmpty: "Nenhum cliente corresponde à pesquisa.",
  monitor: {
    title: "Monitoramento",
    hint:
      "Acompanhe o Volume de Carga Máxima (VTC) de todos os clientes da academia em tempo real.",
    globalHint:
      "Todos os forjadores podem consultar; suspensões e punições ficam exclusivamente com o Forjador Soberano.",
    filterLabel: "Filtrar clientes",
    segments: {
      vip: "VIPs",
      comum: "Comuns",
      suspenso: "Suspensos",
    },
    statsTitle: "Resumo do monitoramento",
    statsHint:
      "Linhas em amarelo indicam volume muito acima da média recente do cliente.",
    statsTotal: "Clientes",
    statsVip: "VIPs",
    statsComum: "Comuns",
    statsVtcToday: "VTC hoje",
    statsSpikes: "Alertas",
    sidebarListLabel: "Lista de clientes",
    sidebarSearchHint:
      "Pesquise pelo nome e expanda a lista para selecionar um cliente.",
    clearSelection: "Limpar seleção",
    clientDetail: "Detalhe do cliente",
    vtcFeedTitle: "Volume de treino hoje",
    vtcFeedSubtitle: "Ranking por atividade",
    vtcFeedHint:
      "Toque em uma linha para ver os alertas e corrigir o volume daquele cliente.",
    vtcFeedSearch: "Pesquisar cliente na tabela",
    vtcFeedPrev: "Anterior",
    vtcFeedNext: "Próxima",
    vtcFeedPageLabel: (page: number, total: number, count: number) =>
      `Página ${page} de ${total}, ${count} cliente${count === 1 ? "" : "s"}`,
    vtcAlertCritical: "Urgente",
    vtcPhaseTableTitle: "Chama Acumulada da Linhagem",
    vtcPhaseTableHint:
      "A fase do cliente depende do VTC acumulado nos últimos 30 dias. Diferente das Brasas Musculares (VTC por grupo em 14 dias) e da Chama do Altar (VTC de hoje).",
    vtcPhaseColPhase: "Fase",
    vtcPhaseColName: "Nome",
    vtcPhaseColVolume: "Volume em 30 dias",
    vtcPhaseColMeaning: "Significado",
    vtcFeedEmpty: "Nenhum cliente encontrado.",
    vtcColClient: "Cliente",
    vtcColType: "Tipo",
    vtcColForjador: "Forjador",
    vtcColToday: "Hoje",
    vtcColAvg7d: "Média 7 dias",
    vtcCol30d: "Últimos 30 dias",
    vtcColPhase: "Fase",
    vtcColAccess: "Acesso",
    vtcColPhaseHint: "Alinhada ao volume dos últimos 30 dias",
    vtcSpike: "Alerta",
    vtcOwnClient: "Seu cliente",
    vtcOtherClient: "Outro forjador",
    globalAlerts: "Alertas gerais",
    globalEmpty: "Nenhum alerta no momento.",
    refresh: "Atualizar",
    loading: "Analisando…",
    empty: "Tudo certo. Nenhum aviso para este cliente.",
    alertExpandHint: "Toque para ver detalhes",
    clientSelectedHint:
      "Avisos do cliente selecionado. Se o volume de hoje estiver incorreto, use «Corrigir volume de hoje» abaixo para ajustar.",
    readOnly:
      "Você pode corrigir quanto o cliente treinou hoje. Suspender conta ou mudar fase só o Forjador Soberano pode fazer.",
    tribunal: "Ações especiais",
    tribunalHint: "Use somente quando realmente precisar; tudo fica registrado no auditório da Forja.",
    resetMonthHint:
      "Apaga todo o treino deste mês, zera as cargas e volta o cliente para a fase inicial. Indicado para fraude, erro grave ou quando o cliente pedir para recomeçar do zero.",
    phase: "Fase do cliente (1 a 5)",
    phaseHint: "1 = início; 5 = fase mais avançada.",
    vtcToday: "Corrigir volume de hoje",
    vtcTodaySet: "Total de kg treinados hoje",
    vtcTodayHint:
      "Digite quantos kg o cliente levantou hoje. O total dos últimos 30 dias muda junto; amanhã o dia recomeça automaticamente.",
    vtcResetToday: "Zerar volume de hoje",
    modifyStats: "Salvar fase",
    adjustVtc: "Salvar correção",
    adjustVtcSuccess: "Volume de hoje atualizado.",
    invalidVtc: "Informe um valor em kg ou marque zerar.",
    reactivate: "Reativar acesso",
    deactivate: "Suspender acesso",
    purify: "Reiniciar mês do cliente",
    purifyConfirm: (name: string) =>
      `Reiniciar o mês de ${name}? O volume deste mês será apagado e a fase volta ao início.`,
    deactivateConfirm: (name: string) =>
      `Suspender ${name}? O cliente não conseguirá acessar o app até ser reativado.`,
    actionSuccess: "Alteração salva.",
    invalidPhase: "A fase deve ser entre 1 e 5.",
  },
  medidas: {
    title: "Medidas corporais",
    description:
      "Registre peso, dobras e composição do cliente VIP; guarde no aparelho e publique quando estiver pronto.",
    formTitle: "Nova medição",
    historyTitle: "Histórico",
    publish: "Publicar para o cliente",
    saveLocal: "Salvar rascunho",
    skinfolds: "Dobras da pele (mm)",
    saveEntry: "Registrar medição",
    savingEntry: "Salvando…",
    syncingEntry: "Publicando…",
    emptyHistory: "Sem registros. Adicione a primeira medição acima.",
    loadingHistory: "Carregando histórico…",
  },
  sovereign: {
    title: "Ferramentas avançadas",
    description:
      "Use apenas quando precisar corrigir dados ou suspender um cliente; as ações ficam registradas.",
    clearLocal: "Apagar rascunhos deste aparelho",
    deleteRemote: "Apagar medição publicada",
    resetMonth: "Reiniciar mês do cliente",
    suspend: "Suspender acesso",
    reactivate: "Reativar acesso",
  },
} as const;
