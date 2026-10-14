"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MeshVisual } from "@/lib/3d/model-visual-state";
import { unionBox, type ModelIndex } from "@/lib/3d/model-object-index";

/**
 * Presentation-only stage around the IK-700 model. Nothing here touches the
 * model's geometry, object names, hierarchy, click targets or health and
 * selection logic.
 *
 *  - "dark": midnight digital-twin stage. The canvas is transparent so the
 *    viewer's CSS gradient shows through. A shadow-casting key light, cool
 *    rim and soft fill shape the equipment; a procedural studio environment
 *    (generated locally, no downloads) gives metal a restrained response;
 *    surface finish distinguishes machined parts from painted structure; a
 *    faded floor grid, contact shadow and a floor marker under the priority
 *    area ground the scene.
 *  - "engineering": the original light background and lighting, unchanged,
 *    with the GLB's own material finish.
 */
export type StageTheme = "dark" | "engineering";

/** Background colour of the engineering stage (also used by the viewer frame). */
export const ENGINEERING_BACKGROUND = "#f4f6f9";

/** Original engineering-style lighting (kept verbatim for revert). */
export function EngineeringLights() {
  return (
    <>
      <color attach="background" args={[ENGINEERING_BACKGROUND]} />
      <hemisphereLight args={["#ffffff", "#8a96a8", 1.5]} />
      <directionalLight position={[4, 8, 6]} intensity={2.2} />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} />
    </>
  );
}

/* ── Surface finish ─────────────────────────────────────────────────────── */

/** Machined / rotating steel parts get a tighter, more metallic finish; structure stays painted-matte. */
const MACHINED = /shaft|gear|bearing|pinion|worm|tube|lance|hub|poppet|valve|spline|key|nut|bolt|screw|washer|spacer|seal|roller/i;
const FINISH = {
  machined: { metalness: 0.5, roughness: 0.36, envMapIntensity: 1.15 },
  painted: { metalness: 0.12, roughness: 0.62, envMapIntensity: 0.75 },
};

/**
 * Apply (or revert) the stage finish on the private working materials. Only
 * metalness / roughness / env response change; colours, health tints,
 * opacity and selection emissive stay owned by the visual plan.
 */
export function applyStageFinish(index: ModelIndex, enabled: boolean) {
  for (const mesh of index.meshes) {
    const m = mesh.material as THREE.MeshStandardMaterial;
    const source = index.originals.get(mesh)!;
    if (enabled) {
      const f = MACHINED.test(index.lineage(mesh).join(" ")) ? FINISH.machined : FINISH.painted;
      m.metalness = f.metalness;
      m.roughness = f.roughness;
      m.envMapIntensity = f.envMapIntensity;
    } else {
      m.metalness = source.metalness;
      m.roughness = source.roughness;
      m.envMapIntensity = source.envMapIntensity;
    }
  }
}

/** Only solid, visible meshes cast shadows, so faded housings never darken the internals. */
export function syncShadowFlags(plan: Map<THREE.Mesh, MeshVisual>, enabled: boolean) {
  for (const [mesh, v] of plan) {
    mesh.castShadow = enabled && v.visible && v.opacity >= 0.999;
    mesh.receiveShadow = enabled;
  }
}

/* ── Lighting ───────────────────────────────────────────────────────────── */

/** Procedural studio reflections for metallic surfaces, built locally via PMREM. */
function StudioEnvironment({ intensity }: { intensity: number }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    const previous = { environment: scene.environment, intensity: scene.environmentIntensity };
    scene.environment = env;
    scene.environmentIntensity = intensity;
    // Slightly lower exposure on the dark stage keeps light painted surfaces from clipping to white.
    const exposure = gl.toneMappingExposure;
    gl.toneMappingExposure = 0.86;
    return () => {
      gl.toneMappingExposure = exposure;
      scene.environment = previous.environment;
      scene.environmentIntensity = previous.intensity;
      env.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [get, intensity]);
  return null;
}

/** Placed relative to the model: key from front-right-above, rim from behind, fill low-left. */
const KEY_DIR = new THREE.Vector3(0.45, 0.85, 0.6).normalize();
const RIM_DIR = new THREE.Vector3(-0.55, 0.45, -0.75).normalize();
const FILL_DIR = new THREE.Vector3(-0.6, 0.2, 0.75).normalize();
const KICK_DIR = new THREE.Vector3(0.7, -0.25, -0.3).normalize();

/**
 * Neutral warm key keeps health colours true; cyan/blue only at the rim and
 * fill, so red (condition) and blue (selection) never get confused.
 */
function DarkStageLights({ center, size }: { center: THREE.Vector3; size: number }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const at = (dir: THREE.Vector3, d = size) => center.clone().addScaledVector(dir, d).toArray();

  useEffect(() => {
    target.position.copy(center);
    target.updateMatrixWorld();
    const light = key.current;
    if (!light) return;
    light.target = target;
    const cam = light.shadow.camera;
    const half = size * 0.58;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = size * 0.05;
    cam.far = size * 2.5;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = size * 0.0012;
    light.shadow.radius = 3;
    light.shadow.needsUpdate = true;
  }, [center, size, target]);

  return (
    <>
      <primitive object={target} />
      <hemisphereLight args={["#c9dcff", "#0b1220", 0.38]} />
      <directionalLight ref={key} position={at(KEY_DIR)} intensity={1.7} color="#fff6ea" castShadow />
      <directionalLight position={at(RIM_DIR)} intensity={1.75} color="#30cbe8" />
      <directionalLight position={at(FILL_DIR)} intensity={0.45} color="#6aa3ff" />
      <directionalLight position={at(KICK_DIR)} intensity={0.3} color="#9fb4d6" />
      <StudioEnvironment intensity={0.3} />
    </>
  );
}

