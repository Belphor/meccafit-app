import { EXERCISE_PHASE_SUPERACAO, PLASMA_TITLE } from "@/lib/dashboard-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";

type SuperacaoEmChamasBadgeProps = {
  className?: string;
};

export function SuperacaoEmChamasBadge({ className = "" }: SuperacaoEmChamasBadgeProps) {
  return (
    <span
      className={`${EXERCISE_PHASE_SUPERACAO} ${className}`.trim()}
      role="status"
      title={FENIX_EVOLUTION_SYSTEMS.ascensao.explanation}
    >
      <span className="superacao-forge-body">
        <span className="superacao-forge-ember" aria-hidden="true" />
        <span className="superacao-forge-copy">
          <span className={`${PLASMA_TITLE} superacao-forge-word`}>ASCENSÃO</span>
          <span className="superacao-forge-sub">recorde · não é Labareda</span>
        </span>
      </span>
    </span>
  );
}
