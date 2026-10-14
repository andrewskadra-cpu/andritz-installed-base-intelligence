"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { cameraGoalFor, type CameraGoal } from "@/lib/3d/camera-targets";
import { CLICK_TARGETS, IK700_MODEL, type EntityModelMapping } from "@/lib/3d/ik700-model-map";
import { buildModelIndex, unionBox, type ModelIndex } from "@/lib/3d/model-object-index";
import {
  SelectionEdges,
  applySelectionPulse,
  applyVisualPlan,
  computeVisualPlan,
  type HealthSurfaces,
  type HousingMode,
  type MeshVisual,
} from "@/lib/3d/model-visual-state";
import { DarkStage, EngineeringLights, applyStageFinish, syncShadowFlags, type StageTheme } from "./DigitalTwinStage";

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
  /** Objects whose on-screen centre is reported every frame (for an HTML callout); null for none. */
  calloutObjects?: string[] | null;
  onCalloutFrame?: (x: number, y: number, inView: boolean) => void;
  /** Presentation of the stage around the model (lighting/backdrop only). */
  theme?: StageTheme;
  /** Health tone of the callout area (drives the in-scene floor marker). */
  calloutTone?: "critical" | "attention" | null;
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

/** One camera move: an eased arc around the moving target, radius interpolated in log space. */
interface Flight {
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromDir: THREE.Vector3;
  turn: THREE.Quaternion;
  fromRadius: number;
  toRadius: number;
  elapsed: number;
  duration: number;
  ease: (t: number) => number;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function planFlight(fromPos: THREE.Vector3, fromTarget: THREE.Vector3, goal: CameraGoal, intro: boolean): Flight {
  const fromOffset = fromPos.clone().sub(fromTarget);
  const toOffset = goal.position.clone().sub(goal.target);
  const fromRadius = Math.max(fromOffset.length(), 1e-4);
  const toRadius = Math.max(toOffset.length(), 1e-4);
  const fromDir = fromOffset.divideScalar(fromRadius);
  const turn = new THREE.Quaternion().setFromUnitVectors(fromDir, toOffset.divideScalar(toRadius));
  // Longer moves (big zoom changes) take a little longer, within a calm range.
  const zoom = Math.abs(Math.log(toRadius / fromRadius));
  return {
    fromTarget: fromTarget.clone(),
    toTarget: goal.target.clone(),
    fromDir,
    turn,
    fromRadius,
    toRadius,
    elapsed: 0,
    duration: intro ? 2.2 : THREE.MathUtils.clamp(0.75 + zoom * 0.22, 0.75, 1.35),
    ease: intro ? easeOutCubic : easeInOutCubic,
  };
}

const IDENTITY = new THREE.Quaternion();

/** Eases the camera to the framing for the current selection along an arc;
 *  the first view opens with a short establishing move. Any user orbit/zoom
 *  interrupts the move and orbit stays fully enabled. Reduced motion: cuts. */
function CameraRig({ index, mapping, selectionKey, resetToken, reducedMotion }: {
  index: ModelIndex;
  mapping: EntityModelMapping;
  selectionKey: string;
  resetToken: number;
  reducedMotion: boolean;
}) {
  const get = useThree((s) => s.get);
  const controls = useThree((s) => s.controls) as OrbitLike | null;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const flight = useRef<Flight | null>(null);
  const placed = useRef(false);
  const scratch = useMemo(() => ({ q: new THREE.Quaternion(), dir: new THREE.Vector3() }), []);

  useEffect(() => {
    const { camera } = get();
    const next = cameraGoalFor(index, mapping, FOV, width / Math.max(height, 1));
    if (!next || !controls) return;
    const place = (position: THREE.Vector3, target: THREE.Vector3) => {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    };
    if (reducedMotion) {
      place(next.position, next.target);
      flight.current = null;
    } else if (!placed.current) {
      // Establishing shot: start wider and swung round, then settle on the framing.
      const offset = next.position.clone().sub(next.target);
      const start = next.target
        .clone()
        .add(offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.55).multiplyScalar(1.55))
        .add(new THREE.Vector3(0, offset.length() * 0.18, 0));
      place(start, next.target);
      flight.current = planFlight(start, next.target, next, true);
    } else {
      flight.current = planFlight(camera.position, controls.target, next, false);
    }
    placed.current = true;
    // width/height intentionally excluded: resizing must not re-fly the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mapping, selectionKey, resetToken, controls, get]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (flight.current = null);
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const f = flight.current;
    if (!f || !controls) return;
    const { camera } = get();
    f.elapsed = Math.min(f.elapsed + Math.min(dt, 0.05), f.duration);
    const e = f.ease(f.elapsed / f.duration);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    scratch.q.slerpQuaternions(IDENTITY, f.turn, e);
    scratch.dir.copy(f.fromDir).applyQuaternion(scratch.q);
    const radius = Math.exp(THREE.MathUtils.lerp(Math.log(f.fromRadius), Math.log(f.toRadius), e));
    camera.position.copy(controls.target).addScaledVector(scratch.dir, radius);
    controls.update();
    if (f.elapsed >= f.duration) flight.current = null;
  });
  return null;
}

