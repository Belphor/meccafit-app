import { EXERCISE_PHASE_EM_CHAMAS, PLASMA_TITLE } from "@/lib/dashboard-config";

type EmChamasBadgeProps = {
  className?: string;
};

export function EmChamasBadge({ className = "" }: EmChamasBadgeProps) {
  return (
    <span className={`${EXERCISE_PHASE_EM_CHAMAS} ${className}`.trim()} role="status">
      <span className="em-chamas-forge-body">
        <span className="em-chamas-prefix">EM</span>
        <span className={`${PLASMA_TITLE} em-chamas-word`}>CHAMAS</span>
      </span>
    </span>
  );
}
