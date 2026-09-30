"use client";

import { useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { STATUS_META, viewerColor } from "@/components/ui/status";
import type { HealthStatus, ViewerZone } from "@/types/installed-base";

/**
 * Placeholder long-retractable sootblower built from primitive geometry.
 * Proportions are illustrative only — this is not an engineering model.
 * Replace with a GLB per equipment model when real geometry is available.
 */

export interface SceneZone {
  zone: ViewerZone;
  nodeId: string;
  label: string;
  status: HealthStatus;
}

export interface EquipmentSceneProps {
  zones: SceneZone[];
  /** Zones to emphasise. Null means the whole asset is in context. */
  focus: Set<ViewerZone> | null;
  onSelect: (nodeId: string) => void;
  /** Incrementing this value resets the camera to its initial view. */
  resetSignal: number;
}

const STEEL = "#aeb7c4";
const STRUCTURE = "#8792a3";
const HALF_PI = Math.PI / 2;

interface ZoneGroupProps {
  zone: SceneZone | undefined;
  focus: Set<ViewerZone> | null;
  hovered: ViewerZone | null;
  setHovered: (z: ViewerZone | null) => void;
  onSelect: (nodeId: string) => void;
  labelPosition: [number, number, number];
  labelLayer: RefObject<HTMLDivElement | null>;
  children: (material: ReactNode) => ReactNode;
}

/** Wraps the meshes of one zone: status colour, focus dimming, hover and click. */
function ZoneGroup({
  zone,
  focus,
  hovered,
  setHovered,
  onSelect,
  labelPosition,
  labelLayer,
  children,
}: ZoneGroupProps) {
  if (!zone) return null;
  const inFocus = focus === null || focus.has(zone.zone);
  const isHovered = hovered === zone.zone;
  const color = viewerColor(zone.status);
  const emphasised = focus !== null && inFocus;

  const material = (
    <meshStandardMaterial
      color={inFocus ? color : STEEL}
      metalness={0.35}
      roughness={0.55}
      transparent={!inFocus}
      opacity={inFocus ? 1 : 0.28}
      emissive={color}
      emissiveIntensity={isHovered ? 0.35 : emphasised ? 0.18 : 0}
    />
  );

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(zone.zone);
    document.body.style.cursor = "pointer";
  };
  const handleOut = () => {
    setHovered(null);
    document.body.style.cursor = "";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(zone.nodeId);
  };

  const showLabel = isHovered || (inFocus && zone.status !== "healthy");

  return (
    <group onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
      {children(material)}
      {/*
        Labels render into a layer this component owns (not the R3F container) and are
        toggled with CSS rather than unmounted; both avoid DOM teardown conflicts.
      */}
      <Html
        portal={labelLayer as RefObject<HTMLElement>}
        position={labelPosition}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="whitespace-nowrap rounded border bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
          style={{
            borderColor: STATUS_META[zone.status].hex,
            color: "#0f1a2b",
            display: showLabel ? "block" : "none",
          }}
        >
          <span
            className="mr-1 inline-block size-1.5 rounded-full align-middle"
            style={{ background: STATUS_META[zone.status].hex }}
          />
          {zone.label} · {STATUS_META[zone.status].label}
        </div>
      </Html>
    </group>
  );
}

/** Scales the orthographic zoom so the whole machine fits the viewer at any width. */
function FitToViewport() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls);

  useEffect(() => {
    const { camera } = get();
    camera.zoom = Math.min(size.width / 13, size.height / 7.5);
    camera.updateProjectionMatrix();
    (controls as ComponentRef<typeof OrbitControls> | null)?.saveState();
  }, [get, size.width, size.height, controls]);

  return null;
}

function Outline({ show }: { show: boolean }) {
  return show ? <Edges color="#0e1c34" threshold={20} /> : null;
}

