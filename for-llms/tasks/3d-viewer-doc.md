`## 3D Object Rendering Styles

The viewer renders various domain objects like NavMeshes, Occlusion Boxes, and Restricted Areas. Each has specific styling to distinguish them in the 3D space.

### 1. NavMesh (Navigation Mesh)

NavMeshes represent walkable areas and are rendered as flat transparent quads.

- **Component:** `components/3d/SimpleQuad.tsx`
- **Color:** `#96B0D0` (Light Blue)
- **Selected Color:** `#60a5fa` (Blue)
- **Opacity:** 0.8
- **Hover Effect:** White edges (`linewidth: 1`)

```tsx:components/3d/SimpleQuad.tsx
<meshStandardMaterial
  depthWrite={false}
  attach="material"
  opacity={0.8}
  transparent
  color={isSelected ? "#60a5fa" : (materialColor ?? "#96B0D0")}
/>
```

### 2. Occlusion Boxes

Occlusion boxes represent physical obstacles and are rendered as 3D volumes.

- **Component:** `components/3d/SimpleOcclusionBox.tsx`
- **Color:** `#0DFF00` (Bright Green)
- **Selected Color:** `#60a5fa` (Blue)
- **Opacity:** 0.8
- **Edges:** Permanent dark green edges (`#1a2e05`)
- **Hover Effect:** White outlines (`thickness: 0.3`)

```tsx:components/3d/SimpleOcclusionBox.tsx
<meshStandardMaterial
  attach="material"
  opacity={0.8}
  depthTest={true}
  depthWrite={false}
  transparent
  side={showBackfaces ? DoubleSide : FrontSide}
  color={isSelected ? "#60a5fa" : "#0DFF00"}
/>
// ...
<Edges color="#1a2e05" ... />
```

### 3. Restricted Areas

Restricted areas reuse the `SimpleQuad` component but override the color to indicate danger/restriction.

- **Component:** `compositions/3d/DomainSyncedRestrictedArea.tsx`
- **Color:** `#EF4444` (Red)
- **Opacity:** 0.8 (Inherited)

```tsx:compositions/3d/DomainSyncedRestrictedArea.tsx
<SimpleQuad key={mesh.name} model={mesh} materialColor="#EF4444" />
```

## 3D Canvas Implementation

The 3D scene is rendered using `@react-three/fiber`. There are two main implementations depending on the platform/context:

1.  **Native/General (`components/Canvas.tsx`):**
    -   Uses `frameloop="demand"` for performance.
    -   Includes `OrbitControls`.
    -   Sets basic lighting (ambient + directional).

2.  **Web (`components/Canvas.web.tsx`):**
    -   Uses `frameloop="always"`.
    -   Supports complex interaction modes (`FPSControls`, `PersistedMapControls`).
    -   Handles object selection and raycasting events.

### Key Components

-   **`CameraSetup`**: Positions the camera and updates the projection matrix.
-   **`OriginLines`**: Renders the world origin axes.
-   **`FloorGrid`**: Renders the infinite grid reference.
-   **`PersistedMapControls`**: Custom controls for navigating the map/scene.

## Color Constants

The core colors for the application are defined in `constants/Colors.ts`.

```ts:constants/Colors.ts
export const Colors = {
  light: {
    text: "#171717",
    background: "#fff",
    tint: "#2563eb",
    // ...
  },
  dark: {
    text: "#ECEDEE",
    background: "#171717",
    tint: "#2563eb",
    // ...
  },
};
```
`