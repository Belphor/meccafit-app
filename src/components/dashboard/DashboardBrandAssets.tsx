import { SacredPhoenixLogo } from "@/components/SacredPhoenixLogo";

/** Brasão central do dashboard — mesma fênix do login */
export function SacredPhoenixSigil({ altarEnergy = 0 }: { altarEnergy?: number }) {  return <SacredPhoenixLogo tone="cliente" variant="hero" altarEnergy={altarEnergy} />;
}

export function CameraGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-4 fill-none stroke-current ${className}`}>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" strokeWidth="1.4" />
    </svg>
  );
}
