# Domain Viewer — Architecture

**auki-domain-viewer** is a web-based 3D viewer for Auki Posemesh spatial domains. It loads reconstructed 3D data (point clouds, Gaussian splats, navigation meshes, occlusion meshes, portal markers) from the Posemesh backend and renders them in an interactive scene. It can run standalone or be embedded via iframe (Twitter cards, Slack unfurls, etc.).

For the backend architecture that feeds this app, see [real-world-web/architecture.md](./real-world-web/architecture.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, standalone output) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 3, Radix UI primitives |
| 3D Engine | Three.js 0.182 via @react-three/fiber 9 + @react-three/drei 10 |
| Gaussian Splatting | @sparkjsdev/spark (aukilabs fork) |
| State | Jotai 2 (atomic) |
| Data Fetching | TanStack React Query 5 |
| Theming | next-themes (dark mode, CSS variables) |
| Analytics | Amplitude |

---

## Directory Structure

```
domain-viewer/
├── app/                          # Next.js App Router pages & server actions
│   ├── layout.tsx                # Root layout: Providers, Inter font, OG metadata
│   ├── globals.css               # Tailwind directives + CSS variable tokens
│   ├── page.tsx                  # Home — empty viewer with Navbar (enter domain ID)
│   ├── actions.ts                # Server action: fetchDomainInfo (authenticates via env secrets)
│   └── [id]/
│       ├── page.tsx              # SSR page — fetches domain metadata for OG tags
│       ├── ClientPage.tsx        # Client boundary: DomainLoader + DomainLayout
│       └── preview/page.tsx      # Embeddable preview (hideUI=true)
│
├── components/
│   ├── 3d/                       # All Three.js / R3F components
│   │   ├── Scene.tsx             # Lights, FloorGrid, OriginLines
│   │   ├── RefinementSplat.tsx   # Loads and renders Gaussian splats
│   │   ├── FloorGrid.tsx
│   │   ├── OriginLines.tsx
│   │   ├── controllers/
│   │   │   └── CameraController.tsx   # Switches between map and FPS cameras
│   │   ├── renderers/
│   │   │   ├── PointCloudRenderer.tsx      # PLY → Three.js Points
│   │   │   ├── PortalRenderer.tsx          # Lighthouse marker geometry
│   │   │   ├── NavMeshRenderer.tsx         # OBJ → wireframe mesh
│   │   │   └── OcclusionMeshRenderer.tsx   # OBJ → translucent mesh
│   │   └── spark-r3f/
│   │       ├── SparkRenderer.tsx   # R3F integration for SparkJS renderer
│   │       ├── SplatMesh.tsx       # R3F wrapper for SparkJS SplatMesh
│   │       └── useSparkModule.ts   # Lazy-loads the SparkJS module
│   │
│   ├── domain/
│   │   ├── DomainLoader.tsx      # Orchestrates data fetching → sets Jotai atoms
│   │   ├── DomainLayout.tsx      # Viewer3D + overlay controls + loading state
│   │   └── DomainControls.tsx    # Navbar + DomainInfo panel
│   │
│   ├── ui/                       # Shared UI primitives (Button, Input, Card, etc.)
│   ├── Viewer3D.tsx              # Main R3F <Canvas>, mounts all renderers
│   ├── Navbar.tsx                # Domain ID input + navigation
│   ├── DomainInfo.tsx            # Domain metadata panel
│   ├── FPSControls.tsx           # WASD + mouselook (pointer lock)
│   ├── PersistedMapControls.tsx  # Orbit controls with pose persistence
│   ├── ToggleVisibility.tsx      # Layer visibility checkboxes
│   ├── DownloadSplatButton.tsx   # Splat file download action
│   ├── Providers.tsx             # QueryClient + Theme + Analytics providers
│   ├── theme-provider.tsx
│   └── AnalyticsProvider.tsx
│
├── hooks/
│   ├── useDomainData.ts          # React Query wrapper for DomainService.loadAllDomainData
│   ├── useRefinementSplat.ts     # Discovers & downloads partitioned/single splats
│   ├── useRefinementHasSplat.ts  # Boolean check: does a refinement have splat data?
│   ├── useDomainFile.ts          # Generic file download with auth
│   ├── useFileDownload.ts        # Browser-side file save
│   ├── usePlyParser.ts           # Web-worker PLY parsing
│   ├── useAnalytics.ts
│   ├── useInterval.ts
│   ├── useDebounce.ts
│   ├── useColorScheme.ts
│   └── use-mobile.tsx
│
├── store/                        # Jotai atom definitions
│   ├── domainStore.ts            # Domain data, loading/error states, UI flags
│   ├── camera-store.ts           # Camera pose + control mode (map | fps)
│   └── visualizationStore.ts     # Per-layer visibility toggles
│
├── services/
│   ├── domainService.ts          # Orchestrates auth → portals → data list → downloads
│   ├── fileService.ts            # Low-level file download (DS API, retry)
│   └── errors.ts                 # Typed errors: AuthenticationError, ParseError, etc.
│
├── utils/
│   ├── posemeshServerApi.ts      # Server-side: auth with APP_KEY/APP_SECRET → DDS token
│   ├── posemeshClientApi.ts      # Client-side API helpers (legacy)
│   ├── ply-parser.web.ts         # PLY binary parser
│   ├── splatShaders.ts           # Custom GLSL for splat reveal effects
│   ├── splat-storage.ts          # Splat caching utilities
│   ├── three-utils.ts            # Three.js helper functions
│   ├── validation.ts             # Domain ID validation
│   └── retry.ts                  # Exponential backoff wrapper
│
├── lib/
│   ├── posemeshClient.ts         # Client ID persistence (localStorage + cookies)
│   ├── analytics.ts              # Amplitude init + event helpers
│   └── utils.ts                  # cn() tailwind merge helper
│
├── types/
│   ├── domain.ts                 # DomainData, Portal, DomainDataItem, etc.
│   └── splat.ts                  # Splat-related type definitions
│
├── styles/
│   └── theme.ts                  # Theme constant tokens
│
└── public/
    └── workers/
        └── parse-ply-worker.js   # Web Worker for off-thread PLY parsing
```

