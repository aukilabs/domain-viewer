**Project: Posemesh 3D Domain Viewer**

**Objective:** A web-based application to visualize 3D spatial domains and associated real-time data from a Posemesh system.

**Core Technologies:**
*   Next.js (React framework)
*   TypeScript
*   Three.js (used in modular 3D components and `three-utils.ts` for 3D rendering)
*   @react-three/fiber and @react-three/drei (React Three.js ecosystem)
*   Tailwind CSS (for styling)

**Key Modules & Functionalities:**

1.  **Application Entry Point (`app/[id]/page.tsx`)**
    *   Handles dynamic loading of domain data based on an ID.
    *   Manages overall application state (loading status, visibility of 3D elements).
    *   Coordinates data fetching and passes data to UI components.
    *   **Enhanced Error Handling**: Now includes comprehensive JSON parsing error handling with detailed logging for malformed data or incorrect file types.

2.  **3D Visualization System (Modular Architecture)**
    
    **Main Orchestrator (`components/Viewer3D.tsx`)**
    *   **REFACTORED**: Now acts as a coordinator component rather than containing all 3D logic.
    *   Manages scene setup (Canvas configuration, lights, background).
    *   Handles conditional rendering based on visibility flags.
    *   Distributes props to specialized 3D components.
    *   Coordinates complex components like `Scan3D` and `DomainDevices3D`.

    **Specialized 3D Components (`components/3d/`)**
    *   `PointCloud.tsx`: 
        *   Handles PLY point cloud rendering with vertex colors.
        *   Uses `plyAsyncParse` from `utils/ply-parser.web.ts`.
        *   Manages Three.js Points material and geometry.
    *   `Portals.tsx`: 
        *   Renders QR code portal markers using GLTF models.
        *   Handles model cloning, positioning, and scaling.
        *   Includes `useGLTF.preload('/QR.glb')` for performance.
    *   `OcclusionMesh.tsx`: 
        *   Renders occlusion meshes (physical barriers) from OBJ files.
        *   Creates both wireframe and solid mesh representations.
        *   Uses OBJLoader for file parsing.
    *   `NavMesh.tsx`: 
        *   Renders navigation meshes (walkable areas) from OBJ files.
        *   Uses transparent materials with double-sided rendering.
        *   Applies green coloring to indicate walkable areas.
    *   `CameraController.tsx`: 
        *   Manages OrbitControls with customizable constraints.
        *   Implements idle detection with auto-rotation (5-second timeout).
        *   Handles user interaction events and animation cleanup.

    **Scene Elements**
    *   `CustomGrid.tsx`: Renders a custom infinite grid with fading axes lines for 3D scene reference.

3.  **API Interaction (`utils/`)**
    *   `posemeshClientApi.ts`:
        *   Handles communication with the Posemesh backend to fetch domain metadata, access tokens, 3D data files (point clouds, meshes, portals), and real-time device data.
        *   Manages authentication (access tokens).
    *   `posemeshServerApi.ts`: (Purpose might be for server-side actions or a different aspect of Posemesh interaction, needs further inspection if critical details are required).
    *   `ply-parser.web.ts`: Utility for parsing PLY (Polygon File Format) point cloud files in the browser.
    *   `three-utils.ts`: Contains helper functions and utilities for Three.js operations (e.g., object creation, transformations, material setup, pose matrix conversions).

4.  **User Interface Components (`components/`)**
    *   `Navbar.tsx`:
        *   Provides top-level navigation.
        *   May include controls for loading domains or accessing application settings.
    *   `DomainInfo.tsx`:
        *   Displays detailed information about the currently loaded 3D domain.
        *   Contains UI elements (using `components/ToggleVisibility.tsx`) to toggle the visibility of different data layers in the `Viewer3D` (e.g., point cloud, portals, nav mesh, occlusion mesh, 3D scans).
    *   `ToggleVisibility.tsx`: A reusable component for creating toggle switches/buttons.
    *   `ui/` (directory): Contains Shadcn/ui components or custom UI primitives.
    *   `theme-provider.tsx`: Manages application theming (e.g., light/dark mode).

5.  **Data Fetching & Management:**
    *   Client-side data fetching initiated in `app/[id]/page.tsx`.
    *   Polling mechanism for real-time updates of device data.
    *   State management using React `useState` and `useEffect` hooks.
    *   **Error Resilience**: JSON parsing errors are caught and logged with detailed information for debugging.

6.  **Configuration & Build:**
    *   Standard Next.js project setup (`next.config.mjs`, `tsconfig.json`).
    *   Tailwind CSS for styling (`tailwind.config.js`, `postcss.config.mjs`).
    *   Docker support (`Dockerfile`, `docker-compose.yml`) for containerization and deployment.

**Overall Workflow:**
1.  User navigates to a URL like `/domain-viewer/<domain_id>`.
2.  The `DomainPage` component (`app/[id]/page.tsx`) mounts and initiates data loading.
3.  It uses `fetchDomainInfo` (an action, possibly server-side) and `PosemeshClientApi` to:
    *   Retrieve basic domain details and access credentials.
    *   Fetch lists of available data items (point clouds, meshes, device pose reports).
    *   Download the actual data files (PLY, OBJ, JSON) with enhanced error handling.
4.  Fetched 3D data (point clouds, meshes) are parsed (e.g., PLY by `ply-parser.web.ts`) and passed to the modular 3D components.
5.  `Viewer3D.tsx` orchestrates the scene by:
    *   Setting up the Three.js Canvas with proper configuration.
    *   Conditionally rendering specialized 3D components based on visibility flags.
    *   Coordinating props distribution to child components.
6.  Each specialized 3D component (`PointCloud`, `Portals`, `OcclusionMesh`, `NavMesh`, `CameraController`) handles its specific rendering logic independently.
7.  Device pose data is fetched and updated periodically, refreshing their visualization in the 3D scene.
8.  `DomainInfo.tsx` displays metadata and allows the user to control the visibility of different elements through `ToggleVisibility` components, which update the state in `DomainPage` and subsequently the modular components in `Viewer3D`.
9.  `Navbar.tsx` provides overall application navigation.

**Architectural Benefits of Recent Refactoring:**
*   **Modularity**: Each 3D component is self-contained with clear responsibilities.
*   **Maintainability**: Individual 3D rendering logic can be modified without affecting other components.
*   **Type Safety**: Each component has well-defined TypeScript interfaces (e.g., `PointCloudProps`, `PortalsProps`).
*   **Performance**: Optimized imports and focused component responsibilities.
*   **Testability**: Components can be tested in isolation.
*   **Debugging**: Enhanced error handling with detailed logging for troubleshooting data issues.
