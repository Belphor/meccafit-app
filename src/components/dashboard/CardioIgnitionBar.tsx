import type { CardioThermalBand } from "@/lib/cardio-voo-cinzas";

type CardioIgnitionBarProps = {
  percent: number;
  band: CardioThermalBand;
  emphasized?: boolean;
  /** Sem animação plasma — uso no Foco Hermético */
  calm?: boolean;
  className?: string;
};

export function CardioIgnitionBar({
  percent,
  band,
  emphasized = false,
  calm = false,
  className = "",
}: CardioIgnitionBarProps) {
  const fillWidth = `${Math.min(100, Math.max(0, percent))}%`;

  const trackClass =
    band === "latent"
      ? "border-orange-500/15 bg-black/60"
      : band === "active"
        ? "border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
        : "border-[#FFD700]/40 shadow-[0_0_36px_rgba(255,215,0,0.35)]";

  const eliteFill = calm
    ? "bg-gradient-to-r from-amber-400 via-[#FFD700] to-yellow-200"
    : "bg-gradient-to-r from-amber-400 via-[#FFD700] to-yellow-200 solar-plasma-text";

  const fillClass =
    band === "latent"
      ? "bg-gradient-to-r from-orange-950/90 via-amber-950/55 to-amber-900/45"
      : band === "active"
        ? "bg-gradient-to-r from-amber-900 via-amber-500 to-orange-400"
        : eliteFill;

  const heightClass = emphasized ? "h-4 sm:h-5" : "h-3";

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden rounded-full border ${heightClass} ${trackClass}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Barra de Ignição Fenyxia"
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${fillClass}`}
          style={{ width: fillWidth }}
        />
        {band === "elite" ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.55) 50%, transparent 100%)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
