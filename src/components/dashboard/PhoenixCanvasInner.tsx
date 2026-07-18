"use client";

import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { PhoenixModel } from "@/components/dashboard/PhoenixModel";

export type PhoenixCanvasInnerProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

export function PhoenixCanvasInner({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixCanvasInnerProps) {
  return (
    <Canvas
      frameloop={isVisible ? "demand" : "never"}
      className="phoenix-model-canvas"
      camera={{ position: [0, 0.14, 3.55], fov: 38, near: 0.1, far: 100 }}
      gl={{
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      // Cap DPR: orb aberta + blur do HUD no mesmo frame travava o main thread.
      dpr={isOpenOrb ? [1, 1.5] : [1, 1.75]}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = isPunished ? 0.9 : isOpenOrb ? 1.18 : 1.2;
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <ambientLight intensity={isPunished ? 0.36 : isOpenOrb ? 0.3 : 0.4} />
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