---

## Data Flow

```
User enters domain ID in Navbar
        │
        ▼
router.push(`/${domainId}`)
        │
        ▼
app/[id]/page.tsx (SSR)
  └─ fetchDomainInfo server action → OG metadata for social embeds
        │
        ▼
ClientPage.tsx (client boundary)
  ├─ DomainLoader  ──────────────────────────────────────────┐
  │   useDomainData(domainId)                                │
  │     └─ DomainService.loadAllDomainData()                 │
  │          1. authenticateDomain  (server action → DDS)    │
  │          2. fetchDomainPortals  (DS /lighthouses)        │
  │          3. fetchDomainDataList (DS /data)               │
  │          4. fetchDomainMetadata (DS /data/{id})          │
  │          5. Promise.all:                                 │
  │             • fetchNavMesh                               │
  │             • fetchOcclusionMesh                         │
  │             • fetchPointCloud                            │
  │             • fetchSplatData                             │
  │     Sets Jotai atoms ──────────────────────────┐        │
  │                                                │        │
  └─ DomainLayout                                  ▼        │
       └─ Viewer3D (<Canvas>)            ┌── Jotai Store ───┘
            ├─ Scene (lights, grid)      │  domainStore
            ├─ PointCloudRenderer ◄──────┤  camera-store
            ├─ PortalRenderer ◄──────────┤  visualizationStore
            ├─ NavMeshRenderer ◄─────────┤
            ├─ OcclusionMeshRenderer ◄───┤
            ├─ RefinementSplat ◄─────────┘
            │    └─ useRefinementSplat
            │         └─ SparkRenderer + SplatMesh
            └─ CameraController
                 ├─ PersistedMapControls (orbit)
                 └─ FPSControls (WASD + mouselook)
```

---

## State Management (Jotai)

Three atom stores, each with a single responsibility:

| Store | Atoms | Purpose |
|-------|-------|---------|
| `domainStore` | `domainDataAtom`, `pointCloudDataAtom`, `portalsAtom`, `navMeshDataAtom`, `occlusionMeshDataAtom`, `splatDataAtom`, `refinementIdAtom`, `domainDataItemsAtom`, `alignmentMatrixAtom`, `isLoadingAtom`, `splatLoadingAtom`, `loadingErrorAtom`, `isInIframeAtom` + derived (`hasSplatDataAtom`, `isDataLoadedAtom`, `domainInfoAtom`, etc.) | All domain data and loading state |
| `camera-store` | `cameraPoseAtom`, `cameraControlModeAtom` | Camera position/rotation/mode |
| `visualizationStore` | `portalsVisibleAtom`, `navMeshVisibleAtom`, `occlusionVisibleAtom`, `pointCloudVisibleAtom`, `splatVisibleAtom` + derived (`allVisibleAtom`, `anyVisibleAtom`) | Per-layer visibility toggles |

