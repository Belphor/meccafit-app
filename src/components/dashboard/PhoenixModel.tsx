"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bounds, Center, ContactShadows, useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
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

export const PHOENIX_IGNITION_DURATION_S = 0.95;
export const PHOENIX_DEPLOY_DURATION_S = 1.85;
/** Modelo começa a emergir assim que o reveal abre (opaco por trás do clarão). */
export const PHOENIX_MODEL_EMERGE_MS = 0;
/** Modelo fica opaco instantaneamente por trás do clarão (sem fade visível). */
export const PHOENIX_MODEL_FADE_IN_MS = 0;
/** Modelo já opaco antes do clarão começar a sumir. */
export const PHOENIX_FLASH_HOLD_AFTER_MODEL_MS = 1400;
/** Clarão some só por opacidade — transição suave. */
export const PHOENIX_FLASH_FADE_MS = 680;
/** Clarão núcleo — bloom rápido sobre o modelo ao emergir. */
export const PHOENIX_CORE_FLASH_BLOOM_MS = 480;
/** Balão + voz após o clarão ceder e a Fênix estar visível. */
export const PHOENIX_GREETING_DELAY_MS = 380;
export const PHOENIX_GREETING_VISIBLE_MS = 9200;

/** Respiração da ANYMA (rad/s) — flutuação Y + pulso de magma no mesmo ciclo. */
export const PHOENIX_WING_FLAP_SPEED = 1.05;
/** Amplitude de flutuação no eixo Y (world units ≈ poucos pixels no orb). */
export const PHOENIX_FLOAT_AMPLITUDE = 0.038;
/** @deprecated alias — mantido para sync CSS do ciclo via --phoenix-pulse-cycle. */
export const PHOENIX_WING_FLAP_AMPLITUDE = PHOENIX_FLOAT_AMPLITUDE;
export const PHOENIX_WING_CYCLE_S = (2 * Math.PI) / PHOENIX_WING_FLAP_SPEED;

/** Pulso luminoso do shader de magma (emissiveIntensity). */
export const PHOENIX_MAGMA_EMISSIVE = {
  idleMin: 0.72,
  idleMax: 1.18,
  openMin: 1.05,
  openMax: 1.92,
} as const;

/** Escala contextual da ANYMA dentro do orb (não altera o shell CSS). */
export const PHOENIX_CONTEXT_SCALE = {
  compact: 0.78,
  open: 0.9,
} as const;

/** Margem do Bounds — mais margem = ANYMA menor e centrada na bola. */
export const PHOENIX_BOUNDS_MARGIN = {
  compact: 1.32,
  open: 1.18,
} as const;

/** Tempo total do clarão após o modelo emergir (fade-in + hold + fade-out). */
export const PHOENIX_FLASH_TOTAL_AFTER_EMERGE_MS =
  PHOENIX_MODEL_FADE_IN_MS + PHOENIX_FLASH_HOLD_AFTER_MODEL_MS + PHOENIX_FLASH_FADE_MS;
/** Até o clarão sumir por completo (ignição + fade-in do modelo + hold + fade-out). */
export const PHOENIX_REVEAL_TOTAL_S =
  PHOENIX_IGNITION_DURATION_S + PHOENIX_FLASH_TOTAL_AFTER_EMERGE_MS / 1000;

export const PHOENIX_ASH_MATERIAL = {
  roughness: 1,
  metalness: 0,
} as const;

useGLTF.setDecoderPath(PHOENIX_DRACO_DECODER_PATH);

type PhoenixModelMeshProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

function enhanceTextureQuality(texture: Texture, anisotropy: number): void {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

function collectMagmaMaterials(root: Object3D): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((node) => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[] };
    if (!mesh.isMesh || !mesh.material) return;
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
): MeshStandardMaterial[] {
  const materials = collectMagmaMaterials(root);

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
      material.normalScale.set(isPunished ? 0.85 : 1.2, isPunished ? 0.85 : 1.2);
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
      material.roughness = Math.max(0.32, material.roughness * 0.9);
      material.metalness = Math.min(0.55, material.metalness + 0.08);
      material.emissiveMap = emissiveMap;
      material.emissive.set("#ff6a1a");
      material.emissiveIntensity = isOpenOrb
        ? PHOENIX_MAGMA_EMISSIVE.openMin
        : PHOENIX_MAGMA_EMISSIVE.idleMin;
      material.envMapIntensity = isOpenOrb ? 1.05 : 0.78;
    }

    material.needsUpdate = true;
  }

  return materials;
}

