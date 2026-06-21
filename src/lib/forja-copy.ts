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
  return operator.isSovereign ? "Painel Administrativo" : "Painel do Personal";
}

export function resolveForjaPanelSubtitle(operator: ForjaOperatorProfile, athleteCount: number): string {
  const countLabel = `${athleteCount} atleta${athleteCount === 1 ? "" : "s"}`;
  if (operator.isSovereign) {
    return `${operator.displayName} · ${countLabel} · visão de toda a academia`;
  }
  return `${operator.displayName} · ${countLabel} · clientes VIP vinculados`;
}

export const FORJA_WORKSPACE_TABS: Array<{
  id: ForjaWorkspaceTab;
  label: string;
  description: string;
}> = [
  {
    id: "comando",
    label: "Prescrição VIP",
    description: "Treino personalizado visível no dashboard do atleta.",
  },
  {
    id: "planilha",
    label: "Planilha semanal",
    description: "Importe a rotina Seg–Sáb (grupos musculares por dia).",
  },
  {
    id: "antifraude",
    label: "Monitoramento",
    description: "Alertas de integridade e ações administrativas (soberano).",
  },
];

export const FORJA_COPY = {
  sidebarSovereign: "Atletas da academia",
  sidebarPersonal: "Meus clientes VIP",
  emptyAthletes: "Nenhum atleta disponível no seu perfil.",
  emptyAthletesSovereign: "Nenhum cliente cadastrado na academia.",
  selectAthlete: "Selecione um atleta na lista ao lado para continuar.",
  signOut: "Sair",
  prescription: {
    title: "Prescrição de treino VIP",
    hint: "Salva em historico_treinos_personais e aparece na aba Treino do atleta (via Personal).",
    noVipBond:
      "Este atleta não possui vínculo VIP activo. Prescrição personalizada exige bond em forger_client_bonds.",
    exercise: "Exercício",
    weight: "Peso (kg)",
    reps: "Repetições",
    sets: "Séries",
    submit: "Salvar prescrição",
    submitting: "Salvando…",
    success: (name: string, series: string, reps: string, weight: string, exercise: string) =>
      `Prescrição registrada para ${name}: ${series}×${reps} @ ${weight} kg · ${exercise}.`,
    dietTitle: "Plano nutricional",
    dietHint:
      "Módulo de dieta VIP em integração. Atletas com bond activo já veem a aba Dieta no dashboard.",
  },
  planilha: {
    title: "Importar planilha",
    hint: "O ficheiro é lido apenas no seu browser. Nada é enviado para servidores externos.",
    drop: "Arraste um ficheiro .csv ou .xlsx",
    dropBusy: "A processar ficheiro…",
    columns: "Colunas: dia_semana (1–6) · grupo_muscular (PEITO, COSTAS…) · ordem (opcional)",
    chooseFile: "Escolher ficheiro",
    clearPreview: "Limpar pré-visualização",
    selectAthlete: "Selecione um atleta antes de importar.",
    success: (name: string, rows: number) =>
      `Planilha aplicada a ${name} · ${rows} registo(s) na rotina semanal.`,
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
