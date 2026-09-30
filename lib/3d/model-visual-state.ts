/**
 * Centralised visual state for the IK-700 model.
 *
 * Two independent channels, never mixed:
 *   HEALTH   -> material colour tint (+ faint glow for attention/critical),
 *               taken from the application's existing health engine output.
 *   SELECTED -> blue edge outline + blue emissive that pulses smoothly
 *               (static when the user prefers reduced motion). Emissive adds
 *               light on top of the tinted base colour, so health stays visible.
 * Plus view emphasis (opacity) and housing reveal (normal / faded / hidden).
 *
 * All changes are applied to per-mesh working materials; the loaded source
 * materials are only read, so every state is reversible.
 */

import * as THREE from "three";
import { STATUS_META } from "@/components/ui/status";
import { worstStatus } from "@/lib/telemetry/health-engine";
import type { HealthStatus } from "@/types/installed-base";
import {
  BEAM_OBJECT,
  ENTITY_MODEL_MAP,
  HOUSING_OBJECTS,
  type EntityModelMapping,
  type ModelView,
} from "./ik700-model-map";
import type { ModelIndex } from "./model-object-index";

export type HousingMode = "normal" | "faded" | "hidden";

const TINT_STRENGTH: Record<HealthStatus, number> = { critical: 0.55, attention: 0.5, healthy: 0.14, unknown: 0 };
const GLOW: Record<HealthStatus, number> = { critical: 0.14, attention: 0.1, healthy: 0, unknown: 0 };
const INTERNAL_FACTOR = 0.45;          // Internals carry their group's health, more quietly.
const SELECT_COLOR = new THREE.Color("#2f6fdf");
const HOVER_COLOR = new THREE.Color("#ffffff");
const TINT_COLOR = Object.fromEntries(
  (Object.keys(STATUS_META) as HealthStatus[]).map((s) => [s, new THREE.Color(STATUS_META[s].hex)]),
) as Record<HealthStatus, THREE.Color>;

/** Selection pulse: one smooth cosine cycle; never fades the geometry itself. */
export const SELECT_PULSE_PERIOD = 1.4;            // Seconds per cycle.
const SELECT_EMISSIVE_RANGE: [number, number] = [0.14, 0.46];
const SELECT_OUTLINE_RANGE: [number, number] = [0.5, 1];
const SELECT_STATIC_EMISSIVE = 0.38;               // Reduced-motion / initial state.

/**
 * Update the selection highlight for this frame. Only touches the selected
 * meshes' working materials and the shared outline material.
 * @param elapsed seconds since the current selection began (phase restarts on change)
 */
export function applySelectionPulse(
  materials: THREE.MeshStandardMaterial[],
  edges: SelectionEdges,
  elapsed: number,
  reducedMotion: boolean,
) {
  // Starts at the peak, so a new selection is immediately obvious, then eases down and back.
  const w = reducedMotion ? 1 : 0.5 + 0.5 * Math.cos((2 * Math.PI * elapsed) / SELECT_PULSE_PERIOD);
  const emissive = reducedMotion
    ? SELECT_STATIC_EMISSIVE
    : SELECT_EMISSIVE_RANGE[0] + (SELECT_EMISSIVE_RANGE[1] - SELECT_EMISSIVE_RANGE[0]) * w;
  for (const m of materials) {
    m.emissiveIntensity = emissive;
    m.userData.pulseIntensity = emissive;
  }
  edges.setOpacity(SELECT_OUTLINE_RANGE[0] + (SELECT_OUTLINE_RANGE[1] - SELECT_OUTLINE_RANGE[0]) * w);
}

/** Opacity below which a mesh is not clickable (clicks pass through to what is behind). */
export const PICKABLE_OPACITY = 0.3;

export interface HealthSurfaces {
  /** Named exterior surfaces and the health they display (worst claim wins). */
  surfaces: Map<string, HealthStatus>;
  /** Groups whose internals carry a quiet health tint. */
  internal: Map<string, HealthStatus>;
}

/** Health per model surface, from the application's entity statuses. */
export function deriveHealthSurfaces(statusOf: (key: string) => HealthStatus | null): HealthSurfaces {
  const surfaces = new Map<string, HealthStatus>();
  const internal = new Map<string, HealthStatus>();
  for (const [key, m] of Object.entries(ENTITY_MODEL_MAP)) {
    const status = statusOf(key);
    if (!status) continue;
    // First claim sets the surface; further claims keep the worst (e.g. the
    // housing shows worst of carriage and gearbox).
    for (const o of m.healthObjects) {
      const prev = surfaces.get(o);
      surfaces.set(o, prev ? worstStatus([prev, status]) : status);
    }
    for (const o of m.internalHealth ?? []) internal.set(o, status);
  }
  return { surfaces, internal };
}

export function defaultHousingMode(mapping: EntityModelMapping): HousingMode {
  if (mapping.view === "gearbox") return "faded";
  if (mapping.view === "component" && mapping.context?.some((c) => c.object === "Gearbox")) return "faded";
  return "normal";
}

export interface VisualInputs {
  mapping: EntityModelMapping;
  health: HealthSurfaces;
  housingMode: HousingMode;
  /** Click-target object currently under the pointer. */
  hoveredObject: string | null;
}