/** Reports the screen position of a model region each frame (no React renders per frame). */
function CalloutTracker({
  index,
  objects,
  onFrame,
}: {
  index: ModelIndex;
  objects: string[];
  onFrame: (x: number, y: number, inView: boolean) => void;
}) {
  const anchor = useMemo(() => unionBox(index, objects)?.getCenter(new THREE.Vector3()) ?? null, [index, objects]);
  const projected = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!anchor) return;
    projected.copy(anchor).project(camera);
    const inView = projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
    onFrame(((projected.x + 1) / 2) * size.width, ((1 - projected.y) / 2) * size.height, inView);
  });
  return null;
}

function Model({ mapping, selectionKey, health, housingMode, resetToken, onPick, onLoaded, onHover, calloutObjects, onCalloutFrame, theme, calloutTone }: IK700SceneProps) {
  const { scene } = useGLTF(IK700_MODEL.url);
  // Clone the node graph once (geometry buffers stay shared) so the cached
  // GLB is never mutated; working materials are created by the index.
  const model = useMemo(() => scene.clone(true), [scene]);
  const index = useMemo(() => buildModelIndex(model), [model]);
  // Overall bounds (for sizing the decorative floor only).
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
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
    syncShadowFlags(plan, theme === "dark");
  }, [index, plan, edges, theme]);

  // Stage surface finish (metalness/roughness only); reverted for the engineering stage.
  useEffect(() => {
    applyStageFinish(index, theme === "dark");
  }, [index, theme]);

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
      {theme === "dark" && (
        <DarkStage
          index={index}
          bounds={bounds}
          priority={calloutObjects && calloutTone ? { objects: calloutObjects, tone: calloutTone } : null}
          reducedMotion={reducedMotion}
        />
      )}
      <CameraRig index={index} mapping={mapping} selectionKey={selectionKey} resetToken={resetToken} reducedMotion={reducedMotion} />
      {calloutObjects && onCalloutFrame && <CalloutTracker index={index} objects={calloutObjects} onFrame={onCalloutFrame} />}
    </>
  );
}

/** Canvas + lighting + controls around the real IK-700 model. */
export default function IK700Scene(props: IK700SceneProps) {
  const theme = props.theme ?? "dark";
  return (
    <Canvas camera={{ fov: FOV, near: 0.01, far: 200, position: [4, 3, 8] }} dpr={[1, 2]} gl={{ alpha: true }} shadows>
      {/* Dark-stage lights live with the model (they are sized from its bounds). */}
      {theme === "engineering" && <EngineeringLights />}
      {/* Local boundary: the GLB load must not suspend the whole asset page. */}
      <Suspense fallback={null}>
        <Model {...props} theme={theme} />
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.15} maxDistance={30} />
    </Canvas>
  );
}
