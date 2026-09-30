/**
 * Index over a loaded GLB scene, built ONCE per model instance. Lookups are
 * by stable object name; nothing depends on traversal order.
 *
 * Each mesh keeps its source material untouched in `originals` and renders
 * with a private working clone, so visual states (health tint, fade, select)
 * can be applied and reverted without mutating the loaded GLB.
 */

import * as THREE from "three";

export interface ModelIndex {
  root: THREE.Object3D;
  byName: Map<string, THREE.Object3D>;
  meshes: THREE.Mesh[];
  originals: Map<THREE.Mesh, THREE.MeshStandardMaterial>;
  /** Every mesh at or below the named object (cached). */
  meshesOf(name: string): THREE.Mesh[];
  /** World-space bounding box of the named object (cached). */
  boxOf(name: string): THREE.Box3 | null;
  /** Names of the object and all its named ancestors, nearest first. */
  lineage(object: THREE.Object3D): string[];
  dispose(): void;
}

export function buildModelIndex(root: THREE.Object3D): ModelIndex {
  root.updateMatrixWorld(true);
  const byName = new Map<string, THREE.Object3D>();
  const meshes: THREE.Mesh[] = [];
  const originals = new Map<THREE.Mesh, THREE.MeshStandardMaterial>();

  root.traverse((o) => {
    if (o.name && !byName.has(o.name)) byName.set(o.name, o);
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const source = mesh.material as THREE.MeshStandardMaterial;
      originals.set(mesh, source);
      mesh.material = source.clone();            // Private working material.
      meshes.push(mesh);
    }
  });

  const meshCache = new Map<string, THREE.Mesh[]>();
  const boxCache = new Map<string, THREE.Box3 | null>();

  return {
    root,
    byName,
    meshes,
    originals,
    meshesOf(name) {
      let list = meshCache.get(name);
      if (!list) {
        list = [];
        byName.get(name)?.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) list!.push(o as THREE.Mesh);
        });
        meshCache.set(name, list);
      }
      return list;
    },
    boxOf(name) {
      if (!boxCache.has(name)) {
        const o = byName.get(name);
        boxCache.set(name, o ? new THREE.Box3().setFromObject(o) : null);
      }
      return boxCache.get(name)!;
    },
    lineage(object) {
      const names: string[] = [];
      for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o.name) names.push(o.name);
      return names;
    },
    dispose() {
      for (const mesh of meshes) (mesh.material as THREE.Material).dispose();
    },
  };
}

/** Union of world boxes for several named objects. */
export function unionBox(index: ModelIndex, names: string[]): THREE.Box3 | null {
  const box = new THREE.Box3();
  let any = false;
  for (const n of names) {
    const b = index.boxOf(n);
    if (b && !b.isEmpty()) {
      box.union(b);
      any = true;
    }
  }
  return any ? box : null;
}
