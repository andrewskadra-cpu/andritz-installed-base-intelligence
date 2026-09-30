# ANDRITZ Installed-Base Intelligence

Frontend prototype for exploring installed equipment from customer down to component:

Customer → Plant → Unit → Asset → Assembly → Component

> **All data is fictional demo data.** No real customer, plant, failure statistic or equipment specification is included.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

## Routes

| Route | Screen |
| --- | --- |
| `/` | Installed-base search |
| `/customers/[customerId]` | Customer overview |
| `/plants/[plantId]` | Plant overview with units and equipment status |
| `/assets/[assetId]?entity=<id>` | Asset intelligence; `entity` selects an assembly or component |

Demo entry point: `/assets/ik700-10482?entity=ik700-10482-worm-thrust-bearing-a` (Gearbox Assembly → Worm Shaft → Worm Thrust Bearing A)

## Structure

```
app/                  App Router pages (root-level, no src/)
components/layout     AppSidebar, TopBar, Breadcrumbs
components/search     InstalledBaseSearch
components/customer   CustomerCard
components/plant      PlantHeader, PlantHealthSummary, AssetList
components/asset      Asset screen: header, hierarchy, 3D viewer, intelligence, tabs
components/ui         Status/evidence badges, panels, tabs and other primitives
data/demo-data.ts     Demo dataset (the only place equipment values live)
lib/installed-base.ts Async query layer — swap its internals for Supabase
lib/asset-model.ts    Builds the derived asset model (hierarchy, rolled-up health, conditions, metrics)
lib/asset-selection.ts Resolves the selected entity and scopes every panel to it
types/installed-base.ts Domain types
```

## Data model and single source of truth

- Equipment below an asset is a generic tree of `AssetEntity` records linked by `parentId`, so any depth works.
- Health is never stored. `buildAssetModel` derives it: live telemetry (via the health engine) sets the status of monitored regions, inspection records set the rest, and statuses roll up to parents. Home, customer, plant and asset pages all use this pipeline, so they cannot disagree.
- Last service, last inspection, last replacement and hours since service are derived from `ServiceEvent` records.
- Documents and BOM lines attach to exactly one node. When a node has none, the UI shows the nearest parent's and says so.
- The asset page has one selection state: the `?entity=` query parameter.

## Evidence levels

Condition statements are always labelled by certainty:

- **Observed**: a raw measured value.
- **Detected**: a rule or baseline comparison.
- **Inferred**: a hypothesis for inspection planning, not a diagnosis.
- **Confirmed**: technician-verified only. Unconfirmed items render greyed out.

## Live telemetry (simulated)

The asset page streams **synthetic** telemetry, labelled "Live demo data" everywhere it appears. The flow is designed for the production path:

```
Physical sensor / PLC → Edge gateway → API / Database
  → TelemetryProvider → Health engine → UI
```

| File | Role |
| --- | --- |
| `types/telemetry.ts` | `TelemetryFrame`, `TelemetryProvider` interface, health-engine output types |
| `lib/telemetry/telemetry-provider.ts` | Chooses the provider per asset. **This is the swap point for a real sensor/API provider.** |
| `lib/telemetry/simulator.ts` | `TelemetrySimulator`: NORMAL / DEGRADING modes with smooth, seeded, auto-correlated values |
| `lib/telemetry/health-engine.ts` | All demo thresholds and trend rules. Returns status, reasons, per-zone status and findings |
| `lib/telemetry/live-context.ts` | Applies the live assessment to the asset context (tree, 3D view, intelligence panel) |
| `lib/telemetry/use-telemetry.ts` | React hook: subscribes to a provider and runs the health engine |
| `data/demo-telemetry.ts` | Per-asset simulator starting conditions (demo data) |

Components never generate values and never compare against thresholds. The health engine only emits OBSERVED, DETECTED and INFERRED statements. CONFIRMED always reads "No technician-confirmed mechanical failure".

## Outage scope

`/plants/[plantId]/outage-scope?unit=<unitId>` turns current health into **outage planning suggestions**. It opens from **Build Outage Scope** on the plant page (per plant or per unit) and on the asset page.

- `lib/outage/generate-outage-scope.ts`: a pure generator. It consumes the derived asset models (records + health-engine output), the planned outage and the inspection checklist in `data/demo-outage.ts`. It has no threshold logic of its own.
- Every inspection consideration and contingency part carries trace references (equipment, telemetry signal, health-engine detection, service record, document, BOM line). Items without a supporting record are dropped.
- Checklist items are included only when the node has an active condition, a related signal is detected, and the referenced service event and documents exist.
- CONFIRMED is populated only from a service event with a `confirmedFinding`. None exist in the demo data.
- Live telemetry streams live in a browser-side registry (`lib/telemetry/telemetry-registry.ts`) that survives navigation. Build and Refresh capture a frozen snapshot, so the scope shows the same values as the asset page.
- Wording is decision-support only ("Consider…", "Parts to consider having available"). The page shows a planning-support notice and prints cleanly with **Print / export preview**.

## 3D viewer

`components/asset/EquipmentScene.tsx` draws a placeholder sootblower from primitive geometry, with selectable zones keyed by `ViewerZone`. It is not an engineering model. Replace it with a GLB per equipment model later and keep the same zone keys.
