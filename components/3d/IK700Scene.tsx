"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { cameraGoalFor, type CameraGoal } from "@/lib/3d/camera-targets";
import { CLICK_TARGETS, IK700_MODEL, type EntityModelMapping } from "@/lib/3d/ik700-model-map";
import { buildModelIndex, type ModelIndex } from "@/lib/3d/model-object-index";
import {
  SelectionEdges,
  applySelectionPulse,
  applyVisualPlan,
  computeVisualPlan,
  type HealthSurfaces,
  type HousingMode,
  type MeshVisual,
} from "@/lib/3d/model-visual-state";

export interface IK700SceneProps {
  mapping: EntityModelMapping;
  /** Changes whenever the selected entity changes (drives camera framing). */
  selectionKey: string;
  health: HealthSurfaces;
  housingMode: HousingMode;
  resetToken: number;
  /** Click on the model resolved to an entity template key. */
  onPick: (entityKey: string) => void;
  onLoaded: (objectNames: string[]) => void;
  onHover?: (objectName: string | null) => void;
}

const FOV = 32;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** Live `prefers-reduced-motion` preference (false during SSR). */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Minimal surface of drei's OrbitControls used by the rig. */
interface OrbitLike extends THREE.EventDispatcher<{ start: object }> {
  target: THREE.Vector3;
  update(): void;
}

/** Smoothly eases the camera to the framing for the current selection; any
 *  user orbit/zoom interrupts the move and orbit stays fully enabled. */
function CameraRig({ index, mapping, selectionKey, resetToken }: {
  index: ModelIndex;
  mapping: EntityModelMapping;
  selectionKey: string;
  resetToken: number;
}) {
  const get = useThree((s) => s.get);
  const controls = useThree((s) => s.controls) as OrbitLike | null;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const goal = useRef<CameraGoal | null>(null);
  const animating = useRef(false);
  const placed = useRef(false);

  useEffect(() => {
    const { camera } = get();
    const next = cameraGoalFor(index, mapping, FOV, width / Math.max(height, 1));
    if (!next || !controls) return;
    goal.current = next;
    if (!placed.current) {                 // First frame: place, don't fly.
      camera.position.copy(next.position);
      controls.target.copy(next.target);
      controls.update();
      placed.current = true;
    } else {
      animating.current = true;
    }
    // width/height intentionally excluded: resizing must not re-fly the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mapping, selectionKey, resetToken, controls, get]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (animating.current = false);
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!animating.current || !g || !controls) return;
    const { camera } = get();
    const k = 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(g.position, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.position) < 0.002 && controls.target.distanceTo(g.target) < 0.002) {
      animating.current = false;
    }
  });
  return null;
}

function Model({ mapping, selectionKey, health, housingMode, resetToken, onPick, onLoaded, onHover }: IK700SceneProps) {
  const { scene } = useGLTF(IK700_MODEL.url);
  // Clone the node graph once (geometry buffers stay shared) so the cached
  // GLB is never mutated; working materials are created by the index.
  const model = useMemo(() => scene.clone(true), [scene]);
  const index = useMemo(() => buildModelIndex(model), [model]);
  const edges = useMemo(() => new SelectionEdges(), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const planRef = useRef<Map<THREE.Mesh, MeshVisual>>(new Map());
  const reducedMotion = usePrefersReducedMotion();
  // Working materials of the selected meshes; the frame loop animates only these.
  const selectedMaterials = useRef<THREE.MeshStandardMaterial[]>([]);
  const pulseStart = useRef<number | null>(null);

  useEffect(() => {
    onLoaded([...index.byName.keys()]);
    return () => {
      edges.dispose();
      index.dispose();
      document.body.style.cursor = "";
    };
  }, [index, edges, onLoaded]);

  const plan = useMemo(
    () => computeVisualPlan(index, { mapping, health, housingMode, hoveredObject: hovered }),
    [index, mapping, health, housingMode, hovered],
  );

  useEffect(() => {
    planRef.current = plan;
    applyVisualPlan(index, plan);
    const selected = [...plan].filter(([, v]) => v.selected && v.visible).map(([m]) => m);
    edges.sync(selected);
    selectedMaterials.current = selected.map((m) => m.material as THREE.MeshStandardMaterial);
  }, [index, plan, edges]);

  // New selection: restart the pulse phase so it begins immediately.
  useEffect(() => {
    pulseStart.current = null;
  }, [selectionKey]);

  // Selection pulse on the existing render loop; no allocations per frame.
  useFrame(({ clock }) => {
    if (selectedMaterials.current.length === 0) return;
    pulseStart.current ??= clock.elapsedTime;
    applySelectionPulse(selectedMaterials.current, edges, clock.elapsedTime - pulseStart.current, reducedMotion);
  });

  /** First visible, pickable hit resolved to its nearest mapped object. */
  const resolve = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    for (const hit of e.intersections) {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.isMesh || !planRef.current.get(mesh)?.pickable) continue;
      const object = index.lineage(mesh).find((n) => n in CLICK_TARGETS);
      if (object) return object;
    }
    return null;
  };

  const updateHover = (object: string | null) => {
    if (object === hovered) return;
    setHovered(object);
    onHover?.(object);
    document.body.style.cursor = object ? "pointer" : "";
  };

  return (
    <>
      <primitive
        object={model}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          updateHover(resolve(e));
        }}
        onPointerOut={() => updateHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const object = resolve(e);
          if (object) onPick(CLICK_TARGETS[object]);
        }}
      />
      <CameraRig index={index} mapping={mapping} selectionKey={selectionKey} resetToken={resetToken} />
    </>
  );
}

/** Canvas + lighting + controls around the real IK-700 model. */
export default function IK700Scene(props: IK700SceneProps) {
  return (
    <Canvas camera={{ fov: FOV, near: 0.01, far: 200, position: [4, 3, 8] }} dpr={[1, 2]}>
      <color attach="background" args={["#f4f6f9"]} />
      <hemisphereLight args={["#ffffff", "#8a96a8", 1.5]} />
      <directionalLight position={[4, 8, 6]} intensity={2.2} />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} />
      {/* Local boundary: the GLB load must not suspend the whole asset page. */}
      <Suspense fallback={null}>
        <Model {...props} />
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.15} maxDistance={30} />
    </Canvas>
  );
}
