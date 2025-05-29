**Project: Posemesh 3D Domain Viewer**

**Objective:** A web-based application to visualize 3D spatial domains and associated real-time data from a Posemesh system.

**Core Technologies:**
*   Next.js (React framework)
*   TypeScript
*   Three.js (likely used in `Viewer3D.tsx` and `three-utils.ts` for 3D rendering)
*   Tailwind CSS (for styling)

**Key Modules & Functionalities:**

1.  **Application Entry Point (`app/[id]/page.tsx`)**
    *   Handles dynamic loading of domain data based on an ID.
    *   Manages overall application state (loading status, visibility of 3D elements).
    *   Coordinates data fetching and passes data to UI components.

2.  **3D Visualization (`components/Viewer3D.tsx`)**
    *   The central component for rendering the 3D scene.
    *   Likely utilizes Three.js for:
        *   Displaying point cloud data (`.ply` files, parsed by `utils/ply-parser.web.ts`).
        *   Rendering 3D models for portals, navigation meshes (`.obj` files), and occlusion meshes.
        *   Visualizing real-time device poses.
        *   Implementing camera controls and scene navigation.
    *   May use `components/CustomGrid.tsx` for displaying a reference grid in the 3D scene.

3.  **API Interaction (`utils/`)**
    *   `posemeshClientApi.ts`:
        *   Handles communication with the Posemesh backend to fetch domain metadata, access tokens, 3D data files (point clouds, meshes, portals), and real-time device data.
        *   Manages authentication (access tokens).
    *   `posemeshServerApi.ts`: (Purpose might be for server-side actions or a different aspect of Posemesh interaction, needs further inspection if critical details are required).
    *   `ply-parser.web.ts`: Utility for parsing PLY (Polygon File Format) point cloud files in the browser.
    *   `three-utils.ts`: Likely contains helper functions and utilities for Three.js operations (e.g., object creation, transformations, material setup).

4.  **User Interface Components (`components/`)**
    *   `Navbar.tsx`:
        *   Provides top-level navigation.
        *   May include controls for loading domains or accessing application settings.
    *   `DomainInfo.tsx`:
        *   Displays detailed information about the currently loaded 3D domain.
        *   Contains UI elements (likely using `components/ToggleVisibility.tsx`) to toggle the visibility of different data layers in the `Viewer3D` (e.g., point cloud, portals, nav mesh, occlusion mesh, 3D scans).
    *   `ToggleVisibility.tsx`: A reusable component for creating toggle switches/buttons.
    *   `ui/` (directory): Contains Shadcn/ui components or custom UI primitives.
    *   `theme-provider.tsx`: Manages application theming (e.g., light/dark mode).

5.  **Data Fetching & Management:**
    *   Client-side data fetching initiated in `app/[id]/page.tsx`.
    *   Polling mechanism for real-time updates of device data.
    *   State management using React `useState` and `useEffect` hooks.

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
    *   Download the actual data files (PLY, OBJ, JSON).
4.  Fetched 3D data (point clouds, meshes) are parsed (e.g., PLY by `ply-parser.web.ts`) and passed to `Viewer3D.tsx`.
5.  `Viewer3D.tsx` renders the scene using Three.js.
6.  Device pose data is fetched and updated periodically, refreshing their visualization in the 3D scene.
7.  `DomainInfo.tsx` displays metadata and allows the user to control the visibility of different elements through `ToggleVisibility` components, which update the state in `DomainPage` and subsequently the `Viewer3D`.
8.  `Navbar.tsx` provides overall application navigation.
