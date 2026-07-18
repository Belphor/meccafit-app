"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bounds, Center, ContactShadows, useGLTF, useTexture } from "@react-three/drei";
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

/** Margem do Bounds — valor único evita remount (key) ao abrir o HUD. */
export const PHOENIX_BOUNDS_MARGIN = {
  compact: 1.25,
  open: 1.25,
} as const;

/** ~30fps desktop / ~20fps mobile compact — respiração lenta permanece suave. */
const PHOENIX_RENDER_INTERVAL_MS = 1000 / 30;
const PHOENIX_RENDER_INTERVAL_MOBILE_MS = 1000 / 20;
/** Anisotropy — orb pequeno no celular não ganha com 4+. */
const PHOENIX_TEXTURE_ANISOTROPY = 4;
const PHOENIX_TEXTURE_ANISOTROPY_MOBILE = 2;

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
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  enhancedTextures.add(texture);
}

function collectMagmaMaterials(root: Object3D): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((node) => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[]; frustumCulled?: boolean };
    if (!mesh.isMesh || !mesh.material) return;
    mesh.frustumCulled = true;
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

  // Celular + orb aberta: pose estática (CSS anima a bola). Compacta: respira em ~20fps.
  const lifeMotionActive = isVisible && !isPunished && !(isMobile && isOpenOrb);
  const contextScale = isOpenOrb ? PHOENIX_CONTEXT_SCALE.open : PHOENIX_CONTEXT_SCALE.compact;
  const anisotropy = isMobile ? PHOENIX_TEXTURE_ANISOTROPY_MOBILE : PHOENIX_TEXTURE_ANISOTROPY;
  const renderIntervalMs = isMobile ? PHOENIX_RENDER_INTERVAL_MOBILE_MS : PHOENIX_RENDER_INTERVAL_MS;

  isOpenOrbRef.current = isOpenOrb;

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (lifeMotionActive || !rootRef.current) return;
    rootRef.current.position.y = 0;
    for (const material of magmaMaterialsRef.current) {
      material.emissiveIntensity = isOpenOrbRef.current
        ? PHOENIX_MAGMA_EMISSIVE.openMin
        : PHOENIX_MAGMA_EMISSIVE.idleMin;
    }
    invalidate();
  }, [invalidate, lifeMotionActive]);

  useEffect(() => {
    magmaMaterialsRef.current = applyPhoenixMaterials(
      scene,
      isPunished,
      isOpenOrb,
      anisotropy,
      emissiveMap,
    );
    invalidate();
  }, [anisotropy, emissiveMap, invalidate, isOpenOrb, isPunished, scene]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  useEffect(() => {
    if (!lifeMotionActive || reducedMotionRef.current) return;

    let cancelled = false;
    let timer = 0;
    let last = performance.now();

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
      const emissiveMin = open ? PHOENIX_MAGMA_EMISSIVE.openMin : PHOENIX_MAGMA_EMISSIVE.idleMin;
      const emissiveMax = open ? PHOENIX_MAGMA_EMISSIVE.openMax : PHOENIX_MAGMA_EMISSIVE.idleMax;
      const emissiveIntensity = emissiveMin + (emissiveMax - emissiveMin) * breath;

      for (const material of magmaMaterialsRef.current) {
        material.emissiveIntensity = emissiveIntensity;
      }

      invalidate();
      timer = window.setTimeout(tick, renderIntervalMs);
    };

    timer = window.setTimeout(tick, renderIntervalMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [invalidate, lifeMotionActive, renderIntervalMs]);

  if (!isVisible) return null;

  return (
    <Bounds fit clip={false} margin={PHOENIX_BOUNDS_MARGIN.open}>
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
        intensity={isPunished ? 0.22 : open ? 0.42 : 0.34}
        color={isPunished ? "#71717a" : "#fff7ed"}
        groundColor={isPunished ? "#27272a" : "#451a03"}
      />
      <directionalLight
        position={[2.2, 4.2, 3.4]}
        intensity={isPunished ? 0.45 : open ? 1.55 : 1.4}
        color={isPunished ? "#6b7280" : "#fffbeb"}
      />
      {/* Fill lights — desktop full; mobile 1 fill (orb pequeno). */}
      {!isMobile ? (
        <>
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
        </>
      ) : (
        <directionalLight
          position={[-2.4, 2.8, -1.2]}
          intensity={isPunished ? 0.12 : open ? 0.7 : 0.55}
          color={isPunished ? "#52525b" : "#fdba74"}
        />
      )}
      <pointLight
        position={[0, -0.6, 2.0]}
        intensity={isPunished ? 0.18 : open ? (isMobile ? 1.2 : 1.65) : 0.85}
        color="#f97316"
        distance={open ? 8.5 : 6.5}
        decay={2}
      />
      {/* ContactShadows é caro no mobile — o CSS .phoenix-orb-model-contact-shadow cobre. */}
      {open && !isMobile ? (
        <ContactShadows
          position={[0, -0.62, 0]}
          opacity={0.4}
          scale={3.4}
          blur={2.4}
          far={1.4}
          color="#120804"
          frames={1}
          resolution={256}
        />
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
