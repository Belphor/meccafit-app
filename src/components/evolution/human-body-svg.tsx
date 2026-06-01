"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  buildCalorPayloadFingerprint,
  getHudPath,
  hudMuscleDomId,
  HUD_GROUP_TO_SOVEREIGN,
  HUMAN_BODY_VECTORS,
  HUMAN_BODY_VIEWBOX,
  HUD_MUSCLE_RENDER_ORDER,
  PURITY_PENALTY_THRESHOLD,
  type CongelamentoPorMembro,
  type HudBodyFacing,
  type HudMuscleGroup,
  type MuscleCalorRow,
  type NiveisTermicos,
  type SovereignMuscleId,
  type ThermalStatus,
} from "@/components/evolution/human-body-constants";
import { MuscleTooltip } from "@/components/evolution/muscle-tooltip";

const FLASH_ANIMATION = "animate-[flash_1.4s_ease-in-out]";
const FLASH_DURATION_MS = 1400;

type HoverAnchor = { x: number; y: number };

type PanelMuscleSlot = {
  group: HudMuscleGroup;
  pathD: string;
  wireD: string;
};

/**
 * Painel anatômico reativo · 6 grupos (peito, ombros, braços, costas, abdômen, pernas)
 * IRIS: degradação passiva <50% ignição · flash 1,4s · estase por membro
 */
export type HumanBodySvgProps = {
  /** Níveis térmicos dos 6 grupos musculares incluindo `ombros` */
  niveis_termicos: NiveisTermicos;
  /** Pureza da Fênix · penaliza saturação abaixo de 50% */
  indice_ignicao: number;
  /** Desativa filtros SVG pesados · cores sólidas apenas */
  performanceMode?: boolean;
  /** Estase VIP por membro · `is_frozen` granular */
  congelamento_por_membro?: CongelamentoPorMembro;
  /** Linhas RPC · disparam flash IRIS ao mudar */
  calorRows?: MuscleCalorRow[];
  activeMuscle?: SovereignMuscleId | null;
  className?: string;
  onMuscleSelect?: (muscleId: SovereignMuscleId) => void;
};

type ThermalPaint = {
  fill: string;
  stroke: string;
  className: string;
  opacity: number;
  filter?: string;
};

type HudDefsProps = {
  prefix: string;
  performanceMode: boolean;
};

