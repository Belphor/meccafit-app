import type {
  ConsultoriaForjadorTabState,
  DashboardAlunoResumo,
  DashboardForjadorProfile,
  MentorForjadorCard,
} from "@/src/types/portal.types";

export function buildConsultoriaForjadorTabState(
  mentor: MentorForjadorCard | null,
): ConsultoriaForjadorTabState {
  if (!mentor) {
    return {
      status: "sem_forjador",
      mentor: null,
      mensagem: "Nenhum Forjador foi vinculado à sua jornada ainda.",
    };
  }

  return {
    status: "ativo",
    mentor,
    mensagem: `Seu mentor responsável é ${mentor.nome}.`,
  };
}

export function getDashboardAlunosVisiveis(
  forjador: DashboardForjadorProfile,
  alunos: readonly DashboardAlunoResumo[],
): DashboardAlunoResumo[] {
  if (forjador.categoria === "instrutor_casa") {
    return [...alunos];
  }

  return alunos.filter((aluno) => aluno.forjadorId === forjador.id);
}

export function shouldHideMeccafitGeneralStudentList(
  forjador: DashboardForjadorProfile,
): boolean {
  return forjador.categoria === "personal_externo";
}
