import { EXERCISE_PHASE_FORJADO, PLASMA_TITLE } from "@/lib/dashboard-config";



type ExerciseForjadoBadgeProps = {

  className?: string;

};



export function ExerciseForjadoBadge({ className = "" }: ExerciseForjadoBadgeProps) {

  return (

    <span className={`${EXERCISE_PHASE_FORJADO} ${className}`.trim()} role="status">

      <span className="exercise-forjado-forge-body">

        <span className={`${PLASMA_TITLE} exercise-forjado-word`}>CARBONIZADO</span>

      </span>

    </span>

  );

}


