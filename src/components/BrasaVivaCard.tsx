import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import {
  BRASAO_LIGHT_PANEL,
  BRASA_PANEL,
  BRASA_VIVA_CARD,
  PLASMA_PANEL,
  CARDIO_VOO_PANEL_IDLE,
  PORTAL_FRAME_PANEL,
  TREINO_FRAME_PANEL,
  TREINO_INNER_PANEL,
  SELECTABLE_IDLE_PANEL,
} from "@/lib/dashboard-config";

type BrasaVivaCardVariant =
  | "static"
  | "pulse"
  | "plasma"
  | "brasao"
  | "portal"
  | "treino"
  | "inner"
  | "selectable-idle"
  | "cardio-idle";

type BrasaVivaCardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  overlay?: ReactNode;
  /** static · pulse · plasma · brasao · portal · treino · inner · selectable-idle · cardio-idle */
  variant?: BrasaVivaCardVariant;
} & Omit<HTMLAttributes<HTMLElement>, "className">;

export function BrasaVivaCard({
  as = "div",
  children,
  className = "",
  overlay,
  variant = "static",
  ...rest
}: BrasaVivaCardProps) {
  const surface =
    variant === "pulse"
      ? BRASA_VIVA_CARD
      : variant === "plasma"
        ? PLASMA_PANEL
        : variant === "brasao"
          ? BRASAO_LIGHT_PANEL
          : variant === "portal"
            ? PORTAL_FRAME_PANEL
            : variant === "treino"
              ? TREINO_FRAME_PANEL
              : variant === "inner"
                ? TREINO_INNER_PANEL
                : variant === "selectable-idle"
                  ? SELECTABLE_IDLE_PANEL
                  : variant === "cardio-idle"
                    ? CARDIO_VOO_PANEL_IDLE
                    : BRASA_PANEL;

  return createElement(
    as,
    { className: `${surface} relative ${className}`.trim(), ...rest },
    overlay
      ? createElement(
          "div",
          {
            className:
              "pointer-events-none absolute inset-0 z-[2] overflow-visible rounded-[inherit]",
          },
          overlay,
        )
      : null,
    createElement("div", { className: "relative z-[1]" }, children),
  );
}
