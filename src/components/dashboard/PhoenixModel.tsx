"use client";

import { useEffect, useMemo, useRef } from "react";
import { Center, useGLTF, useTexture } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { Group, Object3D, Texture } from "three";
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
} from "three";

/** Phoenix2 — PBR Sketchfab/Blender export (Y-up, asas abertas). */
export const FENYXIA_CORE_GLB = "/models/phoenix2/base_basic_pbr.glb";
/** Mapa de fogo/emissivo do pacote phoenix2 (UV alinhado ao PBR). */
export const PHOENIX_EMISSIVE_MAP = "/models/phoenix2/texture_emissive.png";

/** Decoders self-hosted em public/draco/gltf (fallback seguro se o GLB usar KHR_draco). */
export const PHOENIX_DRACO_DECODER_PATH = "/draco/gltf/" as const;

export const PHOENIX_IGNITION_DURATION_S = 0.48;
export const PHOENIX_DEPLOY_DURATION_S = 0.85;
/** @deprecated — modelo só emerge após o clarão sumir. */
export const PHOENIX_MODEL_EMERGE_MS = 0;
/** Grow removido: ANYMA aparece no tamanho final no centro (sem movimento). */
export const PHOENIX_MODEL_GROW_MS = 0;
/** Appear instantâneo após o clarão — sem fade brigando com o flash. */
export const PHOENIX_MODEL_FADE_IN_MS = 0;
/** Pico do clarão antes de sumir — modelo ainda oculto. */
export const PHOENIX_FLASH_HOLD_MS = 260;
/** Alias legado — hold do clarão (não depende mais do modelo). */
export const PHOENIX_FLASH_HOLD_AFTER_MODEL_MS = PHOENIX_FLASH_HOLD_MS;
/** Clarão some só por opacidade. */
export const PHOENIX_FLASH_FADE_MS = 200;
/** @deprecated — core flash removido (um véu só). */
export const PHOENIX_CORE_FLASH_BLOOM_MS = 0;
/** Balão + voz após a Fênix estar visível. */
export const PHOENIX_GREETING_DELAY_MS = 200;
export const PHOENIX_GREETING_VISIBLE_MS = 9200;

/** Respiração da ANYMA (rad/s) — só após settle; amplitude mínima. */
export const PHOENIX_WING_FLAP_SPEED = 0.7;
/** Amplitude de flutuação no eixo Y. */
export const PHOENIX_FLOAT_AMPLITUDE = 0.016;
/** @deprecated alias — mantido para sync CSS do ciclo via --phoenix-pulse-cycle. */
export const PHOENIX_WING_FLAP_AMPLITUDE = PHOENIX_FLOAT_AMPLITUDE;
export const PHOENIX_WING_CYCLE_S = (2 * Math.PI) / PHOENIX_WING_FLAP_SPEED;
/** Aguarda o paint estável antes de flutuar (evita “luta” com o clarão). */
const PHOENIX_MOTION_SETTLE_MS = 900;

/** Pulso luminoso do shader de magma (emissiveIntensity) — desktop rico. */
export const PHOENIX_MAGMA_EMISSIVE = {
  idleMin: 0.78,
  idleMax: 1.15,
  openMin: 1.12,
  openMax: 1.72,
} as const;

/** Escala desktop — preenche bem a esfera. */
export const PHOENIX_CONTEXT_SCALE = {
  compact: 0.82,
  open: 0.94,
} as const;

/** Escala mobile — menor para caber no orb sem estourar FPS. */
export const PHOENIX_CONTEXT_SCALE_MOBILE = {
  compact: 0.62,
  open: 0.72,
} as const;

/** @deprecated — Bounds removido (causava salto do canto). */
export const PHOENIX_BOUNDS_MARGIN = {
  compact: 1.25,
  open: 1.25,
} as const;

/** Desktop ~30fps · mobile ~8fps (só se houver motion). */
const PHOENIX_RENDER_INTERVAL_MS = 1000 / 30;
const PHOENIX_RENDER_INTERVAL_MOBILE_MS = 1000 / 8;
const PHOENIX_RENDER_INTERVAL_MOBILE_OPEN_MS = 1000 / 8;
const PHOENIX_TEXTURE_ANISOTROPY = 4;
const PHOENIX_TEXTURE_ANISOTROPY_MOBILE = 1;

/** Clarão (hold + fade) após ignição. */
export const PHOENIX_FLASH_TOTAL_AFTER_EMERGE_MS =
  PHOENIX_FLASH_HOLD_MS + PHOENIX_FLASH_FADE_MS;
/** Até o clarão sumir e a ANYMA poder montar. */
export const PHOENIX_REVEAL_TOTAL_S =
  PHOENIX_IGNITION_DURATION_S + PHOENIX_FLASH_TOTAL_AFTER_EMERGE_MS / 1000;

export const PHOENIX_ASH_MATERIAL = {
  roughness: 1,
  metalness: 0,
} as const;