export interface MeshVisual {
  visible: boolean;
  opacity: number;
  tint: HealthStatus | null;
  tintStrength: number;
  selected: boolean;
  hovered: boolean;
  pickable: boolean;
}

function viewOpacity(view: ModelView, mapping: EntityModelMapping, lineage: string[]): number {
  if (view === "asset") return 1;
  if (lineage.includes(BEAM_OBJECT)) return 0.07;           // Canopy would hide the carriage.
  if (mapping.objects.some((o) => lineage.includes(o))) return 1;
  if (view === "carriage") return lineage.includes("Carriage") ? 1 : 0.3;
  if (view === "gearbox") return lineage.includes("Gearbox") ? 1 : lineage.includes("Carriage") ? 0.5 : 0.15;
  const rule = mapping.context?.find((c) => lineage.includes(c.object));
  return rule ? rule.opacity : 0.15;
}

export function computeVisualPlan(index: ModelIndex, inputs: VisualInputs): Map<THREE.Mesh, MeshVisual> {
  const { mapping, health, housingMode, hoveredObject } = inputs;
  const plan = new Map<THREE.Mesh, MeshVisual>();
  for (const mesh of index.meshes) {
    const lineage = index.lineage(mesh);
    let opacity = viewOpacity(mapping.view, mapping, lineage);
    let visible = true;
    if (HOUSING_OBJECTS.some((h) => lineage.includes(h))) {
      if (housingMode === "hidden") visible = false;
      else if (housingMode === "faded") opacity = Math.min(opacity, 0.14);
    }
    let tint: HealthStatus | null = null;
    let tintStrength = 0;
    const surface = lineage.find((n) => health.surfaces.has(n));
    if (surface) {
      tint = health.surfaces.get(surface)!;
      tintStrength = TINT_STRENGTH[tint];
    } else {
      const group = lineage.find((n) => health.internal.has(n));
      if (group) {
        tint = health.internal.get(group)!;
        tintStrength = TINT_STRENGTH[tint] * INTERNAL_FACTOR;
      }
    }
    // Every mapped selection except the whole asset (pulsing the entire
    // machine would carry no information).
    const selected = mapping.view !== "asset" && mapping.objects.some((o) => lineage.includes(o));
    plan.set(mesh, {
      visible,
      opacity,
      tint,
      tintStrength,
      selected,
      hovered: hoveredObject !== null && lineage.includes(hoveredObject),
      pickable: visible && opacity >= PICKABLE_OPACITY,
    });
  }
  return plan;
}

/** Write a plan onto the working materials (source materials are only read). */
export function applyVisualPlan(index: ModelIndex, plan: Map<THREE.Mesh, MeshVisual>) {
  for (const [mesh, v] of plan) {
    const base = index.originals.get(mesh)!;
    const m = mesh.material as THREE.MeshStandardMaterial;
    m.color.copy(base.color);
    if (v.tint) m.color.lerp(TINT_COLOR[v.tint], v.tintStrength);
    m.emissive.copy(base.emissive);
    m.emissiveIntensity = base.emissiveIntensity;
    if (v.tint && GLOW[v.tint] > 0) {
      m.emissive.copy(TINT_COLOR[v.tint]);
      m.emissiveIntensity = GLOW[v.tint];
    }
    if (v.selected) {
      m.emissive.copy(SELECT_COLOR);
      // Animated by applySelectionPulse; only initialise when newly selected so
      // re-applying a plan (e.g. hover elsewhere) never interrupts the pulse.
      m.emissiveIntensity = m.userData.pulseIntensity ?? SELECT_STATIC_EMISSIVE;
    } else if (v.hovered) {
      m.emissive.copy(HOVER_COLOR);
      m.emissiveIntensity = 0.12;
    }
    if (!v.selected) delete m.userData.pulseIntensity;   // Pulse stops immediately.
    const transparent = v.opacity < 0.999;
    if (m.transparent !== transparent) m.needsUpdate = true;
    m.transparent = transparent;
    m.opacity = v.opacity;
    m.depthWrite = !transparent;
    mesh.visible = v.visible;
  }
}

/** Blue edge outlines on selected meshes; edge geometry is cached per mesh geometry. */
export class SelectionEdges {
  private edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
  private lines = new Map<THREE.Mesh, THREE.LineSegments>();
  private material = new THREE.LineBasicMaterial({ color: SELECT_COLOR, transparent: true, opacity: 1 });

  setOpacity(opacity: number) {
    this.material.opacity = opacity;
  }

  sync(selected: THREE.Mesh[]) {
    const want = new Set(selected);
    for (const [mesh, line] of this.lines) {
      if (!want.has(mesh)) {
        mesh.remove(line);
        this.lines.delete(mesh);
      }
    }
    for (const mesh of want) {
      if (this.lines.has(mesh)) continue;
      let edges = this.edgeCache.get(mesh.geometry);
      if (!edges) {
        edges = new THREE.EdgesGeometry(mesh.geometry, 35);
        this.edgeCache.set(mesh.geometry, edges);
      }
      const line = new THREE.LineSegments(edges, this.material);
      line.raycast = () => {};                 // Outlines are never click targets.
      mesh.add(line);
      this.lines.set(mesh, line);
    }
  }

  dispose() {
    this.sync([]);
    this.material.dispose();
  }
}
