## Project Architecture Summary

This project is a Next.js application built with React and TypeScript. It utilizes Tailwind CSS for styling and includes 3D rendering capabilities powered by Three.js and @react-three/fiber, specifically for visualizing domains.

### File and Folder Structure:

*   `app/[id]/`: Contains the dynamic route for displaying individual domains (`page.tsx`). This is a central part of the application's functionality.
*   `components/`: Houses reusable React components.
    *   `ui/`: Contains generic UI components (potentially integrated from a library like Shadcn UI). Examples from `page.tsx` include `Navbar` and `DomainInfo`.
    *   `3d/`: **NEW** - Contains specialized 3D rendering components extracted from the main Viewer3D component:
        *   `PointCloud.tsx`: Handles PLY point cloud rendering with vertex colors
        *   `Portals.tsx`: Renders QR code portal markers using GLTF models
        *   `OcclusionMesh.tsx`: Renders occlusion meshes (physical barriers) from OBJ files
        *   `NavMesh.tsx`: Renders navigation meshes (walkable areas) from OBJ files  
        *   `CameraController.tsx`: Manages camera controls including auto-rotation when idle
    *   `Viewer3D.tsx`: **REFACTORED** - Now acts as an orchestrator component that coordinates all 3D elements, manages scene setup (Canvas, lights, grid), and handles conditional rendering based on visibility flags.
    *   `CustomGrid.tsx`: Renders a custom infinite grid with fading axes lines for 3D scene reference.
*   `hooks/`: Custom React hooks for encapsulating reusable logic.
*   `lib/`: Utility functions, helper classes, and potentially interfaces for interacting with external services.
*   `public/`: Static assets served directly, such as images (`public/images/logo.svg` used in `page.tsx`) and potentially web workers (`public/workers/`).
*   `utils/`: General utility functions including:
    *   `posemeshClientApi.ts`: API client for Posemesh backend communication
    *   `ply-parser.web.ts`: PLY file parser for point cloud data
    *   `three-utils.ts`: Three.js utility functions
*   `for-llm/`: Contains files like `architecture.md`, `knowledge.md`, and `tasks.md` for LLM interaction.

### Key Technologies:

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **3D Rendering:** Three.js, @react-three/fiber, @react-three/drei
*   **Data Fetching:** Axios, Next.js Server Actions (`fetchDomainInfo`)
*   **Domain Logic:** `@aukilabs/posemesh-domain` library

### Component Architecture (3D Visualization):

The 3D visualization system now follows a modular architecture:

**Main Orchestrator:**
*   `Viewer3D.tsx`: Coordinates all 3D components, manages props distribution, handles scene setup

**Specialized 3D Components:**
*   `PointCloud.tsx`: Asynchronously parses PLY data and renders point clouds with materials
*   `Portals.tsx`: Manages GLTF model loading, cloning, and positioning for portal markers
*   `OcclusionMesh.tsx`: Processes OBJ files to create wireframe and solid mesh representations
*   `NavMesh.tsx`: Renders navigation mesh with transparent materials and double-sided rendering
*   `CameraController.tsx`: Implements OrbitControls with idle detection and auto-rotation (5-second timeout)

### State Management:

Based on the `app/[id]/page.tsx` file, the application primarily uses React's `useState` hook for managing component-specific state. This includes the loaded domain data, the state of various 3D meshes (point cloud, portals, nav mesh, occlusion mesh), loading indicators, and the visibility toggles for different 3D elements. There is no apparent global state management library in use based on the examined files.

### Service Connections and Data Flow:

The application fetches domain data asynchronously within the `useEffect` hook in `app/[id]/page.tsx`. The data fetching process involves:

1.  Initiating a `PosemeshClientApi` instance.
2.  Calling the `fetchDomainInfo` server action, passing the domain ID and a client ID from `PosemeshClientApi`. This action likely handles the initial communication with a backend to get core domain information, access tokens, and server URLs.
3.  Using the obtained `domainServerUrl`, `domainInfo.id`, and `domainAccessToken` to fetch specific domain assets (portals, navigation mesh, occlusion mesh, point cloud) via methods on the `PosemeshClientApi` instance (`fetchDomainPortals`, `fetchDomainData`, `downloadFile`).
4.  **Enhanced Error Handling**: JSON parsing now includes comprehensive error handling with detailed logging to identify malformed data or incorrect file types.

This indicates a pattern where initial domain information is potentially fetched via a Next.js server action, and subsequent detailed asset data is fetched directly from a domain server URL using a client-side API utility (`PosemeshClientApi`) and provided access tokens. The `@aukilabs/posemesh-domain` library is likely consumed by the `PosemeshClientApi` or other parts of the application to handle domain-specific data structures and logic.

### Architecture Benefits:

The recent refactoring provides several architectural benefits:

*   **Modularity**: Each 3D component is self-contained with its own props interface
*   **Maintainability**: Easier to modify individual 3D rendering logic without affecting others
*   **Testability**: Each component can be tested in isolation
*   **Reusability**: Components can potentially be reused in other parts of the application
*   **Performance**: Smaller, focused components with optimized import dependencies
*   **Type Safety**: Each component has well-defined TypeScript interfaces

### Architecture Overview:

The application leverages Next.js for server-side rendering and routing. The `app/[id]` route is central to displaying domain-specific content. React components handle the user interface, with specialized components in `components/3d` for rendering 3D domain data in a modular fashion. Data is fetched using Axios, possibly through Next.js API routes defined elsewhere in the project. The `@aukilabs/posemesh-domain` library is a key dependency, suggesting specific domain-related logic is integrated into the application.

### Next Steps for a Deeper Understanding:

To provide a more detailed architecture summary, further examination of:

*   Any API routes (likely in `app/api/` if following Next.js conventions) to understand data flow.
*   Implementation details within `lib/` and `utils/`.
*   The `@aukilabs/posemesh-domain` library integration and usage patterns.
