"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { PhoenixModel } from "@/components/dashboard/PhoenixModel";
import { useTouchPrimaryDevice } from "@/hooks/useTouchPrimaryDevice";

export type PhoenixCanvasInnerProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

/** Força paints ao mudar estado — evita canvas preto no mobile. */
function PhoenixFrameKick({
  isVisible,
  isOpenOrb,
  isMobile,
}: {
  isVisible: boolean;
  isOpenOrb: boolean;
  isMobile: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!isVisible) return;
    invalidate();
    const t1 = window.setTimeout(() => invalidate(), 32);
    const t2 = window.setTimeout(() => invalidate(), 120);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [invalidate, isMobile, isOpenOrb, isVisible]);
  return null;
}

export function PhoenixCanvasInner({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixCanvasInnerProps) {
  const isMobile = useTouchPrimaryDevice();

  return (
    <Canvas
      // Sempre demand quando visível — "never" no mobile apagava a fênix antes do paint.
      frameloop={isVisible ? "demand" : "never"}
      className="phoenix-model-canvas"
      camera={{ position: [0, 0.14, 3.55], fov: 38, near: 0.1, far: 100 }}
      gl={{
        alpha: true,
        premultipliedAlpha: false,
        antialias: !isMobile,
        powerPreference: isMobile ? "low-power" : "high-performance",
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
      }}
      dpr={isMobile ? 1 : isOpenOrb ? [1, 1.25] : [1, 1.5]}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = isPunished
          ? 0.9
          : isMobile
            ? isOpenOrb
              ? 1.28
              : 1.22
            : isOpenOrb
              ? 1.18
              : 1.2;
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <PhoenixFrameKick isVisible={isVisible} isOpenOrb={isOpenOrb} isMobile={isMobile} />
      <ambientLight
        intensity={isPunished ? 0.36 : isMobile ? (isOpenOrb ? 0.48 : 0.42) : isOpenOrb ? 0.3 : 0.4}
      />
      <PhoenixModel
        isPunished={isPunished}
        isVisible={isVisible}
        isOpenOrb={isOpenOrb}
        isMobile={isMobile}
        onLoaded={onLoaded}
        onEngage={onEngage}
      />
    </Canvas>
  );
}
