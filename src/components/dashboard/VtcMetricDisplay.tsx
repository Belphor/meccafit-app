import type { CSSProperties } from "react";
import {
  DASHBOARD_INNER_FRAME,
  VTC_EXPLANATION_TEXT,
  VTC_FORMULA_SHORT,
  VTC_FULL_NAME,
  VTC_LABEL,
  VTC_METRIC_ACRONYM,
  VTC_METRIC_FRAME,
  VTC_METRIC_VALUE,
  VTC_SESSION_EXPLANATION,
} from "@/lib/dashboard-config";

type VtcMetricDisplayProps = {
  formattedValue: string;
  variant: "compact" | "panel";
  isIncubating: boolean;
  hasBiologicalBalance?: boolean;
  biologicalMultiplier?: number;
  isChamaReativa?: boolean;
  chamaIntensity?: string;
  showBiologicalBalance?: boolean;
};

export function VtcMetricDisplay({
  formattedValue,
  variant,
  isIncubating,
  hasBiologicalBalance = false,
  biologicalMultiplier = 1,
  isChamaReativa = false,
  chamaIntensity,
  showBiologicalBalance = true,
}: VtcMetricDisplayProps) {
  const isCompact = variant === "compact";
  const valueSize = isCompact
    ? "text-2xl min-[360px]:text-3xl"
    : "text-[clamp(1.65rem,7.5vw,3rem)] sm:text-4xl lg:text-5xl";

  if (isIncubating) {
    return (
      <div className={isCompact ? "min-w-0" : `${DASHBOARD_INNER_FRAME} mt-6`}>
        <p className="font-serif text-base leading-7 text-amber-100/90 sm:text-xl">
          Aguarde o despertar. Suas chamas estão em incubação...
        </p>
      </div>
    );
  }

  return (
    <section
      className={`${VTC_METRIC_FRAME} ${isChamaReativa ? "vtc-metric-live chama-altar-metric-glow" : ""} ${isCompact ? "" : "mt-4 sm:mt-6"}`}
      style={
        chamaIntensity
          ? ({ ["--chama-intensity" as string]: chamaIntensity } as CSSProperties)
          : undefined
      }
      aria-label={`${VTC_FULL_NAME}: ${formattedValue}`}
    >
      <div className="relative z-[1] grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-4">
        <div className="flex min-w-[2.75rem] shrink-0 flex-col border-r border-orange-500/15 pr-2.5 sm:min-w-[4rem] sm:pr-4">
          <span className={VTC_METRIC_ACRONYM}>{VTC_LABEL}</span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-600 sm:text-[10px]">
            {VTC_FORMULA_SHORT}
          </span>
        </div>

        <div className="min-w-0">
          <strong className={`${VTC_METRIC_VALUE} ${valueSize}`}>{formattedValue}</strong>
          <p className={`${VTC_EXPLANATION_TEXT} mt-1.5`}>
            {isCompact ? VTC_SESSION_EXPLANATION : `${VTC_FULL_NAME} · ${VTC_SESSION_EXPLANATION}`}
          </p>
        </div>
      </div>

      {showBiologicalBalance && hasBiologicalBalance ? (
        <p className={`${VTC_EXPLANATION_TEXT} relative z-[1] mt-2 border-t border-orange-500/10 pt-2 text-amber-600/75`}>
          Balança Biológica {biologicalMultiplier}x
        </p>
      ) : null}
    </section>
  );
}
