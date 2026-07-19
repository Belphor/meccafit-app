"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, NoToneMapping, SRGBColorSpace } from "three";
import { PhoenixModel } from "@/components/dashboard/PhoenixModel";
import { useTouchPrimaryDevice } from "@/hooks/useTouchPrimaryDevice";

export type PhoenixCanvasInnerProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

/** Poucos paints iniciais — evita canvas preto sem martelar o compositor. */
function PhoenixFrameKick({ isVisible }: { isVisible: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!isVisible) return;
    invalidate();
    const t1 = window.setTimeout(() => invalidate(), 48);
    return () => window.clearTimeout(t1);
  }, [invalidate, isVisible]);
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
      frameloop={isVisible ? "demand" : "never"}
      className="phoenix-model-canvas"
      camera={{ position: [0, 0.08, 3.55], fov: 34, near: 0.1, far: 40 }}
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
        // Tone mapping ACES custa no mobile; NoToneMapping + exposição manual.
        gl.toneMapping = isMobile ? NoToneMapping : ACESFilmicToneMapping;
        gl.toneMappingExposure = isPunished ? 0.9 : isMobile ? 1.35 : isOpenOrb ? 1.12 : 1.15;
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <PhoenixFrameKick isVisible={isVisible} />
      <ambientLight intensity={isPunished ? 0.4 : isMobile ? 0.58 : 0.38} />
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