export default function EquipmentScene({ zones, focus, onSelect, resetSignal }: EquipmentSceneProps) {
  const [hovered, setHovered] = useState<ViewerZone | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const byZone = (z: ViewerZone) => zones.find((s) => s.zone === z);
  const outlined = (z: ViewerZone) => focus !== null && focus.has(z);
  const common = { focus, hovered, setHovered, onSelect, labelLayer };

  useEffect(() => {
    if (resetSignal > 0) controls.current?.reset();
  }, [resetSignal]);

  return (
    <div className="relative isolate h-full w-full">
      {/* Declared before the Canvas so the ref is attached before labels mount. */}
      <div ref={labelLayer} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />
      <Canvas
        orthographic
        camera={{ position: [9, 7, 11], zoom: 52, near: -100, far: 200 }}
        dpr={[1, 2]}
        onPointerMissed={() => (document.body.style.cursor = "")}
      >
        <color attach="background" args={["#f6f7f9"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 12, 8]} intensity={1.4} />
        <directionalLight position={[-8, 4, -6]} intensity={0.35} />
  
        <group position={[-0.6, 0, 0]}>
          {/* Support structure (not selectable) */}
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[10.6, 0.28, 0.5]} />
            <meshStandardMaterial color={STRUCTURE} metalness={0.4} roughness={0.6} />
          </mesh>
          {[-4.8, 0.2, 4.6].map((x) => (
            <mesh key={x} position={[x, 2.1, 0]}>
              <boxGeometry args={[0.12, 1.3, 0.12]} />
              <meshStandardMaterial color={STRUCTURE} />
            </mesh>
          ))}
  
          {/* Boiler wall and wall box */}
          <group position={[5.9, 0.6, 0]}>
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} position={[0.2, 0, -2 + i * 0.5]}>
                <cylinderGeometry args={[0.2, 0.2, 4.2, 16]} />
                <meshStandardMaterial color="#c9ced6" metalness={0.2} roughness={0.8} />
              </mesh>
            ))}
            <mesh position={[-0.2, -0.2, 0]}>
              <boxGeometry args={[0.35, 0.9, 0.9]} />
              <meshStandardMaterial color={STRUCTURE} />
            </mesh>
          </group>
  
          {/* Poppet valve — rear steam inlet */}
          <ZoneGroup zone={byZone("poppet_valve")} labelPosition={[-5, 1.0, 0]} {...common}>
            {(material) => (
              <group position={[-5, 0.4, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.32, 0.32, 0.55, 24]} />
                  {material}
                  <Outline show={outlined("poppet_valve")} />
                </mesh>
                <mesh position={[0, -0.6, 0]}>
                  <cylinderGeometry args={[0.13, 0.13, 0.8, 16]} />
                  {material}
                </mesh>
                <mesh position={[0, 0.36, 0]}>
                  <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
                  {material}
                </mesh>
              </group>
            )}
          </ZoneGroup>
  
          {/* Feed tube — fixed, runs inside the lance tube */}
          <ZoneGroup zone={byZone("feed_tube")} labelPosition={[-3.4, 0.75, 0]} {...common}>
            {(material) => (
              <mesh position={[-2.35, 0.4, 0]} rotation={[0, 0, HALF_PI]}>
                <cylinderGeometry args={[0.09, 0.09, 4.9, 16]} />
                {material}
                <Outline show={outlined("feed_tube")} />
              </mesh>
            )}
          </ZoneGroup>
  
          {/* Lance tube — travels with the carriage into the boiler */}
          <ZoneGroup zone={byZone("lance_tube")} labelPosition={[3.2, 0.8, 0]} {...common}>
            {(material) => (
              <group>
                <mesh position={[2.55, 0.4, 0]} rotation={[0, 0, HALF_PI]}>
                  <cylinderGeometry args={[0.16, 0.16, 7.3, 20]} />
                  {material}
                  <Outline show={outlined("lance_tube")} />
                </mesh>
                <mesh position={[6.35, 0.4, 0]} rotation={[0, 0, HALF_PI]}>
                  <cylinderGeometry args={[0.2, 0.2, 0.35, 20]} />
                  {material}
                </mesh>
              </group>
            )}
          </ZoneGroup>
  
          {/* Carriage with drive motor, riding on the beam */}
          <ZoneGroup zone={byZone("carriage")} labelPosition={[-1.2, 1.85, -0.9]} {...common}>
            {(material) => (
              <group position={[-1.2, 0.85, 0]}>
                <mesh>
                  <boxGeometry args={[1.3, 0.55, 0.85]} />
                  {material}
                  <Outline show={outlined("carriage")} />
                </mesh>
                {[-0.45, 0.45].flatMap((x) =>
                  [-0.3, 0.3].map((z) => (
                    <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation={[HALF_PI, 0, 0]}>
                      <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
                      {material}
                    </mesh>
                  )),
                )}
                <mesh position={[0.1, 0.05, -0.75]} rotation={[HALF_PI, 0, 0]}>
                  <cylinderGeometry args={[0.22, 0.22, 0.65, 24]} />
                  {material}
                </mesh>
              </group>
            )}
          </ZoneGroup>
  
          {/* Gearbox on the carriage */}
          <ZoneGroup zone={byZone("gearbox")} labelPosition={[-1.2, 1.7, 1.15]} {...common}>
            {(material) => (
              <mesh position={[-1.2, 0.8, 0.72]}>
                <boxGeometry args={[0.8, 0.62, 0.55]} />
                {material}
                <Outline show={outlined("gearbox")} />
              </mesh>
            )}
          </ZoneGroup>
  
          {/* Bearing housing on the gearbox output */}
          <ZoneGroup zone={byZone("bearing")} labelPosition={[-0.9, 0.35, 1.6]} {...common}>
            {(material) => (
              <mesh position={[-0.95, 0.72, 1.05]}>
                <torusGeometry args={[0.15, 0.06, 12, 28]} />
                {material}
                <Outline show={outlined("bearing")} />
              </mesh>
            )}
          </ZoneGroup>
        </group>
  
        <FitToViewport />
        <gridHelper args={[24, 24, "#c5cdd9", "#e2e6ec"]} position={[0, -0.8, 0]} />
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          minZoom={30}
          maxZoom={140}
          minPolarAngle={0.35}
          maxPolarAngle={HALF_PI - 0.05}
        />
      </Canvas>
    </div>
  );
}
