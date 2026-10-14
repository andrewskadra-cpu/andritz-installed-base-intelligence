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
const MARGIN: Record<ModelView, number> = { asset: 0.84, carriage: 1.9, gearbox: 1.3, component: 1.35 };

/** Breathing room around the tight whole-machine fit (fraction of the viewport kept clear). */
const ASSET_TIGHT_MARGIN = 1.1;

/**
 * Distance at which every corner of `box` fits the view frustum when looking
 * at `target` from `direction`. Tighter than a bounding sphere for long,
 * slender equipment (the IK-700 is ~10x longer than it is tall).
 */
function tightFitDistance(box: THREE.Box3, target: THREE.Vector3, direction: THREE.Vector3, vFov: number, hFov: number) {
  const forward = direction.clone();                 // target -> camera
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  const tanV = Math.tan(vFov / 2);
  const tanH = Math.tan(hFov / 2);
  const corner = new THREE.Vector3();
  let distance = 0;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(target);
    const towardCamera = corner.dot(forward);
    distance = Math.max(
      distance,
      Math.abs(corner.dot(right)) / tanH + towardCamera,
      Math.abs(corner.dot(up)) / tanV + towardCamera,
    );
  }
  return distance;
}

/** Components smaller than this (m) are framed as if this big, so context stays visible. */
const MIN_COMPONENT_SIZE = 0.4;

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
  if (mapping.view === "asset") {
    // Whole machine: fit its actual silhouette, not its bounding sphere, so it fills the viewer.
    const distance = tightFitDistance(box, target, DIRECTION.asset, vFov, hFov) * ASSET_TIGHT_MARGIN;
    return { target, position: target.clone().addScaledVector(DIRECTION.asset, distance) };
  }
  const fit = radius / Math.sin(Math.min(vFov, hFov) / 2);
  const margin = MARGIN[mapping.view];
  const distance = fit * margin;
  return { target, position: target.clone().addScaledVector(DIRECTION[mapping.view], distance) };
}
