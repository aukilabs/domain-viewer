## Refactoring Plan for `Viewer3D.tsx`

**Overall Goal:** Refactor `Viewer3D.tsx` by splitting its internal components (`PointCloud`, `Portals`, `OcclusionMesh`, `NavMesh`, `CameraController`) into separate files within the `components/3d/` directory, making the main `Viewer3D` component an orchestrator.

---

**Task 1: Extract `PointCloud` component and remove unused parser**

*   **Goal:** Move the `PointCloud` component logic to a new file `components/3d/PointCloud.tsx`. Remove the `parseASCIIPLY` function, as `plyAsyncParse` is being used.
*   **Steps:**
    1.  Create a new file: `components/3d/PointCloud.tsx`.
    2.  Move the `PointCloud` component definition from `Viewer3D.tsx` into `components/3d/PointCloud.tsx`.
    3.  Define an interface `PointCloudProps` in `PointCloud.tsx` for the component's props (i.e., `data: ArrayBuffer | null`).
    4.  Ensure all necessary imports (e.g., `React`, `useThree`, `useEffect`, `useRef`, `THREE`, `plyAsyncParse` from ` "@/utils/ply-parser.web"`) are correctly added to `PointCloud.tsx`.
    5.  Export the `PointCloud` component from `PointCloud.tsx`.
    6.  In `Viewer3D.tsx`, remove the `parseASCIIPLY` function definition.
    7.  In `Viewer3D.tsx`, import the `PointCloud` component from `components/3d/PointCloud.tsx` and use it, passing the `pointCloudData` prop.
*   **Finished Criteria:**
    *   `components/3d/PointCloud.tsx` exists and exports the `PointCloud` component.
    *   The `parseASCIIPLY` function is removed from the codebase.
    *   `Viewer3D.tsx` imports and uses the new `PointCloud` component.
    *   The application compiles, and the point cloud visualization functions as before.

---

**Task 2: Extract `Portals` component**

*   **Goal:** Move the `Portals` component logic to a new file `components/3d/Portals.tsx`.
*   **Steps:**
    1.  Create a new file: `components/3d/Portals.tsx`.
    2.  Move the `Portals` component definition from `Viewer3D.tsx` into `components/3d/Portals.tsx`.
    3.  Define an interface `PortalsProps` in `Portals.tsx` for the component's props (i.e., `portals: Portal[] | null | undefined`).
    4.  Ensure all necessary imports (e.g., `React`, `useGLTF`, `useThree`, `useEffect`, `useRef`, `THREE`, `Portal` type from ` "@/utils/posemeshClientApi"`, `matrixFromPose` from ` "@/utils/three-utils"`) are correctly added to `Portals.tsx`.
    5.  Move the `useGLTF.preload('/QR.glb')` call from `Viewer3D.tsx` to `Portals.tsx`.
    6.  Export the `Portals` component from `Portals.tsx`.
    7.  In `Viewer3D.tsx`, import the `Portals` component from `components/3d/Portals.tsx` and use it, passing the `portals` prop.
*   **Finished Criteria:**
    *   `components/3d/Portals.tsx` exists and exports the `Portals` component.
    *   `useGLTF.preload('/QR.glb')` is located in `Portals.tsx`.
    *   `Viewer3D.tsx` imports and uses the new `Portals` component.
    *   The application compiles, and the portals visualization functions as before.

---

**Task 3: Extract `OcclusionMesh` component**

*   **Goal:** Move the `OcclusionMesh` component logic to a new file `components/3d/OcclusionMesh.tsx`.
*   **Steps:**
    1.  Create a new file: `components/3d/OcclusionMesh.tsx`.
    2.  Move the `OcclusionMesh` component definition from `Viewer3D.tsx` into `components/3d/OcclusionMesh.tsx`.
    3.  Define an interface `OcclusionMeshProps` in `OcclusionMesh.tsx` for the component's props (i.e., `occlusionMeshData: ArrayBuffer | null`).
    4.  Ensure all necessary imports (e.g., `React`, `useThree`, `useEffect`, `useRef`, `THREE`, `OBJLoader` from `'three/examples/jsm/loaders/OBJLoader.js'`) are correctly added to `OcclusionMesh.tsx`.
    5.  Export the `OcclusionMesh` component from `OcclusionMesh.tsx`.
    6.  In `Viewer3D.tsx`, import the `OcclusionMesh` component from `components/3d/OcclusionMesh.tsx` and use it, passing the `occlusionMeshData` prop.
