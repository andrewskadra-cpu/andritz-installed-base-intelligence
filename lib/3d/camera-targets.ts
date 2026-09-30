/**
 * Controlled camera framing for the IK-700 model. Model space is the GLB's:
 * metres, Y up, the machine running along +X (rear valve -> boiler), with the
 * drive side (motor, worm) facing +Z.
 */

import * as THREE from "three";
import type { EntityModelMapping, ModelView } from "./ik700-model-map";
import { unionBox, type ModelIndex } from "./model-object-index";

export interface CameraGoal {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/** Viewing direction per view (from target towards camera). */
const DIRECTION: Record<ModelView, THREE.Vector3> = {
  asset: new THREE.Vector3(0.28, 0.36, 1).normalize(),
  carriage: new THREE.Vector3(0.55, 0.5, 1).normalize(),
  gearbox: new THREE.Vector3(0.35, 0.55, 1).normalize(),
  component: new THREE.Vector3(0.4, 0.5, 1).normalize(),
};

/** Extra framing margin per view; component view keeps surrounding context. */
const MARGIN: Record<ModelView, number> = { asset: 0.84, carriage: 1.9, gearbox: 1.35, component: 1.6 };

/** Components smaller than this (m) are framed as if this big, so context stays visible. */
const MIN_COMPONENT_SIZE = 0.45;

export function cameraGoalFor(
  index: ModelIndex,
  mapping: EntityModelMapping,
  fovDeg: number,
  aspect: number,
): CameraGoal | null {
  const names = mapping.frame ?? (mapping.objects.length ? mapping.objects : ["IK700"]);
  const box = unionBox(index, names);
  if (!box) return null;
  const target = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  let radius = size.length() / 2;
  if (mapping.view === "component") radius = Math.max(radius, MIN_COMPONENT_SIZE / 2);
  const vFov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const fit = radius / Math.sin(Math.min(vFov, hFov) / 2);
  const distance = fit * MARGIN[mapping.view];
  return { target, position: target.clone().addScaledVector(DIRECTION[mapping.view], distance) };
}