useGLTF.setDecoderPath(PHOENIX_DRACO_DECODER_PATH);

const enhancedTextures = new WeakSet<Texture>();

type PhoenixModelMeshProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  isMobile?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

function enhanceTextureQuality(texture: Texture, anisotropy: number): void {
  if (enhancedTextures.has(texture)) return;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = anisotropy > 1 ? LinearMipmapLinearFilter : LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = anisotropy > 1;
  texture.needsUpdate = true;
  enhancedTextures.add(texture);
}

function collectMagmaMaterials(root: Object3D, isMobile: boolean): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((node) => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[]; frustumCulled?: boolean };
    if (!mesh.isMesh || !mesh.material) return;
    // Mobile: frustumCulled às vezes corta o modelo no orb pequeno.
    mesh.frustumCulled = !isMobile;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material instanceof MeshStandardMaterial) materials.push(material);
    }
  });
  return materials;
}

function applyPhoenixMaterials(
  root: Object3D,
  isPunished: boolean,
  isOpenOrb: boolean,
  anisotropy: number,
  emissiveMap: Texture,
  isMobile = false,
): MeshStandardMaterial[] {
  const materials = collectMagmaMaterials(root, isMobile);

  for (const material of materials) {
    const maps = [
      material.map,
      material.normalMap,
      material.metalnessMap,
      material.roughnessMap,
      material.emissiveMap,
      emissiveMap,
    ];
    for (const map of maps) {
      if (map) enhanceTextureQuality(map, anisotropy);
    }

    material.transparent = false;
    material.depthWrite = true;

    if (material.normalMap) {
      if (isMobile && !isPunished) {
        // Sem normal map no mobile: shading mais barato + silhueta mais luminosa.
        material.normalMap = null;
        material.normalScale.set(1, 1);
      } else {
        const n = isPunished ? 0.85 : 1.2;
        material.normalScale.set(n, n);
      }
    }

    if (isPunished) {
      material.roughness = PHOENIX_ASH_MATERIAL.roughness;
      material.metalness = PHOENIX_ASH_MATERIAL.metalness;
      material.color.set("#3a3a3a");
      material.emissiveMap = null;
      material.emissive.set("#1a1a1a");
      material.emissiveIntensity = 0.04;
      material.envMapIntensity = 0.35;
    } else {
      // Mobile: magma mais emissivo e menos rough (brilho estático, zero animação).
      material.roughness = isMobile
        ? Math.max(0.22, material.roughness * 0.72)
        : Math.max(0.32, material.roughness * 0.9);
      material.metalness = Math.min(0.55, material.metalness + (isMobile ? 0.04 : 0.08));
      material.emissiveMap = emissiveMap;
      material.emissive.set(isMobile ? "#ff8a2a" : "#ff6a1a");
      material.emissiveIntensity = isOpenOrb
        ? isMobile
          ? 1.85
          : PHOENIX_MAGMA_EMISSIVE.openMin
        : isMobile
          ? 1.38
          : PHOENIX_MAGMA_EMISSIVE.idleMin;
      material.envMapIntensity = isMobile ? (isOpenOrb ? 0.55 : 0.4) : isOpenOrb ? 1.05 : 0.78;
    }

    material.needsUpdate = true;
  }

  return materials;
}

