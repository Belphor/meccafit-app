"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { PhoenixModel } from "@/components/dashboard/PhoenixModel";

export type PhoenixCanvasInnerProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

/** Dispara 1 frame quando o orb abre/fecha (frameloop never precisa de invalidate). */
function PhoenixFrameKick({ isVisible, isOpenOrb }: { isVisible: boolean; isOpenOrb: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, isOpenOrb, isVisible]);
  return null;
}

export function PhoenixCanvasInner({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixCanvasInnerProps) {
  return (
    <Canvas
      // Orb aberta: congela o WebGL (HUD + voz no main thread). Compacta: demand + timer ~10fps.
      frameloop={isVisible ? (isOpenOrb ? "never" : "demand") : "never"}
      className="phoenix-model-canvas"
      camera={{ position: [0, 0.14, 3.55], fov: 38, near: 0.1, far: 100 }}
      gl={{
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        powerPreference: "low-power",
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
      }}
      dpr={1}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = isPunished ? 0.9 : isOpenOrb ? 1.12 : 1.15;
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <PhoenixFrameKick isVisible={isVisible} isOpenOrb={isOpenOrb} />
      <ambientLight intensity={isPunished ? 0.4 : isOpenOrb ? 0.45 : 0.5} />
      <PhoenixModel
        isPunished={isPunished}
        isVisible={isVisible}
        isOpenOrb={isOpenOrb}
        onLoaded={onLoaded}
        onEngage={onEngage}
      />
    </Canvas>
  );
}