Each renderer reads only its own visibility atom, so toggling one layer does not cause other renderers to re-render.

---

## 3D Rendering Architecture

**Canvas**: `@react-three/fiber` `<Canvas>` in `Viewer3D.tsx` (dynamically imported with `ssr: false`).

**Layers**:

| Layer | Source format | Parser | Three.js object |
|-------|--------------|--------|-----------------|
| Point cloud | PLY (binary) | `ply-parser.web.ts` + Web Worker | `Points` + `PointsMaterial` |
| Portals | JSON (lighthouse poses) | Native | Custom marker meshes |
| Navigation mesh | OBJ | Three.js OBJLoader | Wireframe `Mesh` |
| Occlusion mesh | OBJ | Three.js OBJLoader | Translucent `Mesh` |
| Gaussian splat | `.splat` / `.spz` (single or partitioned) | SparkJS | `SparkRenderer` + `SplatMesh` |

**Camera modes**:
- **Map** (default): `PersistedMapControls` — orbit around target, zoom, pan. Pose persisted to Jotai atom.
- **FPS**: `FPSControls` — WASD movement + mouselook with pointer lock. Toggle with `F` key.

**Splat rendering**:
- Supports both single-file and partitioned splats (LOD partitions: full/coarse/fine).
- `useRefinementSplat` discovers partition files from `domainDataItemsAtom` and loads them.
- Custom GLSL shaders in `splatShaders.ts` for reveal/fade effects.
- Splat components fully unmount when hidden (avoids GPU buffer detachment).

---

## API Integration

### Server-side (Next.js server actions)

`app/actions.ts` → `fetchDomainInfo`:
1. Authenticates with `AUKI_API_SERVER` using `AUKI_APP_KEY` + `AUKI_APP_SECRET` → app JWT
2. Gets domain access token from `AUKI_DDS_SERVER`
3. Returns domain info + server URL + access token to the client

### Client-side

`DomainService` uses the server-returned access token to call Domain Service (DS) endpoints directly:

| Endpoint | Data |
|----------|------|
| `GET /api/v1/domains/{id}/lighthouses` | Portal/lighthouse poses |
| `GET /api/v1/domains/{id}/data` | List of available data items |
| `GET /api/v1/domains/{id}/data/{fileId}` | Individual file download (PLY, OBJ, splat, metadata JSON) |

All requests include `Authorization: Bearer <domainAccessToken>` and a `posemesh-client-id` header. Failed requests use `retryWithBackoff` (exponential backoff).

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `AUKI_APP_KEY` | Posemesh app key (server-side) |
| `AUKI_APP_SECRET` | Posemesh app secret (server-side) |
| `AUKI_API_SERVER` | API server URL for authentication |
| `AUKI_DDS_SERVER` | DDS server URL for domain tokens |
| `NEXT_PUBLIC_AMPLITUDE_KEY` | Amplitude analytics key |

---

## Build & Deployment

- `next build` → standalone output (`output: 'standalone'` in `next.config.mjs`)
- Webpack configured to disable `new URL()` syntax parsing (required for SparkJS compatibility)
- CSP headers allow iframe embedding: `frame-ancestors *`, `X-Frame-Options: ALLOWALL`
- Images unoptimized (static export compatible)

---

## Key Patterns

1. **SSR boundary**: `Viewer3D` and `RefinementSplat` are loaded via `next/dynamic` with `ssr: false` to avoid Three.js/WebGL APIs on the server.
2. **Atomic state isolation**: Each 3D renderer reads only the atoms it needs, minimizing re-renders.
3. **Service layer**: `DomainService` and `FileService` encapsulate all API logic, with typed errors (`AuthenticationError`, `ParseError`, `NetworkError`).
4. **Embed mode**: `isInIframeAtom` detects iframe context and hides UI controls. Preview route (`/[id]/preview`) forces `hideUI=true`.
5. **Client ID persistence**: `getOrCreatePosemeshClientId()` stores a stable client ID across `localStorage`, `sessionStorage`, and cookies.
6. **Path alias**: `@/*` maps to project root for clean imports.
7. **Dark theme**: CSS variable tokens (`--background`, `--foreground`, etc.) controlled by `next-themes`.