*   **Finished Criteria:**
    *   `components/3d/OcclusionMesh.tsx` exists and exports the `OcclusionMesh` component.
    *   `Viewer3D.tsx` imports and uses the new `OcclusionMesh` component.
    *   The application compiles, and the occlusion mesh visualization functions as before.

---

**Task 4: Extract `NavMesh` component**

*   **Goal:** Move the `NavMesh` component logic to a new file `components/3d/NavMesh.tsx`.
*   **Steps:**
    1.  Create a new file: `components/3d/NavMesh.tsx`.
    2.  Move the `NavMesh` component definition from `Viewer3D.tsx` into `components/3d/NavMesh.tsx`.
    3.  Define an interface `NavMeshProps` in `NavMesh.tsx` for the component's props (i.e., `navMeshData: ArrayBuffer | null`).
    4.  Ensure all necessary imports (e.g., `React`, `useThree`, `useEffect`, `useRef`, `THREE`, `OBJLoader` from `'three/examples/jsm/loaders/OBJLoader.js'`) are correctly added to `NavMesh.tsx`.
    5.  Export the `NavMesh` component from `NavMesh.tsx`.
    6.  In `Viewer3D.tsx`, import the `NavMesh` component from `components/3d/NavMesh.tsx` and use it, passing the `navMeshData` prop.
*   **Finished Criteria:**
    *   `components/3d/NavMesh.tsx` exists and exports the `NavMesh` component.
    *   `Viewer3D.tsx` imports and uses the new `NavMesh` component.
    *   The application compiles, and the navigation mesh visualization functions as before.

---

**Task 5: Extract `CameraController` component**

*   **Goal:** Move the `CameraController` component logic to a new file `components/3d/CameraController.tsx`.
*   **Steps:**
    1.  Create a new file: `components/3d/CameraController.tsx`.
    2.  Move the `CameraController` component definition from `Viewer3D.tsx` into `components/3d/CameraController.tsx`.
    3.  Define an interface `CameraControllerProps` in `CameraController.tsx` for the component's props (i.e., `pointCloudData: ArrayBuffer | null`).
    4.  Ensure all necessary imports (e.g., `React`, `useThree`, `useFrame`, `useRef`, `useState`, `useEffect`, `OrbitControls` from `@react-three/drei`, `OrbitControlsImpl` type from `three-stdlib`) are correctly added to `CameraController.tsx`.
    5.  Export the `CameraController` component from `CameraController.tsx`.
    6.  In `Viewer3D.tsx`, import the `CameraController` component from `components/3d/CameraController.tsx` and use it, passing the `pointCloudData` prop.
*   **Finished Criteria:**
    *   `components/3d/CameraController.tsx` exists and exports the `CameraController` component.
    *   `Viewer3D.tsx` imports and uses the new `CameraController` component.
    *   The application compiles, and the camera controls (including auto-rotation logic) function as before.

---

**Task 6: Refactor `Viewer3D.tsx` to use new components**

*   **Goal:** Clean up `Viewer3D.tsx` so it acts as an orchestrator, using the newly extracted components.
*   **Steps:**
    1.  Remove the definitions of `PointCloud`, `Portals`, `OcclusionMesh`, `NavMesh`, and `CameraController` from `Viewer3D.tsx`.
    2.  Ensure the `Viewer3DProps` interface remains correctly defined in `Viewer3D.tsx` to accept all necessary data and visibility flags.
    3.  Ensure the `Portal` type is imported in `Viewer3D.tsx` if it's used in `Viewer3DProps` (it currently is, from ` "@/utils/posemeshClientApi"`).
    4.  Verify that `Viewer3D.tsx` correctly passes props to the new child components and uses the visibility props (e.g., `pointCloudVisible`, `portalsVisible`) to conditionally render them.
*   **Finished Criteria:**
    *   `Viewer3D.tsx` is significantly smaller, containing only the main `Viewer3D` component structure, imports for the extracted components, the `Viewer3DProps` interface, and scene setup (Canvas, lights, grid).
    *   The application compiles and all 3D visualizations, controls, and conditional rendering based on visibility props function exactly as before the refactor.
