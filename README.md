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
| `/assets/[assetId]?node=<id>` | Asset intelligence; `node` selects an assembly or component |

Demo entry point: `/assets/ik700-10482?node=ik700-10482-bearing-b204`

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
lib/asset-selection.ts Resolves the selected hierarchy node and scopes data to it
types/installed-base.ts Domain types
```

## Evidence levels

Condition statements are always labelled by certainty:

- **Observed**: a raw measured value.
- **Detected**: a rule or baseline comparison.
- **Inferred**: a hypothesis for inspection planning, not a diagnosis.
- **Confirmed**: technician-verified only. Unconfirmed items render greyed out.

## 3D viewer

`components/asset/EquipmentScene.tsx` draws a placeholder sootblower from primitive geometry, with selectable zones keyed by `ViewerZone`. It is not an engineering model. Replace it with a GLB per equipment model later and keep the same zone keys.
