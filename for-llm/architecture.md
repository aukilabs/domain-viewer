# Domain Viewer Architecture

## 3D Viewer Overview

The 3D scene is composed in `components/Viewer3D.tsx` using React Three Fiber.
Core visualization layers are rendered independently so each layer can toggle without forcing unrelated re-renders.

Relevant splat components:

- `components/Viewer3D.tsx`
- `components/3d/RefinementSplat.tsx`
- `components/3d/spark-r3f/SplatMesh.tsx`
- `components/3d/spark-r3f/SparkRenderer.tsx`
- `store/visualizationStore.ts` (`splatVisibleAtom`)

## Splat Visibility And Reveal Invariants

These rules are required for correct behavior. Do not change them without validating the full off/on lifecycle.

1. `RefinementSplat` stays mounted while domain/refinement is active.
   - `Viewer3D` must pass `visible={splatVisible}` into `RefinementSplat`.
   - Do not gate `RefinementSplat` itself behind `splatVisible`, or reveal state gets reset too often.

2. `SplatMesh` receives `visible` explicitly.
   - `RefinementSplat` must pass `visible={visible}` to every `SplatMesh` instance (partitioned and single-file branches).
   - Missing this prop causes toggle state to desync from actual Spark mesh visibility.

3. Native Spark mesh lifecycle is visibility-bound.
   - In `SplatMesh`, when hidden (`visible=false`), dispose and clear the native Spark mesh.
   - On show (`visible=true`), create a fresh native mesh instance.

4. Always create native Spark meshes from copied buffers.
   - Use `fileBytes.slice(0)` before constructing `new sparkModule.SplatMesh(...)`.
   - Spark may transfer/detach `ArrayBuffer`s; reusing the same buffer instance across toggles can break re-enable.

5. Reveal animation runs once per refinement, not per toggle.
   - `RefinementSplat` tracks `revealPlayed` in component state.
   - Reset `revealPlayed` only when `refinementId` changes.
   - Compute `revealEffect` from `skipReveal` reactively; do not freeze `skipReveal` in a ref at first render.

6. Spark scene refresh must react to visibility transitions.
   - In `SparkRenderer`, scene updates on any `sceneVersion` change (`!==`), not only monotonic increments.
   - This ensures hide/show transitions propagate into Spark renderer state.

## Why These Constraints Exist

Spark manages internal GPU-side state and may not behave like ordinary Three.js meshes if buffers are detached or objects are reused incorrectly. The safest pattern for this app is:

- Keep reveal state at `RefinementSplat` level.
- Recreate native Spark mesh objects on re-enable.
- Keep data buffers copy-safe.
- Wire visibility explicitly all the way down to each `SplatMesh`.

## Regression Checklist (Manual)

When changing splat code, verify:

- Toggle Rendering off: splats disappear.
- Toggle Rendering on: splats return.
- Toggle off/on repeatedly: still stable.
- Reveal animation plays only on first load of a refinement.
- Switching to a different refinement triggers reveal once for the new refinement.
