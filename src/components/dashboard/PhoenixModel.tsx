"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bounds, Center, ContactShadows, useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { Group, Object3D, Texture } from "three";
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
} from "three";

export const FENYXIA_CORE_GLB = "/models/phoenix/scene.gltf";

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
/** Ciclo das asas (rad/s) — sincroniza pulso do brilho via --phoenix-pulse-cycle. */
export const PHOENIX_WING_FLAP_SPEED = 1.32;
export const PHOENIX_WING_FLAP_AMPLITUDE = 0.072;
export const PHOENIX_WING_CYCLE_S = (2 * Math.PI) / PHOENIX_WING_FLAP_SPEED;
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

const PHOENIX_WING_LAYER_NAME = "Object_3";

type PhoenixSceneBundle = {
  scene: Group;
  wingLayers: Object3D[];
};

function preparePhoenixScene(source: Object3D): PhoenixSceneBundle {
  const scene = source.clone(true) as Group;
  const wingLayers: Object3D[] = [];

  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (node.name === PHOENIX_WING_LAYER_NAME) {
      wingLayers.push(node);
    }
  });

  return { scene, wingLayers };
}

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

function applyPhoenixMaterials(root: Object3D, isPunished: boolean, anisotropy: number): void {
  root.traverse((node) => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[] };
    if (!mesh.isMesh || !mesh.material) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;

      const maps = [
        material.map,
        material.normalMap,
        material.metalnessMap,
        material.roughnessMap,
        material.emissiveMap,
      ];
      for (const map of maps) {
        if (map) enhanceTextureQuality(map, anisotropy);
      }

      material.transparent = false;
      material.depthWrite = true;

      if (material.normalMap) {
        material.normalScale.set(isPunished ? 1 : 1.35, isPunished ? 1 : 1.35);
      }

      if (isPunished) {
        material.roughness = PHOENIX_ASH_MATERIAL.roughness;
        material.metalness = PHOENIX_ASH_MATERIAL.metalness;
        material.color.set("#3a3a3a");
        material.emissive.set("#1a1a1a");
        material.emissiveIntensity = 0.05;
      } else {
        material.roughness = Math.max(0.28, material.roughness * 0.82);
        material.metalness = Math.min(1, material.metalness + 0.12);
        material.emissive.set("#c2410c");
        material.emissiveIntensity = 0.2;
        material.envMapIntensity = 0.85;
      }

      material.needsUpdate = true;
    }
  });
}

function PhoenixModelMesh({
  isPunished,
  isVisible,
  isOpenOrb = false,
  onLoaded,
  onEngage,
}: PhoenixModelMeshProps) {
  const wingPhaseRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const gltf = useGLTF(FENYXIA_CORE_GLB);

  const { scene, wingLayers } = useMemo(() => preparePhoenixScene(gltf.scene), [gltf.scene]);
  const wingLayersRef = useRef<Object3D[]>([]);

  useEffect(() => {
    wingLayersRef.current = wingLayers;
  }, [wingLayers]);

  const wingFlapActive = isVisible && isOpenOrb && !isPunished;

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (wingFlapActive) return;
    for (const layer of wingLayersRef.current) {
      layer.rotation.x = 0;
      layer.rotation.y = 0;
      layer.rotation.z = 0;
    }
    invalidate();
  }, [invalidate, wingFlapActive]);

  useEffect(() => {
    applyPhoenixMaterials(scene, isPunished, maxAnisotropy);
    invalidate();
  }, [invalidate, isPunished, maxAnisotropy, scene]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  useFrame((_, delta) => {
    if (!wingFlapActive || wingLayersRef.current.length === 0 || reducedMotionRef.current) return;

    wingPhaseRef.current += delta * PHOENIX_WING_FLAP_SPEED;
    const flap = Math.sin(wingPhaseRef.current) * PHOENIX_WING_FLAP_AMPLITUDE;
    const layers = wingLayersRef.current;

    // R3F: animação de asas exige mutação direta do grafo Three.js em useFrame.
    for (const layer of layers) {
      layer.rotation.x = flap * 1.2;
      layer.rotation.y = flap * 0.35;
      layer.rotation.z = flap * 0.95;
    }
    invalidate();
  });

  if (!isVisible) return null;

  return (
    <Bounds fit clip={false} margin={1.12}>
      <Center>
        <primitive
          object={scene}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onEngage?.();
          }}
        />
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
        intensity={isPunished ? 0.22 : open ? 0.48 : 0.36}
        color={isPunished ? "#71717a" : "#fff7ed"}
        groundColor={isPunished ? "#27272a" : "#451a03"}
      />
      <directionalLight
        position={[2.4, 4.6, 3.2]}
        intensity={isPunished ? 0.45 : open ? 1.88 : 1.85}
        color={isPunished ? "#6b7280" : "#fffbeb"}
      />
      <directionalLight
        position={[-3.4, 2.2, -1.4]}
        intensity={isPunished ? 0.15 : open ? 0.58 : 0.62}
        color={isPunished ? "#52525b" : "#fdba74"}
      />
      <directionalLight
        position={[0.2, 1.8, -4.8]}
        intensity={isPunished ? 0.08 : open ? 0.92 : 0.55}
        color={isPunished ? "#52525b" : "#ea580c"}
      />
      <pointLight
        position={[0, -1.1, 2.2]}
        intensity={isPunished ? 0.2 : open ? 2.05 : 0.95}
        color="#f97316"
        distance={open ? 9 : 7}
        decay={2}
      />
      <pointLight
        position={[0, 0.4, 2.6]}
        intensity={isPunished ? 0.08 : open ? 0.72 : 0.55}
        color="#fde68a"
        distance={6}
        decay={2}
      />
      <pointLight
        position={[0, 0.2, -2.4]}
        intensity={isPunished ? 0.08 : open ? 0.88 : 1.15}
        color="#fde68a"
        distance={7}
        decay={2}
      />
      {open ? (
        <ContactShadows
          position={[0, -0.88, 0]}
          opacity={0.44}
          scale={3.2}
          blur={2.2}
          far={1.35}
          color="#120804"
          frames={Infinity}
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