function HudSvgDefs({ prefix, performanceMode }: HudDefsProps) {
  const cosmic = `${prefix}-grad-cosmic`;
  const frozen = `${prefix}-grad-frozen`;
  const brasa = `${prefix}-grad-brasa`;
  const faisca = `${prefix}-grad-faisca`;
  const glowCosmic = `${prefix}-fx-cosmic-glow`;
  const glowLabareda = `${prefix}-fx-labareda-glow`;
  const glowFrozen = `${prefix}-fx-frozen-glow`;

  return (
    <defs>
      <linearGradient id={cosmic} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="40%" stopColor="#db2777" />
        <stop offset="100%" stopColor="#f472b6" />
      </linearGradient>

      <linearGradient id={frozen} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.62" />
        <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
      </linearGradient>

      <linearGradient id={brasa} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="55%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>

      <linearGradient id={faisca} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>

      <radialGradient id={`${prefix}-hud-ambient`} cx="50%" cy="36%" r="68%">
        <stop offset="0%" stopColor="rgba(6,182,212,0.16)" />
        <stop offset="55%" stopColor="rgba(124,58,237,0.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>

      <radialGradient id={`${prefix}-body-depth`} cx="50%" cy="40%" r="58%">
        <stop offset="0%" stopColor="rgba(15,23,42,0.08)" />
        <stop offset="55%" stopColor="rgba(0,0,0,0.35)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.62)" />
      </radialGradient>

      <linearGradient id={`${prefix}-silhouette-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(6,182,212,0.55)" />
        <stop offset="50%" stopColor="rgba(124,58,237,0.35)" />
        <stop offset="100%" stopColor="rgba(6,182,212,0.45)" />
      </linearGradient>

      {!performanceMode ? (
        <>
          <filter id={glowCosmic} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 0.2 0.8 0 0  0.8 0.2 1 0 0  0 0 0 1 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={glowLabareda} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={glowFrozen} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </>
      ) : null}
    </defs>
  );
}

function resolveMuscleFrozen(
  group: HudMuscleGroup,
  congelamento?: CongelamentoPorMembro,
): boolean {
  return congelamento?.[group] === true;
}

function resolveThermalPaint(
  status: ThermalStatus,
  muscleFrozen: boolean,
  performanceMode: boolean,
  prefix: string,
): ThermalPaint {
  const cosmic = `${prefix}-grad-cosmic`;
  const frozen = `${prefix}-grad-frozen`;
  const brasa = `${prefix}-grad-brasa`;
  const faisca = `${prefix}-grad-faisca`;
  const glowCosmic = `${prefix}-fx-cosmic-glow`;
  const glowLabareda = `${prefix}-fx-labareda-glow`;
  const glowFrozen = `${prefix}-fx-frozen-glow`;

  const baseTransition = "transition-[fill,filter,opacity] duration-300";

  if (muscleFrozen) {
    return {
      fill: `url(#${frozen})`,
      stroke: "rgba(34,211,238,0.95)",
      className: `${baseTransition} evolution-muscle-frozen`,
      opacity: 0.74,
      filter: performanceMode ? undefined : `url(#${glowFrozen})`,
    };
  }

  const paints: Record<ThermalStatus, Omit<ThermalPaint, "className"> & { extraClass: string }> =
    {
      CINZAS: {
        fill: "#374151",
        stroke: "rgba(100,116,139,0.45)",
        opacity: 0.58,
        extraClass: "",
      },
      FAISCA: {
        fill: performanceMode ? "#f97316" : `url(#${faisca})`,
        stroke: "rgba(251,146,60,0.75)",
        opacity: 0.9,
        extraClass: performanceMode ? "animate-pulse" : "evolution-muscle-faisca animate-pulse",
      },
      BRASA: {
        fill: performanceMode ? "#c2410c" : `url(#${brasa})`,
        stroke: "rgba(234,88,12,0.82)",
        opacity: 0.92,
        extraClass: "",
      },
      LABAREDA: {
        fill: "#dc2626",
        stroke: "rgba(248,113,113,0.9)",
        opacity: 0.96,
        extraClass: performanceMode ? "" : "evolution-muscle-labareda drop-shadow-[0_0_6px_#dc2626]",
        filter: performanceMode ? undefined : `url(#${glowLabareda})`,
      },
      "FOGO CÓSMICO": {
        fill: `url(#${cosmic})`,
        stroke: "rgba(236,72,153,0.95)",
        opacity: 0.98,
        extraClass: performanceMode
          ? ""
          : "evolution-muscle-cosmic drop-shadow-[0_0_12px_rgba(219,39,119,0.8)] animate-[pulse_0.8s_infinite]",
        filter: performanceMode ? undefined : `url(#${glowCosmic})`,
      },
    };

  const paint = paints[status];

  return {
    fill: paint.fill,
    stroke: paint.stroke,
    opacity: paint.opacity,
    filter: paint.filter,
    className: [baseTransition, paint.extraClass].filter(Boolean).join(" "),
  };
}

function buildPanelSlots(facing: HudBodyFacing): PanelMuscleSlot[] {
  return HUD_MUSCLE_RENDER_ORDER[facing].flatMap((group) => {
    const vector = getHudPath(facing, group);
    if (!vector) return [];
    return [{ group, pathD: vector.d, wireD: vector.wire }];
  });
}

type EmberAnchor = [number, number];
type EmberAnchorMap = Partial<Record<HudMuscleGroup, EmberAnchor[]>>;

function renderThermalEmbers(
  status: ThermalStatus,
  muscleFrozen: boolean,
  performanceMode: boolean,
  facing: HudBodyFacing,
  group: HudMuscleGroup,
): ReactNode {
  if (performanceMode || muscleFrozen || (status !== "LABAREDA" && status !== "FOGO CÓSMICO")) {
    return null;
  }

  const anchors: Record<HudBodyFacing, EmberAnchorMap> = {
    front: {
      ombros: [
        [142, 142],
        [258, 142],
      ],
      peito: [
        [174, 168],
        [226, 168],
      ],
      bracos: [
        [116, 280],
        [284, 280],
      ],
      abdomen: [[200, 234]],
      pernas: [
        [174, 396],
        [226, 396],
      ],
    },
    back: {
      ombros: [
        [126, 142],
        [274, 142],
      ],
      costas: [
        [174, 168],
        [226, 168],
      ],
      bracos: [
        [108, 278],
        [292, 278],
      ],
      pernas: [
        [174, 396],
        [226, 396],
      ],
    },
  };

  const points = anchors[facing][group] ?? [];
  const color = status === "FOGO CÓSMICO" ? "#ec4899" : "#ef4444";

  return (
    <g pointerEvents="none" aria-hidden>
      {points.map(([cx, cy], index) => (
        <circle
          key={`${facing}-${group}-ember-${index}`}
          cx={cx}
          cy={cy}
          r={status === "FOGO CÓSMICO" ? 3.2 : 2.4}
          fill={color}
          className="evolution-thermal-ember"
          style={{ animationDelay: `${index * 0.35}s` }}
          opacity={0.45}
        />
      ))}
    </g>
  );
}

type HudPanelProps = {
  facing: HudBodyFacing;
  title: string;
  defsPrefix: string;
  niveis_termicos: NiveisTermicos;
  indice_ignicao: number;
  performanceMode: boolean;
  congelamento_por_membro?: CongelamentoPorMembro;
  activeMuscle?: SovereignMuscleId | null;
  flashActive: boolean;
  onMuscleEnter: (group: HudMuscleGroup, anchor: HoverAnchor) => void;
  onMuscleLeave: () => void;
  onMuscleSelect?: (muscleId: SovereignMuscleId) => void;
};

function HudPanel({
  facing,
  title,
  defsPrefix,
  niveis_termicos,
  indice_ignicao,
  performanceMode,
  congelamento_por_membro,
  activeMuscle,
  flashActive,
  onMuscleEnter,
  onMuscleLeave,
  onMuscleSelect,
}: HudPanelProps) {
  const slots = useMemo(() => buildPanelSlots(facing), [facing]);
  const silhouette = HUMAN_BODY_VECTORS.silhouette[facing];
  const silhouetteWire = HUMAN_BODY_VECTORS.silhouetteWire[facing];
  const lineArt = HUMAN_BODY_VECTORS.lineArt[facing];
  const hudArcs = HUMAN_BODY_VECTORS.hudArcs[facing];
  const spine = HUMAN_BODY_VECTORS.spine[facing];
  const purityDegraded = indice_ignicao < PURITY_PENALTY_THRESHOLD;
  const purityFilterClass = purityDegraded ? "filter saturate-30 contrast-125" : "";

  const handlePointer = (event: MouseEvent<SVGPathElement>, group: HudMuscleGroup) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onMuscleEnter(group, {
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const gridY = [104, 184, 264, 344, 424, 504, 576];
  const gridX = [80, 160, 240, 320];

  return (
    <div
      className={`evolution-hud-panel relative flex h-full min-h-[460px] flex-1 flex-col items-center justify-center rounded-xl bg-black/65 p-3 shadow-[inset_0_0_48px_rgba(0,0,0,0.5)] ${
        flashActive ? "evolution-hud-panel--flash" : ""
      }`}
    >
      {!performanceMode ? <div className="evolution-hud-scanline" aria-hidden /> : null}
      {purityDegraded && !performanceMode ? (
        <div className="evolution-hud-purity-vignette" aria-hidden />
      ) : null}

      <div className="mb-3 flex w-full max-w-[320px] items-center justify-between gap-2 px-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/85">
          {title}
        </p>
        <p className="font-mono text-[9px] tabular-nums uppercase tracking-[0.14em] text-neutral-500">
          IGN {Math.round(indice_ignicao)}%
        </p>
      </div>

      <svg
        viewBox={HUMAN_BODY_VIEWBOX.attribute}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Mapa térmico ${facing === "front" ? "frontal" : "dorsal"}`}
        className="aspect-[400/600] h-auto w-full max-w-[320px] flex-1"
      >
        <HudSvgDefs prefix={defsPrefix} performanceMode={performanceMode} />

        <g opacity={0.26} stroke="rgba(6,182,212,0.11)" strokeWidth="0.4">
          {gridY.map((y) => (
            <line key={`h-${y}`} x1={32} y1={y} x2={368} y2={y} />
          ))}
          {gridX.map((x) => (
            <line key={`v-${x}`} x1={x} y1={48} x2={x} y2={584} />
          ))}
        </g>

        <rect
          x={48}
          y={48}
          width={304}
          height={536}
          fill={`url(#${defsPrefix}-hud-ambient)`}
          rx={16}
        />

        <path
          d={silhouette}
          fill="rgba(3,7,18,0.97)"
          stroke={`url(#${defsPrefix}-silhouette-rim)`}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path
          d={silhouette}
          fill={`url(#${defsPrefix}-body-depth)`}
          pointerEvents="none"
        />

        <path
          d={hudArcs}
          fill="none"
          stroke="rgba(6,182,212,0.22)"
          strokeWidth={0.85}
          strokeLinecap="round"
          pointerEvents="none"
        />

        {slots.map((slot) => {
          const status = niveis_termicos[slot.group];
          const muscleFrozen = resolveMuscleFrozen(slot.group, congelamento_por_membro);
          const sovereignId = HUD_GROUP_TO_SOVEREIGN[slot.group];
          const isActive = activeMuscle === sovereignId;
          const paint = resolveThermalPaint(
            status,
            muscleFrozen,
            performanceMode,
            defsPrefix,
          );
          const musclePurityClass = purityDegraded && !muscleFrozen ? purityFilterClass : "";

          return (
            <g
              key={`${facing}-${slot.group}`}
              id={hudMuscleDomId(slot.group)}
              data-hud-muscle={slot.group}
              data-thermal={status}
              data-frozen={muscleFrozen ? "true" : "false"}
            >
              <path
                d={slot.pathD}
                fill={paint.fill}
                stroke={isActive ? "rgba(251,191,36,0.98)" : paint.stroke}
                strokeWidth={isActive ? 2.2 : muscleFrozen ? 1.5 : 1.05}
                strokeLinejoin="round"
                className={`${paint.className} ${musclePurityClass} ${flashActive ? FLASH_ANIMATION : ""}`}
                style={{
                  opacity: paint.opacity,
                  filter: paint.filter,
                }}
              />
              {renderThermalEmbers(
                status,
                muscleFrozen,
                performanceMode,
                facing,
                slot.group,
              )}
              <path
                d={slot.wireD}
                fill="none"
                stroke={isActive ? "rgba(251,191,36,0.82)" : "rgba(6,182,212,0.44)"}
                strokeWidth={isActive ? 1.25 : 0.8}
                strokeLinecap="round"
                className={musclePurityClass || undefined}
                pointerEvents="none"
              />
              <path
                d={slot.pathD}
                fill="transparent"
                stroke="transparent"
                className="cursor-pointer evolution-hud-hover"
                onMouseEnter={(event) => handlePointer(event, slot.group)}
                onMouseMove={(event) => handlePointer(event, slot.group)}
                onMouseLeave={onMuscleLeave}
                onClick={() => onMuscleSelect?.(sovereignId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onMuscleSelect?.(sovereignId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={slot.group}
                aria-pressed={isActive}
              />
            </g>
          );
        })}

        <path
          d={lineArt}
          fill="none"
          stroke="rgba(6,182,212,0.28)"
          strokeWidth={0.7}
          strokeLinecap="round"
          pointerEvents="none"
        />

        <path
          d={spine}
          fill="none"
          stroke="rgba(6,182,212,0.48)"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeDasharray="3 5"
          pointerEvents="none"
        />

        <path
          d={silhouetteWire}
          fill="none"
          stroke="rgba(6,182,212,0.16)"
          strokeWidth={0.65}
          strokeDasharray="4 6"
          pointerEvents="none"
        />

        <path
          d="M52 52 L52 76 M52 52 L76 52 M348 52 L348 76 M348 52 L324 52 M52 576 L52 552 M52 576 L76 576 M348 576 L348 552 M348 576 L324 576"
          stroke="rgba(6,182,212,0.52)"
          strokeWidth={1.25}
          fill="none"
          pointerEvents="none"
        />

        <text
          x={60}
          y={68}
          fill="rgba(6,182,212,0.55)"
          fontSize={8}
          fontFamily="ui-monospace, monospace"
          pointerEvents="none"
        >
          FENYXIA
        </text>
        <text
          x={340}
          y={68}
          fill="rgba(6,182,212,0.55)"
          fontSize={8}
          fontFamily="ui-monospace, monospace"
          textAnchor="end"
          pointerEvents="none"
        >
          HUD·2D
        </text>
      </svg>
    </div>
  );
}

export function HumanBodySvg({
  niveis_termicos,
  indice_ignicao,
  performanceMode = false,
  congelamento_por_membro,
  calorRows,
  activeMuscle,
  className = "",
  onMuscleSelect,
}: HumanBodySvgProps) {
  const [hoveredGroup, setHoveredGroup] = useState<HudMuscleGroup | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<HoverAnchor | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const fingerprintRef = useRef("");
  const instanceId = useId().replace(/:/g, "");

  const calorByMuscle = useMemo(() => {
    const map = new Map<SovereignMuscleId, MuscleCalorRow>();
    for (const row of calorRows ?? []) {
      map.set(row.membro_principal, row);
    }
    return map;
  }, [calorRows]);

  useEffect(() => {
    const fingerprint = buildCalorPayloadFingerprint(calorRows ?? [], indice_ignicao);
    if (!fingerprintRef.current) {
      fingerprintRef.current = fingerprint;
      return;
    }
    if (fingerprintRef.current === fingerprint) return;

    fingerprintRef.current = fingerprint;
    setFlashActive(true);
    const timer = window.setTimeout(() => setFlashActive(false), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [calorRows, indice_ignicao]);

  const hoveredRow = hoveredGroup
    ? calorByMuscle.get(HUD_GROUP_TO_SOVEREIGN[hoveredGroup])
    : undefined;

  const handleMuscleEnter = useCallback((group: HudMuscleGroup, anchor: HoverAnchor) => {
    setHoveredGroup(group);
    setTooltipAnchor(anchor.x > 0 ? anchor : null);
  }, []);

  const handleMuscleLeave = useCallback(() => {
    setHoveredGroup(null);
    setTooltipAnchor(null);
  }, []);

  return (
    <div className={`relative grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-3 ${className}`}>
      <HudPanel
        facing="front"
        title="Visão Frontal"
        defsPrefix={`${instanceId}-front`}
        niveis_termicos={niveis_termicos}
        indice_ignicao={indice_ignicao}
        performanceMode={performanceMode}
        congelamento_por_membro={congelamento_por_membro}
        activeMuscle={activeMuscle}
        flashActive={flashActive}
        onMuscleEnter={handleMuscleEnter}
        onMuscleLeave={handleMuscleLeave}
        onMuscleSelect={onMuscleSelect}
      />

      <HudPanel
        facing="back"
        title="Visão Dorsal"
        defsPrefix={`${instanceId}-back`}
        niveis_termicos={niveis_termicos}
        indice_ignicao={indice_ignicao}
        performanceMode={performanceMode}
        congelamento_por_membro={congelamento_por_membro}
        activeMuscle={activeMuscle}
        flashActive={flashActive}
        onMuscleEnter={handleMuscleEnter}
        onMuscleLeave={handleMuscleLeave}
        onMuscleSelect={onMuscleSelect}
      />

      {performanceMode ? (
        <p className="col-span-full text-center font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          Modo desempenho · filtros neon desativados
        </p>
      ) : null}

      {hoveredGroup && hoveredRow ? (
        <MuscleTooltip
          muscleId={HUD_GROUP_TO_SOVEREIGN[hoveredGroup]}
          row={hoveredRow}
          indiceIgnicao={indice_ignicao}
          anchor={tooltipAnchor}
          visible
        />
      ) : null}
    </div>
  );
}
