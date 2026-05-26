import { EXERCISE_PHASE_SUPERACAO, PLASMA_TITLE } from "@/lib/dashboard-config";

type SuperacaoEmChamasBadgeProps = {
  className?: string;
};

export function SuperacaoEmChamasBadge({ className = "" }: SuperacaoEmChamasBadgeProps) {
  return (
    <span className={`${EXERCISE_PHASE_SUPERACAO} ${className}`.trim()} role="status">
      <span className="superacao-forge-body">
        <span className="superacao-forge-ember" aria-hidden="true" />
        <span className="superacao-forge-copy">
          <span className={`${PLASMA_TITLE} superacao-forge-word`}>SUPERAÇÃO</span>
          <span className="superacao-forge-sub">em chamas</span>
        </span>
      </span>
    </span>
  );
}