function PhoenixModelMesh({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixModelMeshProps) {
  const rootRef = useRef<Group>(null);
  const breathPhaseRef = useRef(0);
  const magmaMaterialsRef = useRef<MeshStandardMaterial[]>([]);
  const reducedMotionRef = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  // Cap anisotropy: qualidade visual quase idêntica, bem menos custo de GPU.
  const maxAnisotropy = useThree((state) =>
    Math.min(4, state.gl.capabilities.getMaxAnisotropy()),
  );
  const gltf = useGLTF(FENYXIA_CORE_GLB);
  const emissiveMap = useTexture(PHOENIX_EMISSIVE_MAP);

  const scene = useMemo(() => gltf.scene.clone(true) as Group, [gltf.scene]);

  const lifeMotionActive = isVisible && !isPunished;
  const contextScale = isOpenOrb ? PHOENIX_CONTEXT_SCALE.open : PHOENIX_CONTEXT_SCALE.compact;
  const boundsMargin = isOpenOrb ? PHOENIX_BOUNDS_MARGIN.open : PHOENIX_BOUNDS_MARGIN.compact;

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
      maxAnisotropy,
      emissiveMap,
    );
    invalidate();
  }, [emissiveMap, invalidate, isOpenOrb, isPunished, maxAnisotropy, scene]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  useFrame((_, delta) => {
    if (!lifeMotionActive || reducedMotionRef.current) return;

    breathPhaseRef.current += delta * PHOENIX_WING_FLAP_SPEED;
    const phase = breathPhaseRef.current;
    const wave = Math.sin(phase);
    // 0 → 1 → 0: respiração de fogo (ease suave via seno)
    const breath = 0.5 + 0.5 * wave;

    const root = rootRef.current;
    if (root) {
      root.position.y = wave * PHOENIX_FLOAT_AMPLITUDE;
    }

    const emissiveMin = isOpenOrb
      ? PHOENIX_MAGMA_EMISSIVE.openMin
      : PHOENIX_MAGMA_EMISSIVE.idleMin;
    const emissiveMax = isOpenOrb
      ? PHOENIX_MAGMA_EMISSIVE.openMax
      : PHOENIX_MAGMA_EMISSIVE.idleMax;
    const emissiveIntensity = emissiveMin + (emissiveMax - emissiveMin) * breath;

    for (const material of magmaMaterialsRef.current) {
      material.emissiveIntensity = emissiveIntensity;
    }

    invalidate();
  });

  if (!isVisible) return null;

  return (
    <Bounds fit clip={false} margin={boundsMargin} key={isOpenOrb ? "open" : "compact"}>
      <Center>
        <group scale={contextScale}>
          <group ref={rootRef}>
            <primitive
              object={scene}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onEngage?.();
              }}
            />
          </group>
        </group>
      </Center>
    </Bounds>
  );
}

export type PhoenixModelProps = {
  isPunished: boolean;
  isVisible: boolean;
  isOpenOrb?: boolean;
  onLoaded?: () => void;
  onEngage?: () => void;
};

/** R3F scene graph — mount inside `<Canvas />` only. */
export function PhoenixModel({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixModelProps) {
  const open = isOpenOrb && !isPunished;

  return (
    <>
      <hemisphereLight
        intensity={isPunished ? 0.22 : open ? 0.42 : 0.34}
        color={isPunished ? "#71717a" : "#fff7ed"}
        groundColor={isPunished ? "#27272a" : "#451a03"}
      />
      <directionalLight
        position={[2.2, 4.2, 3.4]}
        intensity={isPunished ? 0.45 : open ? 1.55 : 1.4}
        color={isPunished ? "#6b7280" : "#fffbeb"}
      />
      <directionalLight
        position={[-3.2, 2.4, -1.6]}
        intensity={isPunished ? 0.15 : open ? 0.52 : 0.48}
        color={isPunished ? "#52525b" : "#fdba74"}
      />
      <directionalLight
        position={[0.15, 2.4, -4.2]}
        intensity={isPunished ? 0.08 : open ? 0.78 : 0.48}
        color={isPunished ? "#52525b" : "#ea580c"}
      />
      <pointLight
        position={[0, -0.6, 2.0]}
        intensity={isPunished ? 0.18 : open ? 1.65 : 0.85}
        color="#f97316"
        distance={open ? 8.5 : 6.5}
        decay={2}
      />
      <pointLight
        position={[0, 0.55, 2.4]}
        intensity={isPunished ? 0.08 : open ? 0.85 : 0.58}
        color="#fde68a"
        distance={6}
        decay={2}
      />
      <pointLight
        position={[0, 0.35, -2.2]}
        intensity={isPunished ? 0.08 : open ? 0.72 : 0.95}
        color="#fde68a"
        distance={7}
        decay={2}
      />
      {open ? (
        <ContactShadows
          position={[0, -0.62, 0]}
          opacity={0.4}
          scale={3.4}
          blur={2.4}
          far={1.4}
          color="#120804"
          frames={1}
        />
      ) : null}
      <PhoenixModelMesh
        isPunished={isPunished}
        isVisible={isVisible}
        isOpenOrb={open}
        onLoaded={onLoaded}
        onEngage={onEngage}
      />
    </>
  );
}

useGLTF.preload(FENYXIA_CORE_GLB);
useTexture.preload(PHOENIX_EMISSIVE_MAP);
