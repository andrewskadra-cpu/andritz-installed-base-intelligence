"use client";

import { IK700Viewer } from "@/components/3d/IK700Viewer";
import { IK700_MODEL } from "@/lib/3d/ik700-model-map";
import type { AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import { PlaceholderEquipmentViewer } from "./PlaceholderEquipmentViewer";

/**
 * Equipment visualization for the asset page. IK-700 assets use the real
 * local visualization model; the procedural placeholder remains the fallback
 * (the model file is gitignored and may be absent) and for other equipment.
 */
export function EquipmentViewer({
  model,
  selection,
  onSelect,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
}) {
  const placeholder = (
    <PlaceholderEquipmentViewer model={model} selection={selection} onSelect={(id) => onSelect(id)} />
  );
  const usesIK700Model = (IK700_MODEL.equipmentModels as readonly string[]).includes(model.records.asset.model);
  if (!usesIK700Model) return placeholder;
  return <IK700Viewer model={model} selection={selection} onSelect={onSelect} fallback={placeholder} />;
}
