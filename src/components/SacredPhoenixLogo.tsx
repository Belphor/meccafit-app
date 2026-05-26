import {
  PHOENIX_EMBLEM_AURA,
  PHOENIX_EMBLEM_SVG,
} from "@/lib/dashboard-config";

export type PhoenixTone = "cliente" | "forja";

type PhoenixPalette = {
  logoStroke: string;
  logoSecondaryStroke: string;
  aura: string;
};

const PHOENIX_PALETTES: Record<PhoenixTone, PhoenixPalette> = {
  cliente: {
    logoStroke: "#f97316",
    logoSecondaryStroke: "#fbbf24",
    aura: "from-orange-950/10 via-orange-600/20 to-amber-400/10",
  },
  forja: {
    logoStroke: "#dbeafe",
    logoSecondaryStroke: "#93c5fd",
    aura: "from-blue-950/10 via-slate-200/16 to-cyan-300/10",
  },
};

type SacredPhoenixLogoProps = {
  tone?: PhoenixTone;
  variant?: "login" | "hero" | "header";
  altarEnergy?: number;
  className?: string;
};

const VARIANT_LAYOUT = {
  login: {
    shell: "size-48",
    svg: "size-36 sm:size-40",
    auraInset: "inset-3",
    auraOpacity: 0.8,
  },
  hero: {
    shell: "size-32 sm:size-36",
    svg: "size-28 sm:size-32",
    auraInset: "inset-2 sm:inset-3",
    auraOpacity: 0.72,
  },
  header: {
    shell: "size-16 sm:size-[4.5rem]",
    svg: "size-12 sm:size-14",
    auraInset: "inset-1.5 sm:inset-2",
    auraOpacity: 0.65,
  },
} as const;

function clampEnergy(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function SacredPhoenixLogo({
  tone = "cliente",
  variant = "login",
  altarEnergy = 0,
  className = "",
}: SacredPhoenixLogoProps) {
  const energy = clampEnergy(altarEnergy);
  const palette = PHOENIX_PALETTES[tone];
  const layout = VARIANT_LAYOUT[variant];
  const ringOpacity = 0.14 + energy * 0.12;
  const starOpacity = 0.28 + energy * 0.12;
  const wingOpacity = 0.52 + energy * 0.28;
  const auraOpacity = layout.auraOpacity + energy * 0.18;

  return (
    <div className={`relative grid place-items-center ${layout.shell} ${className}`.trim()}>
      <div
        className={`${PHOENIX_EMBLEM_AURA} ${layout.auraInset} bg-gradient-to-br ${palette.aura}`}
        style={{ opacity: auraOpacity }}
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 240 240"
        aria-label="Logotipo linear sagrado da Fênix"
        className={`${PHOENIX_EMBLEM_SVG} ${layout.svg}`}
      >
        <circle
          cx="120"
          cy="120"
          r="88"
          stroke={palette.logoStroke}
          strokeOpacity={ringOpacity}
          strokeWidth="1"
        />
        <circle
          cx="120"
          cy="120"
          r="62"
          stroke={palette.logoSecondaryStroke}
          strokeOpacity={ringOpacity}
          strokeWidth="1"
        />
        <path
          d="M120 18 144 82 212 92 160 136 176 204 120 168 64 204 80 136 28 92 96 82 120 18Z"
          stroke={palette.logoStroke}
          strokeOpacity={starOpacity}
          strokeWidth="1"
        />
        <path
          d="M120 34c18 32 8 54-10 78 22-13 36-36 38-64 31 31 44 82 14 122-14 18-29 32-42 42-13-10-28-24-42-42-30-40-17-91 14-122 2 28 16 51 38 64-18-24-28-46-10-78Z"
          stroke={palette.logoStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.82 + energy * 0.18}
        />
        <path
          d="M120 82c13 18 12 35 2 53 13-6 22-20 24-36 19 24 12 57-26 91-38-34-45-67-26-91 2 16 11 30 24 36-10-18-11-35 2-53Z"
          stroke={palette.logoSecondaryStroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={wingOpacity}
        />
        <path
          d="M55 128c27-10 46-7 65 12 19-19 38-22 65-12"
          stroke={palette.logoSecondaryStroke}
          strokeOpacity={0.52 + energy * 0.28}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M82 72 120 140 158 72M78 174h84M96 194h48"
          stroke={palette.logoStroke}
          strokeOpacity={0.22 + energy * 0.18}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M120 18v194M28 92h184M64 204 176 36M176 204 64 36"
          stroke={palette.logoStroke}
          strokeOpacity={0.08 + energy * 0.06}
          strokeWidth="1"
        />
        <circle
          cx="120"
          cy="140"
          r="4"
          fill={palette.logoSecondaryStroke}
          fillOpacity={0.72 + energy * 0.28}
          stroke="none"
        />
      </svg>
    </div>
  );
}
