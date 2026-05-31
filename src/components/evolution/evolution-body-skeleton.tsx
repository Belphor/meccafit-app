"use client";

type EvolutionBodySkeletonProps = {
  className?: string;
};

export function EvolutionBodySkeleton({ className = "" }: EvolutionBodySkeletonProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}
      aria-busy="true"
      aria-label="Carregando mapa térmico muscular"
    >
      {(["Visão Frontal", "Visão Dorsal"] as const).map((label) => (
        <div key={label} className="flex flex-col items-center rounded-xl bg-black/40 p-4">
          <div className="mb-3 h-3 w-28 animate-pulse rounded-full bg-neutral-800/90" />
          <div className="aspect-[200/360] w-full max-w-[220px] animate-pulse rounded-xl bg-gradient-to-b from-cyan-950/20 via-neutral-900/60 to-black/80" />
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