/* ── Floor ──────────────────────────────────────────────────────────────── */

const noRaycast = () => null;
const FADE_STRENGTH = 1.6;

/** Floor grid and grounding shadow; the grid thins out in close-ups. */
function DarkStageFloor({ center, size, floorY }: { center: THREE.Vector3; size: number; floorY: number }) {
  const grid = useRef<THREE.Mesh>(null);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3 } | null;

  // Fade the grid out in close-ups (camera near its target) so floor lines
  // never clutter component views seen through translucent housings.
  useFrame(({ camera }) => {
    const mesh = grid.current;
    const material = mesh?.material as THREE.ShaderMaterial | undefined;
    if (!mesh || !material || !controls) return;
    const ratio = camera.position.distanceTo(controls.target) / size;
    const k = THREE.MathUtils.smoothstep(ratio, 0.25, 0.75);
    mesh.visible = k > 0.02;
    // A steeper distance fade thins the grid towards the camera as it closes in.
    material.uniforms.fadeStrength.value = FADE_STRENGTH / Math.max(k, 0.05);
  });

  return (
    <group raycast={noRaycast}>
      <ContactShadows
        position={[center.x, floorY + size * 0.001, center.z]}
        scale={size * 1.5}
        far={size * 0.6}
        blur={2.6}
        opacity={0.55}
        resolution={512}
        color="#000000"
        frames={1}
      />
      {/* Catches the key light shadow cast by solid parts. */}
      <mesh position={[center.x, floorY + size * 0.0005, center.z]} rotation-x={-Math.PI / 2} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[size * 2.4, size * 2.4]} />
        <shadowMaterial transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <Grid
        ref={grid}
        position={[center.x, floorY, center.z]}
        raycast={noRaycast}
        // Drawn first so transparent housings blend over it instead of the grid cutting through.
        renderOrder={-1}
        infiniteGrid
        cellSize={size / 40}
        sectionSize={size / 8}
        cellThickness={0.6}
        sectionThickness={1}
        cellColor="#16253b"
        sectionColor="#24476f"
        fadeDistance={size * 2.6}
        fadeStrength={FADE_STRENGTH}
      />
    </group>
  );
}

/* ── Priority-area floor marker ─────────────────────────────────────────── */

const TONE_COLOR = { critical: "#f05a65", attention: "#f3b54a" } as const;

/**
 * Anchors the HTML priority callout in the scene: a soft halo on the floor
 * directly below the area and a faint plumb line up to it. Slow breathing
 * pulse; static under reduced motion.
 */
function PriorityMarker({
  index,
  objects,
  tone,
  floorY,
  size,
  reducedMotion,
}: {
  index: ModelIndex;
  objects: string[];
  tone: keyof typeof TONE_COLOR;
  floorY: number;
  size: number;
  reducedMotion: boolean;
}) {
  const box = useMemo(() => unionBox(index, objects), [index, objects]);
  const halo = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const line = useMemo(() => {
    if (!box) return null;
    const c = box.getCenter(new THREE.Vector3());
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(c.x, floorY, c.z),
      new THREE.Vector3(c.x, box.min.y, c.z),
    ]);
    const material = new THREE.LineDashedMaterial({
      color: TONE_COLOR[tone],
      transparent: true,
      opacity: 0.55,
      dashSize: size * 0.006,
      gapSize: size * 0.004,
      depthWrite: false,
    });
    const l = new THREE.Line(geometry, material);
    l.computeLineDistances();
    l.raycast = noRaycast;
    return l;
  }, [box, floorY, size, tone]);
  useEffect(
    () => () => {
      line?.geometry.dispose();
      (line?.material as THREE.Material | undefined)?.dispose();
    },
    [line],
  );

  useFrame(({ clock }) => {
    const w = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.6);
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.14 * w;
    if (ring.current) ring.current.scale.setScalar(1 + 0.12 * w);
  });

  if (!box || !line) return null;
  const c = box.getCenter(new THREE.Vector3());
  const r = Math.max(box.getSize(new THREE.Vector3()).length() * 0.6, size * 0.025);
  const y = floorY + size * 0.0015;
  return (
    <group>
      <mesh ref={halo} position={[c.x, y, c.z]} rotation-x={-Math.PI / 2} raycast={noRaycast} renderOrder={1}>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial color={TONE_COLOR[tone]} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring} position={[c.x, y, c.z]} rotation-x={-Math.PI / 2} raycast={noRaycast} renderOrder={1}>
        <ringGeometry args={[r * 1.15, r * 1.22, 64]} />
        <meshBasicMaterial color={TONE_COLOR[tone]} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <primitive object={line} />
    </group>
  );
}

/* ── Stage ──────────────────────────────────────────────────────────────── */

/** Everything the dark stage adds around the loaded model. */
export function DarkStage({
  index,
  bounds,
  priority,
  reducedMotion,
}: {
  index: ModelIndex;
  bounds: THREE.Box3;
  priority: { objects: string[]; tone: "critical" | "attention" } | null;
  reducedMotion: boolean;
}) {
  const { center, size, floorY } = useMemo(() => {
    const s = bounds.getSize(new THREE.Vector3());
    return {
      center: bounds.getCenter(new THREE.Vector3()),
      size: Math.max(s.x, s.y, s.z, 0.001),
      floorY: bounds.min.y - Math.max(s.y * 0.04, 0.002),
    };
  }, [bounds]);

  return (
    <>
      <DarkStageLights center={center} size={size} />
      <DarkStageFloor center={center} size={size} floorY={floorY} />
      {priority && (
        <PriorityMarker
          index={index}
          objects={priority.objects}
          tone={priority.tone}
          floorY={floorY}
          size={size}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
