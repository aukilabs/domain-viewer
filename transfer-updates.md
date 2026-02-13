# Gaussian Splat Rendering — Integration & Transfer Guide

> **Audience:** Third-party developers maintaining their own fork/version of the domain-viewer renderer website.
>
> **Scope:** This document describes the complete rewrite of the Gaussian Splat rendering pipeline — from data loading through GPU rendering and reveal animations. Follow the steps in order; each section builds on the previous one.

---

## Table of Contents

1. [Overview of Changes](#1-overview-of-changes)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Dependencies](#3-dependencies)
4. [New & Modified Files (Full Inventory)](#4-new--modified-files-full-inventory)
5. [Deleted Files](#5-deleted-files)
6. [Step-by-Step Implementation](#6-step-by-step-implementation)
   - 6.1 [Types & Data Model](#61-types--data-model)
   - 6.2 [State Management (Jotai Atoms)](#62-state-management-jotai-atoms)
   - 6.3 [Service Layer Updates](#63-service-layer-updates)
   - 6.4 [DomainLoader — Hydrating the New Atoms](#64-domainloader--hydrating-the-new-atoms)
   - 6.5 [useInterval Hook](#65-useinterval-hook)
   - 6.6 [useRefinementSplat — Data Loading Hook](#66-userefinementsplat--data-loading-hook)
   - 6.7 [useRefinementHasSplat — Lightweight Existence Check](#67-userefinementhassplat--lightweight-existence-check)
   - 6.8 [Reveal Animation Shaders](#68-reveal-animation-shaders)
   - 6.9 [SparkRoot & SparkSplat — R3F Rendering Components](#69-sparkroot--sparksplat--r3f-rendering-components)
   - 6.10 [RefinementSplat — Composition Layer](#610-refinementsplat--composition-layer)
   - 6.11 [Viewer3D — Scene Integration](#611-viewer3d--scene-integration)
   - 6.12 [Hook Barrel Exports](#612-hook-barrel-exports)
7. [Data Formats & Naming Conventions](#7-data-formats--naming-conventions)
8. [Partition LOD Selection Logic](#8-partition-lod-selection-logic)
9. [API Endpoint Reference](#9-api-endpoint-reference)
10. [Known Gotchas & Troubleshooting](#10-known-gotchas--troubleshooting)

---

## 1. Overview of Changes

The old rendering pipeline used **`SplatViewer`** and **`LocalSplatViewer`** — monolithic components that each managed their own `SparkRenderer`, data fetching, mesh creation, and animation in a single file. The new pipeline separates concerns into clean layers:

| Layer | Old | New |
|-------|-----|-----|
| **Data loading** | `useSplatData` (single file only) | `useRefinementSplat` (partitioned + single, progressive) |
| **Existence check** | Derived from `splatDataAtom` | `useRefinementHasSplat` (metadata-only, no downloads) |
| **GPU renderer** | Inline in each viewer | `SparkRoot` + `SparkSplat` (reusable R3F components) |
| **Reveal animation** | Inline in each viewer | `splatShaders.ts` → integrated into `SparkSplat` via props |
| **Scene integration** | `SplatViewer` directly in `Viewer3D` | `RefinementSplat` wraps hooks + renderer |
| **State discovery** | `splatData.fileId` atom | `refinementIdAtom` + `domainDataItemsAtom` |

**Key new capabilities:**
- **Partitioned splats** — large scenes are split into spatial tiles, each loaded and rendered independently.
- **SOG compressed format** — `.sogs.zip` files via `SplatFileType.PCSOGSZIP`.
- **Progressive loading** — tiles appear one by one as they download.
- **LOD selection** — coarse/fine tiles replace full-resolution tiles when available.
- **Distance culling, fade, downsampling** — per-tile rendering optimisations.
- **Reveal animations preserved** — Magic, Spread, Unroll, Twister, Rain effects via optional `revealEffect` prop.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Viewer3D.tsx  (R3F <Canvas>)                               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  RefinementSplat  (Suspense boundary)                 │  │
│  │                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐│  │
│  │  │  useRefinement-  │  │  SparkRoot                  ││  │
│  │  │  Splat hook      │  │  (SparkRenderer init)       ││  │
│  │  │                  │  └─────────────────────────────┘│  │
│  │  │  Fetches binary  │                                 │  │
│  │  │  data via React  │  ┌─────────────────────────────┐│  │
│  │  │  Query            │  │  SparkSplat (× N tiles)     ││  │
│  │  │                  │  │  • SplatMesh from bytes      ││  │
│  │  │  Progressive     │  │  • Distance culling          ││  │
│  │  │  cache updates   │  │  • Reveal animation          ││  │
│  │  └─────────────────┘  │  • Fade / downsampling       ││  │
│  │                       └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Jotai atoms: domainDataAtom, domainDataItemsAtom,          │
│               refinementIdAtom, splatVisibleAtom             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Dependencies

Make sure your `package.json` includes:

```jsonc
{
  "dependencies": {
    "@sparkjsdev/spark": "github:aukilabs/sparkjs#auki-1",
    "@tanstack/react-query": "^5.90.19",
    "@react-three/fiber": "^9.2.0",
    "@react-three/drei": "^10.5.1",
    "three": "^0.182.0",
    "jotai": "^2.7.1"
    // ... your other deps
  }
}
```

> **Note on `@sparkjsdev/spark`:** This points to the `auki-1` branch of a private GitHub repo (`aukilabs/sparkjs`). You need SSH access to this repo for `npm install` to succeed. Configure Git to use SSH:
> ```bash
> git config --global url."git@github.com:".insteadOf "https://github.com/"
> ```
> If you don't have access, contact the Auki team for the correct dependency source.

Install after updating `package.json`:
```bash
npm install
```

---

## 4. New & Modified Files (Full Inventory)

### New files to create

| File | Purpose |
|------|---------|
| `types/splat.ts` | `SplatEffect` type union |
| `hooks/useInterval.ts` | Generic `setInterval` hook |
| `hooks/useRefinementSplat.ts` | Data loading (partitioned + single) |
| `hooks/useRefinementHasSplat.ts` | Metadata-only existence check |
| `utils/splatShaders.ts` | GLSL reveal animation effects |
| `components/3d/spark-r3f.tsx` | `SparkRoot` & `SparkSplat` R3F components |
| `components/3d/RefinementSplat.tsx` | Composition layer connecting data → renderer |

### Modified files

| File | What changed |
|------|-------------|
| `types/domain.ts` | Added `SplatItem.data_type` variants, `domainDataItems` and `refinementId` to `DomainDataCollection` |
| `store/domainStore.ts` | Added `domainDataItemsAtom`, `refinementIdAtom`; updated `hasSplatDataAtom` |
| `services/domainService.ts` | `findSplatItem` recognises SOG types; `loadAllDomainData` returns `domainDataItems` + `refinementId` |
| `components/domain/DomainLoader.tsx` | Hydrates the two new atoms |
| `components/Viewer3D.tsx` | Replaced `<SplatViewer>` with `<RefinementSplat>` |
| `hooks/index.ts` | Barrel exports for new hooks |

---

## 5. Deleted Files

These files are **no longer needed** and should be removed:

| File | Reason |
|------|--------|
| `components/SplatViewer.tsx` | Replaced by `RefinementSplat` + `SparkSplat` |
| `components/LocalSplatViewer.tsx` | Replaced by `RefinementSplat` + `SparkSplat` |
| `components/CustomSplat.web.tsx` | Not imported by anything |
| `components/CustomGrid.tsx` | Not imported by anything |
| `components/SkyBox.tsx` | Not imported by anything |
| `components/PerformanceMonitor.tsx` | Only used by the deleted viewers |
| `hooks/useSplatData.ts` | Only used by deleted `SplatViewer` |
| `utils/webgl-check.ts` | Only used by deleted viewers |

Also remove the `useSplatData` re-export from `hooks/index.ts` if present.

---

## 6. Step-by-Step Implementation

### 6.1 Types & Data Model

#### `types/splat.ts`

Create (or update) this file with just the effect type union:

```typescript
/**
 * Available visual effects for splat rendering
 */
export type SplatEffect = "Magic" | "Spread" | "Unroll" | "Twister" | "Rain";
```

#### `types/domain.ts`

Add the following `data_type` variants to `SplatItem`:

```typescript
export interface SplatItem extends DomainDataItem {
  data_type:
    | 'refined_splat'
    | 'splat_data'
    | 'splat_data_sog'       // ← NEW: SOG compressed single-file
    | 'splat_partition'       // ← NEW: partition tile (.splat)
    | 'splat_partition_sog'   // ← NEW: partition tile (.sogs.zip)
    | 'splat'
    | 'gaussian_splat';
  name: string;
}
```

Add two new fields to `DomainDataCollection`:

```typescript
export interface DomainDataCollection {
  // ... existing fields ...

  /** Raw domain data items list from the server (used for partition discovery) */
  domainDataItems: DomainDataItem[];

  /** Canonical refinement ID from domain metadata */
  refinementId: string | null;
}
```

---

### 6.2 State Management (Jotai Atoms)

In your domain store (e.g. `store/domainStore.ts`), add two new atoms:

```typescript
import type { DomainDataItem } from '@/types/domain';

/**
 * Raw domain data items list from the server.
 * Used by useRefinementSplat to discover partition and single-file splats.
 */
export const domainDataItemsAtom = atom<DomainDataItem[]>([]);

/**
 * Canonical refinement ID from domain metadata.
 * Used as the key for loading Gaussian splat data.
 */
export const refinementIdAtom = atom<string | null>(null);
```

Update `hasSplatDataAtom` to also check the new refinement path:

```typescript
export const hasSplatDataAtom = atom(
  (get) => !!get(splatDataAtom) || !!get(refinementIdAtom)
);
```

---

### 6.3 Service Layer Updates

In `domainService.ts`:

1. **`findSplatItem`** — ensure the `singleSplatDataTypes` array includes `'splat_data_sog'`:

```typescript
const singleSplatDataTypes = [
  'refined_splat', 'splat_data', 'splat_data_sog',
  'splat', 'gaussian_splat',
];
```

2. **`loadAllDomainData`** — include the raw data list and refinement ID in the returned `DomainDataCollection`:

```typescript
const result: DomainDataCollection = {
  domainData,
  portals,
  navMesh,
  occlusionMesh,
  pointCloud,
  splatData,
  alignmentMatrix: metadata?.canonicalRefinementAlignmentMatrix || null,
  domainDataItems: dataList,                           // ← NEW
  refinementId: metadata?.canonicalRefinement || null,  // ← NEW
};
```

---

### 6.4 DomainLoader — Hydrating the New Atoms

In the component that populates your Jotai atoms after data loads (e.g. `DomainLoader.tsx`):

```typescript
import { domainDataItemsAtom, refinementIdAtom } from "@/store/domainStore";

// Inside the component:
const setDomainDataItems = useSetAtom(domainDataItemsAtom);
const setRefinementId = useSetAtom(refinementIdAtom);

// In the useEffect that processes loaded data:
useEffect(() => {
  if (data) {
    // ... existing atom updates ...

    // NEW: store domain data items list and refinement ID
    setDomainDataItems(data.domainDataItems || []);
    setRefinementId(data.refinementId || null);
  }
}, [data, /* ... other deps ... */ setDomainDataItems, setRefinementId]);
```

---

### 6.5 useInterval Hook

Create `hooks/useInterval.ts`:

```typescript
import { useEffect, useRef } from 'react';

const useInterval = (callback: Function, delay?: number | null) => {
  const savedCallback = useRef<Function>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [delay]);
};

export default useInterval;
```

---

### 6.6 useRefinementSplat — Data Loading Hook

Create `hooks/useRefinementSplat.ts`. This is the core data-fetching hook.

**What it does:**
1. Scans `domainDataItems` for partition entries matching the refinement ID.
2. Parses partition names to extract grid coordinates, size, LOD type, and format.
3. Performs LOD selection (prefers coarse+fine over full).
4. Downloads each tile sequentially, progressively updating the React Query cache so tiles render as they arrive.
5. Falls back to single-file splat download if no partitions are found.

**Key types exported:**

```typescript
export type ParsedPartition = {
  id: string;
  name: string;
  partitionSize: number;
  partitionX: number;
  partitionZ: number;
  splatFileType: SplatFileType;
  lodType: 'full' | 'coarse' | 'fine';
  loadedData: ArrayBuffer | null;
};

export type RefinementSplatData =
  | { type: 'partitions'; partitions: ParsedPartition[] }
  | { type: 'single'; buffer: ArrayBuffer; splatFileType: SplatFileType }
  | null;
```

**Helper — data type to SplatFileType mapping:**

```typescript
import { SplatFileType } from '@sparkjsdev/spark';

export function dataTypeToSplatFileType(dataType: string): SplatFileType {
  if (dataType === 'splat_partition_sog' || dataType === 'splat_data_sog') {
    return SplatFileType.PCSOGSZIP;
  }
  return SplatFileType.SPLAT;
}
```

**Hook signature:**

```typescript
export function useRefinementSplat({
  refinementId,
  domainServerUrl,
  domainId,
  accessToken,
  domainDataItems,
}: {
  refinementId: string;
  domainServerUrl: string;
  domainId: string;
  accessToken: string;
  domainDataItems: DomainDataItem[];
})
```

The hook uses `useQuery` from `@tanstack/react-query` with `queryKey: ['refinement-splat', refinementId, domainId]` and progressive cache updates via `queryClient.setQueryData()`.

**Partition name regex:**
```
^splat_partition_(full|coarse|fine)_(\d+)_(-?\d+)_(-?\d+)_{refinementId}$
```
Groups: `[1]` = LOD type, `[2]` = tile size, `[3]` = X coord, `[4]` = Z coord.

**Download endpoint per tile:**
```
GET {domainServerUrl}/api/v1/domains/{domainId}/data/{itemId}?raw=true
Authorization: Bearer {accessToken}
```

See the full source in `hooks/useRefinementSplat.ts` for the complete implementation.

---

### 6.7 useRefinementHasSplat — Lightweight Existence Check

Create `hooks/useRefinementHasSplat.ts`. Provides a pure function `refinementHasSplat()` and a React hook `useRefinementHasSplat()`.

This is a **metadata-only** check — it never downloads binary data. Useful for conditionally showing UI controls (e.g. a "Splat" toggle) before committing to a download.

It checks:
1. Single-file splat names: `refined_splat_{id}`, `splat_{id}`, `gaussian_splat_{id}`
2. Partition names matching the regex pattern above.

```typescript
export function refinementHasSplat(
  domainDataItems: Array<{ name?: string; data_type?: string }>,
  refinementId: string
): boolean { /* ... */ }

export function useRefinementHasSplat(
  domainDataItems: DomainDataItem[],
  refinementId: string | null
): boolean {
  return useMemo(
    () => (refinementId ? refinementHasSplat(domainDataItems, refinementId) : false),
    [domainDataItems, refinementId]
  );
}
```

---

### 6.8 Reveal Animation Shaders

Create `utils/splatShaders.ts`. This file provides GLSL shader code and a `createSplatModifier()` function that attaches a reveal animation to any `SplatMesh`.

**Available effects (integer constants in the shader):**

| Name | ID | Description |
|------|----|-------------|
| Magic | 1 | Radial reveal with noise and glowing border |
| Spread | 2 | Gentle radial emergence with scaling (default) |
| Unroll | 3 | Rotating helix with vertical reveal |
| Twister | 4 | Swirling weather-style reveal with self-rotation |
| Rain | 5 | Falling streaks with self-rotation |

**Key export:**

```typescript
export function createSplatModifier(
  splatMesh: SplatMesh,
  animateT: MutableRefObject<number>,
  effectName: SplatEffect
): void
```

This function:
1. Sets `splatMesh.objectModifier` to a `dyno.dynoBlock` that injects custom GLSL.
2. The GLSL reads a `float t` uniform (bound to `animateT.current`) and an `int effectType`.
3. Each frame tick, the caller increments `animateT.current` and calls `splatMesh.updateGenerator()`.

The shader uses `dyno` from `@sparkjsdev/spark` — the Spark dynamic shader system. The GLSL globals include `hash()`, `noise()`, `rot()`, `twister()`, and `rain()` utility functions.

See the full source in `utils/splatShaders.ts` for the complete GLSL and modifier code.

---

### 6.9 SparkRoot & SparkSplat — R3F Rendering Components

Create `components/3d/spark-r3f.tsx`. This is the core rendering layer.

#### SparkRoot

Must be rendered **exactly once** inside your R3F `<Canvas>`. Initialises the `SparkRenderer`:

```typescript
export function SparkRoot({
  autoUpdate = true,
  sceneVersion = 0
}: SparkRootProps)
```

**Behaviour:**
- Creates a `SparkRenderer` with `maxStdDev: Math.sqrt(5)`, `minPixelRadius: 2`.
- Caps pixel ratio to 1.0 for performance.
- When `autoUpdate` is `false` (recommended), polls `spark.update({ scene })` every 100ms via `useInterval`.
- When `sceneVersion` changes, triggers an immediate `spark.update()` — bump this when new tiles load.

#### SparkSplat

Renders a single `SplatMesh`. Instance multiple times for partitioned splats.

```typescript
export function SparkSplat({
  fileBytes,        // ArrayBuffer — raw splat binary data
  format,           // SplatFileType.SPLAT or SplatFileType.PCSOGSZIP
  partitionSize,    // world-space tile size (for culling calculations)
  maxDistance?,      // max render distance from camera
  fadeDistance?,     // fade-out distance before maxDistance
  downsampleNth?,   // keep every Nth Gaussian when downsampling
  downsampleDistance?, // distance at which downsampling begins
  downsampleSmoothing?, // transition smoothing factor
  revealEffect?,    // SplatEffect name — enables reveal animation
  revealDuration?,  // animation duration in seconds (default: 10)
  ...groupProps     // standard R3F group props (position, rotation, etc.)
}: SparkSplatProps)
```

**Critical implementation details:**

1. **ArrayBuffer cloning:** Always call `fileBytes.slice(0)` before passing to `new SplatMesh()`. The Spark engine transfers the buffer to a Web Worker, detaching the original. React may re-run the effect with the same prop, causing a `DataCloneError` if the buffer is already detached.

2. **Reveal animation:** When `revealEffect` is set:
   - `createSplatModifier()` is called after the `SplatMesh` is created.
   - A `useFrame()` loop increments `animateT.current += delta` and calls `splatMesh.updateGenerator()` every 2nd frame.
   - The animation stops after `revealDuration` seconds.
   - Animation state resets when a new mesh is created.

3. **Distance culling:** A `useInterval` check (every ~80-100ms, randomised) compares camera distance to the tile center. If the edge distance exceeds `maxDistance`, the tile is culled (hidden).

---

### 6.10 RefinementSplat — Composition Layer

Create `components/3d/RefinementSplat.tsx`. This is the top-level component you drop into your scene.

```tsx
export default function RefinementSplat({ refinementId }: { refinementId: string })
```

**What it does:**
1. Reads `domainDataAtom`, `domainDataItemsAtom`, `splatVisibleAtom` from Jotai.
2. Calls `useRefinementSplat()` to fetch data.
3. Respects the `splatVisible` toggle.
4. Renders one of two layouts:

**Partitioned splat:**
```tsx
<SparkRoot autoUpdate={false} sceneVersion={data.partitions.length} />
{data.partitions.map((partition) => (
  <SparkSplat
    fileBytes={partition.loadedData}
    position={[(partitionX + 0.5) * size, 0, (partitionZ - 0.5) * size]}
    rotation={[Math.PI, 0, 0]}
    format={partition.splatFileType}
    partitionSize={partition.partitionSize}
    maxDistance={lodType === 'fine' ? 10 : 100}
    fadeDistance={lodType === 'fine' ? 2 : 1}
    downsampleNth={lodType === 'fine' ? 5 : 10}
    downsampleDistance={lodType === 'fine' ? 6 : 30}
    downsampleSmoothing={lodType === 'fine' ? 0.6 : 0.8}
    revealEffect="Spread"
  />
))}
```

**Single-file splat:**
```tsx
<SparkRoot autoUpdate={false} sceneVersion={0} />
<SparkSplat
  fileBytes={data.buffer}
  format={data.splatFileType}
  rotation={[Math.PI, 0, 0]}
  partitionSize={100}
  maxDistance={20}
  fadeDistance={4}
  revealEffect="Spread"
/>
```

> The `rotation={[Math.PI, 0, 0]}` flips the Y axis to convert from the Spark coordinate system to Three.js convention.

> The default reveal effect is `"Spread"`. Change `DEFAULT_REVEAL_EFFECT` at the top of the file to use a different animation, or make it configurable via props/atoms.

---

### 6.11 Viewer3D — Scene Integration

In your main 3D viewer component, replace the old `<SplatViewer>` usage:

**Before:**
```tsx
import SplatViewer from "./SplatViewer";

// Inside <Canvas>:
{splatData && domainData && (
  <SplatViewer
    domainServerUrl={domainData.domainServerUrl}
    domainId={domainData.domainInfo.id}
    fileId={splatData.fileId}
    accessToken={domainData.domainAccessToken}
    alignmentMatrix={splatData.alignmentMatrix}
  />
)}
```

**After:**
```tsx
import RefinementSplat from "./3d/RefinementSplat";

// Read from atoms:
const refinementId = useAtomValue(refinementIdAtom);
const splatVisible = useAtomValue(splatVisibleAtom);
const domainData = useAtomValue(domainDataAtom);

// Inside <Canvas>:
{splatVisible && refinementId && domainData && (
  <RefinementSplat refinementId={refinementId} />
)}
```

---

### 6.12 Hook Barrel Exports

Update `hooks/index.ts` to export the new hooks:

```typescript
// Splat data hooks
export { useRefinementSplat } from "./useRefinementSplat";
export type { ParsedPartition, RefinementSplatData } from "./useRefinementSplat";
export { useRefinementHasSplat, refinementHasSplat } from "./useRefinementHasSplat";

// Utility hooks
export { default as useInterval } from "./useInterval";
```

Remove the old `useSplatData` export if present.

---

## 7. Data Formats & Naming Conventions

### Single-file splat names

The server names single-file splats as:
```
refined_splat_{refinementId}
splat_{refinementId}
gaussian_splat_{refinementId}
```

With `data_type` values: `splat_data`, `splat_data_sog`, `refined_splat`, `splat`, `gaussian_splat`.

### Partitioned splat names

Partition tiles follow a strict naming pattern:
```
splat_partition_{lodType}_{tileSize}_{gridX}_{gridZ}_{refinementId}
```

Examples:
```
splat_partition_coarse_4_-1_2_abc-def-123
splat_partition_fine_4_0_0_abc-def-123
splat_partition_full_8_1_-3_abc-def-123
```

With `data_type` values: `splat_partition`, `splat_partition_sog`.

### File formats

| `data_type` | Binary format | `SplatFileType` |
|-------------|--------------|-----------------|
| `splat_data`, `splat_partition`, `refined_splat`, `splat`, `gaussian_splat` | Raw `.splat` | `SplatFileType.SPLAT` |
| `splat_data_sog`, `splat_partition_sog` | SOG compressed `.sogs.zip` | `SplatFileType.PCSOGSZIP` |

---

## 8. Partition LOD Selection Logic

When partitions exist for a refinement, the hook applies this LOD selection:

1. Parse all partitions matching the refinement ID.
2. Group by `lodType`: `coarse`, `fine`, `full`.
3. **If `coarse` or `fine` tiles exist** → use `[...coarse, ...fine]` (skip `full`).
4. **Otherwise** → use `full` tiles only.

This means a scene can have coarse tiles for distant viewing and fine tiles for close-up, both rendering simultaneously with different distance/downsample parameters.

---

## 9. API Endpoint Reference

All binary data is downloaded from the domain server:

```
GET {domainServerUrl}/api/v1/domains/{domainId}/data/{dataItemId}?raw=true
```

**Headers:**
```
Authorization: Bearer {accessToken}
User-Agent: domain-viewer
```

**Response:** Raw binary (`ArrayBuffer`).

The `domainServerUrl`, `domainId`, and `accessToken` come from the domain authentication flow (handled by `domainService.authenticateDomain()`). The `dataItemId` comes from matching entries in the `domainDataItems` metadata list.

---

## 10. Known Gotchas & Troubleshooting

### ArrayBuffer detachment (`DataCloneError`)

**Symptom:** `DataCloneError: Failed to execute 'postMessage' on 'Worker': ArrayBuffer at index 0 is already detached.`

**Cause:** `SplatMesh` transfers the provided `ArrayBuffer` to a Web Worker, detaching the original. React Strict Mode (or any re-render) may re-run the effect with the same cached prop.

**Fix:** Always clone the buffer before passing to `SplatMesh`:
```typescript
const mesh = new SplatMesh({
  fileBytes: fileBytes.slice(0),
  editable: false,
  fileType: format,
});
```

The `.slice(0)` is a fast native memcpy (~1-2ms for 10 MB) and only runs once per load.

### SparkRenderer pixel ratio

`SparkRoot` caps `pixelRatio` to 1.0 because higher pixel ratios significantly impact Gaussian splat rendering performance. If your app needs a higher pixel ratio for other scene elements, you may need to manage this more selectively.

### React Query configuration

The `useRefinementSplat` hook uses:
- `staleTime: 10 * 60 * 1000` (10 minutes) — splat data doesn't change frequently.
- `retry: 2` — retries failed downloads twice.
- `enabled` guard — only runs when all required parameters are available.

### Coordinate system

Splats are rendered with `rotation={[Math.PI, 0, 0]}` to flip from the Spark/server coordinate system to Three.js convention. Partitioned tiles are positioned at:
```
x = (partitionX + 0.5) * partitionSize
y = 0
z = (partitionZ - 0.5) * partitionSize
```

### Private npm dependency

The `@sparkjsdev/spark` package points to `github:aukilabs/sparkjs#auki-1`. This requires:
1. SSH access to the `aukilabs/sparkjs` repository.
2. Git configured to use SSH for GitHub: `git config --global url."git@github.com:".insteadOf "https://github.com/"`.
3. Your SSH key added to the agent: `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` (macOS).

If `npm install` fails with `Repository not found`, verify SSH access with: `ssh -T git@github.com`.
