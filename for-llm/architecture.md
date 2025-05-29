## Project Architecture Summary

This project is a Next.js application built with React and TypeScript. It utilizes Tailwind CSS for styling and includes 3D rendering capabilities powered by Three.js and @react-three/fiber, likely for visualizing domains.

### File and Folder Structure:

*   `app/[id]/`: Contains the dynamic route for displaying individual domains (`page.tsx`). This is a central part of the application's functionality.
*   `components/`: Houses reusable React components.
    *   `ui/`: Likely contains generic UI components (potentially integrated from a library like Shadcn UI). Examples from `page.tsx` include `Navbar` and `DomainInfo`.
    *   `viewer3d/`: Contains components specifically for the 3D visualization of domain data (`Viewer3D.tsx`).
*   `hooks/`: Custom React hooks for encapsulating reusable logic.
*   `lib/`: Utility functions, helper classes, and potentially interfaces for interacting with external services.
*   `public/`: Static assets served directly, such as images (`public/images/logo.svg` used in `page.tsx`) and potentially web workers (`public/workers/`).
*   `utils/`: General utility functions.
*   `for-llm/`: Contains files like `architecture.md` generated for LLM interaction.

### Key Technologies:

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **3D Rendering:** Three.js, @react-three/fiber
*   **Data Fetching:** Axios, Next.js Server Actions (`fetchDomainInfo`)
*   **Domain Logic:** `@aukilabs/posemesh-domain` library

### State Management:

Based on the `app/[id]/page.tsx` file, the application primarily uses React's `useState` hook for managing component-specific state. This includes the loaded domain data, the state of various 3D meshes (point cloud, portals, nav mesh, occlusion mesh), loading indicators, and the visibility toggles for different 3D elements. There is no apparent global state management library in use based on the examined files.

### Service Connections and Data Flow:

The application fetches domain data asynchronously within the `useEffect` hook in `app/[id]/page.tsx`. The data fetching process involves:

1.  Initiating a `PosemeshClientApi` instance.
2.  Calling the `fetchDomainInfo` server action, passing the domain ID and a client ID from `PosemeshClientApi`. This action likely handles the initial communication with a backend to get core domain information, access tokens, and server URLs.
3.  Using the obtained `domainServerUrl`, `domainInfo.id`, and `domainAccessToken` to fetch specific domain assets (portals, navigation mesh, occlusion mesh, point cloud) via methods on the `PosemeshClientApi` instance (`fetchDomainPortals`, `fetchDomainData`, `downloadFile`).

This indicates a pattern where initial domain information is potentially fetched via a Next.js server action, and subsequent detailed asset data is fetched directly from a domain server URL using a client-side API utility (`PosemeshClientApi`) and provided access tokens. The `@aukilabs/posemesh-domain` library is likely consumed by the `PosemeshClientApi` or other parts of the application to handle domain-specific data structures and logic.

### Architecture Overview:

The application leverages Next.js for server-side rendering and routing. The `app/[id]` route is central to displaying domain-specific content. React components handle the user interface, with specialized components in `components/viewer3d` for rendering 3D domain data. Data is likely fetched using Axios, possibly through Next.js API routes defined elsewhere in the project. The `@aukilabs/posemesh-domain` library is a key dependency, suggesting specific domain-related logic is integrated into the application.

### Next Steps for a Deeper Understanding:

To provide a more detailed architecture summary, I would need to examine:

*   Code within the `app/[id]/` route to understand data fetching and component composition.
*   Code within `components/viewer3d/` to understand how 3D data is processed and rendered.
*   Any API routes (likely in `app/api/` if following Next.js conventions) to understand data flow.
*   Implementation details within `lib/` and `utils/`.
