export type ClienteAbaId =
  | "matrix_alma"
  | "portal_brasa"
  | "iris_evolucao"
  | "fenix_pureza"
  | "renascimento"
  | "historico_sagrado"
  | "consultoria_forjador";

export type ForjadorCategoria = "instrutor_casa" | "personal_externo";

export type ComunicacaoMisticaKind = "whatsapp" | "email" | "chamada" | "agenda";

export type ComunicacaoMisticaAction = {
  kind: ComunicacaoMisticaKind;
  label: string;
  href: string;
};

export type MentorForjadorCard = {
  forjadorId: string;
  nome: string;
  categoria: ForjadorCategoria;
  especialidade?: string;
  assinatura?: string;
  comunicacoes: ComunicacaoMisticaAction[];
};

export type ConsultoriaForjadorTabState =
  | {
      status: "sem_forjador";
      mentor: null;
      mensagem: string;
    }
  | {
      status: "ativo";
      mentor: MentorForjadorCard;
      mensagem: string;
    };

export type ClienteDashboardTab = {
  id: ClienteAbaId;
  label: string;
  route: string;
};

export type DashboardForjadorProfile = {
  id: string;
  nome: string;
  categoria: ForjadorCategoria;
};

export type DashboardAlunoResumo = {
  clienteId: string;
  nome: string;
  forjadorId: string | null;
  statusContrato: string;
};