function PhoenixModelMesh({
  isPunished,
  isVisible,
  isOpenOrb = false,
  isMobile = false,
  onLoaded,
  onEngage,
}: PhoenixModelMeshProps) {
  const rootRef = useRef<Group>(null);
  const breathPhaseRef = useRef(0);
  const magmaMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const reducedMotionRef = useRef(false);
  const isOpenOrbRef = useRef(isOpenOrb);
  const invalidate = useThree((state) => state.invalidate);
  const gltf = useGLTF(FENYXIA_CORE_GLB);
  const emissiveMap = useTexture(PHOENIX_EMISSIVE_MAP);

  const scene = useMemo(() => gltf.scene.clone(true) as Group, [gltf.scene]);

  // Sempre anima quando visível — no mobile aberto só reduz FPS (não congela / não some).
  const lifeMotionActive = isVisible && !isPunished && !isMobile;
  const scaleTable = isMobile ? PHOENIX_CONTEXT_SCALE_MOBILE : PHOENIX_CONTEXT_SCALE;
  const contextScale = isOpenOrb ? scaleTable.open : scaleTable.compact;
  const anisotropy = isMobile ? PHOENIX_TEXTURE_ANISOTROPY_MOBILE : PHOENIX_TEXTURE_ANISOTROPY;
  const renderIntervalMs = isMobile
    ? isOpenOrb
      ? PHOENIX_RENDER_INTERVAL_MOBILE_OPEN_MS
      : PHOENIX_RENDER_INTERVAL_MOBILE_MS
    : PHOENIX_RENDER_INTERVAL_MS;

  isOpenOrbRef.current = isOpenOrb;

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (lifeMotionActive || !rootRef.current) return;
    rootRef.current.position.y = 0;
    invalidate();
  }, [invalidate, lifeMotionActive]);

  useEffect(() => {
    magmaMaterialsRef.current = applyPhoenixMaterials(
      scene,
      isPunished,
      isOpenOrb,
      anisotropy,
      emissiveMap,
      isMobile,
    );
    invalidate();
    const kick = window.setTimeout(() => invalidate(), 50);
    return () => window.clearTimeout(kick);
  }, [anisotropy, emissiveMap, invalidate, isMobile, isOpenOrb, isPunished, scene]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  useEffect(() => {
    if (!lifeMotionActive || reducedMotionRef.current) return;

    let cancelled = false;
    let timer = 0;
    let last = performance.now();

    const startMotion = () => {
      if (cancelled) return;

      const tick = () => {
        if (cancelled) return;

        const now = performance.now();
        const delta = Math.min(0.064, (now - last) / 1000);
        last = now;

        breathPhaseRef.current += delta * PHOENIX_WING_FLAP_SPEED;
        const wave = Math.sin(breathPhaseRef.current);
        const breath = 0.5 + 0.5 * wave;

        const root = rootRef.current;
        if (root) {
          root.position.y = wave * PHOENIX_FLOAT_AMPLITUDE;
        }

        const open = isOpenOrbRef.current;
        const emissiveMin = open
          ? PHOENIX_MAGMA_EMISSIVE.openMin
          : PHOENIX_MAGMA_EMISSIVE.idleMin;
        const emissiveMax = open
          ? PHOENIX_MAGMA_EMISSIVE.openMax
          : PHOENIX_MAGMA_EMISSIVE.idleMax;
        const emissiveIntensity = emissiveMin + (emissiveMax - emissiveMin) * breath;

        for (const material of magmaMaterialsRef.current) {
          material.emissiveIntensity = emissiveIntensity;
        }

        invalidate();
        timer = window.setTimeout(tick, renderIntervalMs);
      };

      last = performance.now();
      timer = window.setTimeout(tick, renderIntervalMs);
    };

    // Adia motion até o modelo estar estável no centro (sem luta com o clarão).
    timer = window.setTimeout(startMotion, PHOENIX_MOTION_SETTLE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [invalidate, lifeMotionActive, renderIntervalMs]);

  if (!isVisible) return null;

  // Center fixo — sem Bounds.fit (o fit da câmera fazia a ANYMA “voar” do canto).
  return (
    <group position={[0, -0.04, 0]} scale={contextScale}>
      <Center>
        <group ref={rootRef}>
          <primitive
            object={scene}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              onEngage?.();
            }}
          />
        </group>
      </Center>
    </group>
  );
}

export type PhoenixModelProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  isMobile?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

/** R3F scene graph — mount inside `<Canvas />` only. */
export function PhoenixModel({
  isPunished,
  isVisible,
  isOpenOrb = false,
  isMobile = false,
  onLoaded,
  onEngage,
}: PhoenixModelProps) {
  const open = isOpenOrb && !isPunished;

  return (
    <>
      <hemisphereLight
        intensity={isPunished ? 0.28 : isMobile ? 0.62 : 0.4}
        color={isPunished ? "#71717a" : isMobile ? "#fff1d6" : "#fff7ed"}
        groundColor={isPunished ? "#27272a" : "#451a03"}
      />
      <directionalLight
        position={[2.2, 4.2, 3.4]}
        intensity={isPunished ? 0.4 : open ? (isMobile ? 1.45 : 1.55) : isMobile ? 1.28 : 1.35}
        color={isPunished ? "#6b7280" : isMobile ? "#ffe8c2" : "#fffbeb"}
      />
      {/* Fill lights só no desktop — mobile: 2 luzes + magma emissivo estático. */}
      {!isMobile ? (
        <>
          <directionalLight
            position={[-3.2, 2.4, -1.6]}
            intensity={isPunished ? 0.15 : open ? 0.5 : 0.42}
            color={isPunished ? "#52525b" : "#fdba74"}
          />
          <pointLight
            position={[0, 0.15, 2.1]}
            intensity={open ? 1.35 : 0.75}
            color="#f97316"
            distance={7.5}
            decay={2}
          />
          <pointLight
            position={[0, 0.4, -2.0]}
            intensity={open ? 0.7 : 0.5}
            color="#fde68a"
            distance={6.5}
            decay={2}
          />
        </>
      ) : null}
      <PhoenixModelMesh
        isPunished={isPunished}
        isVisible={isVisible}
        isOpenOrb={open}
        isMobile={isMobile}
        onLoaded={onLoaded}
        onEngage={onEngage}
      />
    </>
  );
}

useGLTF.preload(FENYXIA_CORE_GLB);
useTexture.preload(PHOENIX_EMISSIVE_MAP);
