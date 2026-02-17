# Gaussian Splat Viewer Integration - Implementation Plan

## 📊 Data Structure Investigation

### Current Domain Data API Structure

Based on the existing codebase analysis:

```typescript
// API Endpoint: GET /api/v1/domains/${domainId}/data
// Returns: Array of domain data items

interface DomainDataItem {
  id: string;              // Unique file identifier for downloading
  name: string;            // Descriptive name (e.g., "navmesh_v1", "refined_pointcloud_${refinementId}")
  data_type: string;       // Type identifier (e.g., "obj", "refined_pointcloud_ply")
  // ... other metadata
}
```

### Existing Data Types

| Data Type | Name Pattern | File Format | Current Usage |
|-----------|-------------|-------------|---------------|
| `obj` | `navmesh_v1` | OBJ | Navigation mesh rendering |
| `obj` | `occlusionmesh_v1` | OBJ | Occlusion mesh rendering |
| `refined_pointcloud_ply` | `refined_pointcloud_${refinementId}` | PLY | Point cloud rendering |
| `domain_metadata` | `domain_metadata` | JSON | Metadata with alignment matrix |

### Expected Splat Data Structure

**Hypothesis 1: Splat as Refinement Type** (Most Likely)
```typescript
// In domain_metadata:
{
  "canonicalRefinement": "abc123",
  "canonicalRefinementType": "gaussian_splat", // NEW field?
  "canonicalRefinementAlignmentMatrix": [...],  // Existing
  "canonicalGaussianSplat": "abc123"            // NEW field alternative?
}

// In domain data array:
{
  "id": "file_id_123",
  "name": "gaussian_splat_abc123",
  "data_type": "gaussian_splat" // or "splat" or "gaussian_splat_v1"
}
```

**Hypothesis 2: Separate Splat Field** (Alternative)
```typescript
// In domain_metadata:
{
  "canonicalRefinement": "abc123",               // PLY refinement
  "canonicalRefinementAlignmentMatrix": [...],
  "canonicalSplat": "def456",                    // NEW: separate splat ID
  "canonicalSplatAlignmentMatrix": [...]         // NEW: or reuse same matrix
}

// In domain data array:
{
  "id": "file_id_456",
  "name": "splat_def456",
  "data_type": "splat"
}
```

**Action Required:** Confirm with backend team or test with sample domain data.

---

## 🎯 Implementation Plan

### Phase 1: Project Setup & Dependencies
**Estimated Time:** 30 minutes

#### 1.1 Install Dependencies
```bash
npm install @tanstack/react-query
```

#### 1.2 Add React Query Provider
**File:** `app/layout.tsx`

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

**Changes:**
- Import `QueryClient` and `QueryClientProvider`
- Wrap existing content with `QueryClientProvider`
- Configure reasonable defaults for caching

---

### Phase 2: Core Splat Renderer
**Estimated Time:** 2 hours

#### 2.1 Create CustomSplat Component
**File:** `components/CustomSplat.web.tsx`

**Content:** Copy the complete implementation from `for-llms/tasks/splat-viewer.md` lines 83-651

**Key Features:**
- WebGL2 shader material for splat rendering
- Web Worker for depth sorting (embedded as string)
- `parseSplatData()` function to convert binary to GPU textures
- `CustomSplat` component with props for alignment, position, rotation, scale

**Integration Points:**
- Uses `useThree()` from R3F to access GL context and camera
- Uses `useFrame()` for per-frame sorting updates
- Returns standard R3F mesh/group components

---

### Phase 3: Data Fetching Layer
**Estimated Time:** 1 hour

#### 3.1 Create Splat Data Hook
**File:** `hooks/useSplatData.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface UseSplatDataParams {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  enabled?: boolean;
}

/**
 * React Query hook for loading gaussian splat data.
 * Automatically caches results and provides loading/error states.
 */
export function useSplatData({
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  enabled = true,
}: UseSplatDataParams) {
  return useQuery({
    queryKey: ["splat-data", domainId, fileId],
    queryFn: async () => {
      console.log("[useSplatData] Fetching splat data:", {
        domainId,
        fileId,
      });

      const response = await fetch(
        `${domainServerUrl}/api/v1/domains/${domainId}/data/${fileId}?raw=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "domain-viewer",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch splat: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      console.log("[useSplatData] Splat data loaded:", {
        size: arrayBuffer.byteLength,
        sizeKB: (arrayBuffer.byteLength / 1024).toFixed(2),
        sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      });

      return arrayBuffer;
    },
    enabled: Boolean(enabled && domainServerUrl && domainId && fileId && accessToken),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}
```

**Features:**
- React Query integration for automatic caching
- Conditional fetching with `enabled` flag
- Proper error handling
- Size logging for debugging

---

### Phase 4: Composition Component
**Estimated Time:** 45 minutes

#### 4.1 Create SplatViewer Component
**File:** `components/SplatViewer.tsx`

```typescript
import { CustomSplat } from "./CustomSplat.web";
import { useSplatData } from "@/hooks/useSplatData";
import * as THREE from "three";

interface SplatViewerProps {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  alignmentMatrix?: number[] | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * High-level Gaussian Splat viewer component.
 * Handles data fetching, loading states, and rendering.
 */
export default function SplatViewer({
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  alignmentMatrix,
  ...splatProps
}: SplatViewerProps) {
  const { data, isLoading, error } = useSplatData({
    domainServerUrl,
    domainId,
    fileId,
    accessToken,
    enabled: Boolean(fileId),
  });

  if (error) {
    console.error("[SplatViewer] Error loading splat:", error);
    return null; // Silent failure - splat is optional
  }

  if (isLoading || !data) {
    return null; // Could add a loading indicator here if desired
  }

  // Convert alignment matrix if provided
  const alignment = alignmentMatrix
    ? new THREE.Matrix4().fromArray(alignmentMatrix)
    : undefined;

  return <CustomSplat data={data} alignment={alignment} {...splatProps} />;
}
```

**Features:**
- Wraps CustomSplat with data fetching logic
- Silent error handling (splat is optional)
- Alignment matrix conversion
- Clean props interface

---

### Phase 5: Data Layer Integration
**Estimated Time:** 1 hour

#### 5.1 Update ClientPage State
**File:** `app/[id]/ClientPage.tsx`

**Add state variables:**
```typescript
const [splatData, setSplatData] = useState<{
  fileId: string;
  alignmentMatrix: number[] | null;
} | null>(null);
const [splatVisible, setSplatVisible] = useState(true);
```

#### 5.2 Add Splat Data Fetching
**File:** `app/[id]/ClientPage.tsx`

**In `loadAllDomainData()` function, after loading point cloud:**

```typescript
// Load gaussian splat (if available)
const domainMetadataItem = domainData.find(
  (item: any) => item.name === "domain_metadata"
);

if (domainMetadataItem) {
  const domainMetadata = await clientApi.downloadFile(
    data.domainServerUrl,
    data.domainInfo.id,
    domainMetadataItem.id,
    data.domainAccessToken
  );

  const metadata = JSON.parse(new TextDecoder().decode(domainMetadata));
  console.log("metadata", metadata);

  // Existing point cloud logic...
  setAlignmentMatrix(metadata.canonicalRefinementAlignmentMatrix);

  // NEW: Load gaussian splat if available
  // Option 1: Check for canonicalGaussianSplat field
  if (metadata.canonicalGaussianSplat) {
    const splatItem = domainData.find(
      (item: any) =>
        item.data_type === "gaussian_splat" &&
        item.name === `gaussian_splat_${metadata.canonicalGaussianSplat}`
    );
    if (splatItem) {
      console.log("[loadAllDomainData] Found gaussian splat:", splatItem);
      setSplatData({
        fileId: splatItem.id,
        alignmentMatrix: metadata.canonicalRefinementAlignmentMatrix || null,
      });
    }
  }

  // Option 2: Fallback - search for any splat file
  if (!splatItem) {
    const anySplatItem = domainData.find(
      (item: any) =>
        item.data_type === "gaussian_splat" ||
        item.data_type === "splat" ||
        item.name.includes("splat")
    );
    if (anySplatItem) {
      console.log("[loadAllDomainData] Found splat (fallback search):", anySplatItem);
      setSplatData({
        fileId: anySplatItem.id,
        alignmentMatrix: metadata.canonicalRefinementAlignmentMatrix || null,
      });
    } else {
      console.log("[loadAllDomainData] No gaussian splat data found for this domain");
    }
  }
}
```

**Note:** The exact field names and data_type values may need adjustment based on actual API response.

#### 5.3 Pass Splat Data to Viewer3D
**File:** `app/[id]/ClientPage.tsx`

Update `Viewer3D` props:

```typescript
<Viewer3D
  pointCloudData={pointCloudData}
  portals={portals}
  occlusionMeshData={occlusionMeshData}
  navMeshData={navMeshData}
  portalsVisible={portalsVisible}
  navMeshVisible={navMeshVisible}
  occlusionVisible={occlusionVisible}
  pointCloudVisible={pointCloudVisible}
  alignmentMatrix={alignmentMatrix}
  isEmbed={isInIframe}
  // NEW PROPS:
  splatData={splatData}
  splatVisible={splatVisible}
  domainData={domainData} // Pass full domain data for SplatViewer
/>
```

Update `DomainInfo` props:

```typescript
<DomainInfo
  domainInfo={domainData.domainInfo}
  onTogglePortals={() => setPortalsVisible(!portalsVisible)}
  portalsVisible={portalsVisible}
  onToggleNavMesh={() => setNavMeshVisible(!navMeshVisible)}
  navMeshVisible={navMeshVisible}
  onToggleOcclusion={() => setOcclusionVisible(!occlusionVisible)}
  occlusionVisible={occlusionVisible}
  onTogglePointCloud={() => setPointCloudVisible(!pointCloudVisible)}
  pointCloudVisible={pointCloudVisible}
  // NEW PROPS:
  onToggleSplat={() => setSplatVisible(!splatVisible)}
  splatVisible={splatVisible}
  hasSplat={!!splatData}
/>
```

---

### Phase 6: 3D Viewer Integration
**Estimated Time:** 30 minutes

#### 6.1 Update Viewer3D Component
**File:** `components/Viewer3D.tsx`

**Update interface:**
```typescript
interface Viewer3DProps {
  pointCloudData: ArrayBuffer | null;
  portals?: Portal[] | null;
  occlusionMeshData: ArrayBuffer | null;
  navMeshData: ArrayBuffer | null;
  portalsVisible?: boolean;
  navMeshVisible?: boolean;
  occlusionVisible?: boolean;
  pointCloudVisible?: boolean;
  alignmentMatrix?: number[] | null;
  // NEW:
  splatData?: { fileId: string; alignmentMatrix: number[] | null } | null;
  splatVisible?: boolean;
  domainData?: DomainData | null; // For passing auth info to SplatViewer
}
```

**Add import:**
```typescript
import SplatViewer from "./SplatViewer";
```

**Add to render (after PointCloud):**
```typescript
{splatVisible && splatData && domainData && (
  <SplatViewer
    domainServerUrl={domainData.domainServerUrl}
    domainId={domainData.domainInfo.id}
    fileId={splatData.fileId}
    accessToken={domainData.domainAccessToken}
    alignmentMatrix={splatData.alignmentMatrix}
  />
)}
```

**Considerations:**
- Splat and point cloud can both be visible simultaneously
- Later enhancement: Add view mode switcher (point cloud XOR splat)

---

### Phase 7: UI Controls
**Estimated Time:** 30 minutes

#### 7.1 Update DomainInfo Component
**File:** `components/DomainInfo.tsx`

**Update interface:**
```typescript
interface DomainInfoProps {
  domainInfo: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    url: string;
  };
  onTogglePortals: () => void;
  portalsVisible: boolean;
  onToggleNavMesh: () => void;
  navMeshVisible: boolean;
  onToggleOcclusion: () => void;
  occlusionVisible: boolean;
  onTogglePointCloud: () => void;
  pointCloudVisible: boolean;
  // NEW:
  onToggleSplat: () => void;
  splatVisible: boolean;
  hasSplat: boolean; // Only show toggle if splat data exists
}
```

**Update component:**
```typescript
export default function DomainInfo({
  domainInfo,
  onTogglePortals,
  portalsVisible,
  onToggleNavMesh,
  navMeshVisible,
  onToggleOcclusion,
  occlusionVisible,
  onTogglePointCloud,
  pointCloudVisible,
  onToggleSplat,
  splatVisible,
  hasSplat,
}: DomainInfoProps) {
  // ... existing code ...

  return (
    <div className="...">
      {/* ... existing collapsibles ... */}
      
      <Collapsible className="rounded-xl bg-[#282828] p-4 pointer-events-auto">
        <ToggleVisibility
          onTogglePortals={onTogglePortals}
          portalsVisible={portalsVisible}
          onToggleNavMesh={onToggleNavMesh}
          navMeshVisible={navMeshVisible}
          onToggleOcclusion={onToggleOcclusion}
          occlusionVisible={occlusionVisible}
          onTogglePointCloud={onTogglePointCloud}
          pointCloudVisible={pointCloudVisible}
          // NEW:
          onToggleSplat={onToggleSplat}
          splatVisible={splatVisible}
          hasSplat={hasSplat}
        />
      </Collapsible>
    </div>
  );
}
```

#### 7.2 Update ToggleVisibility Component
**File:** `components/ToggleVisibility.tsx`

**Update interface:**
```typescript
import { ChevronDown, Cloud, QrCode, Map, Box, Sparkles } from "lucide-react"

interface ToggleVisibilityProps {
  onTogglePortals: () => void
  portalsVisible: boolean
  onToggleNavMesh: () => void
  navMeshVisible: boolean
  onToggleOcclusion: () => void
  occlusionVisible: boolean
  onTogglePointCloud: () => void
  pointCloudVisible: boolean
  // NEW:
  onToggleSplat: () => void
  splatVisible: boolean
  hasSplat: boolean // Only show button if splat data exists
}
```

**Update component body:**
```typescript
export function ToggleVisibility({ 
  onTogglePortals, 
  portalsVisible, 
  onToggleNavMesh, 
  navMeshVisible,
  onToggleOcclusion,
  occlusionVisible,
  onTogglePointCloud,
  pointCloudVisible,
  onToggleSplat,
  splatVisible,
  hasSplat
}: ToggleVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Build toggle buttons array dynamically
  const toggleButtons = [
    { icon: QrCode, label: "Toggle Portals", visible: portalsVisible, onClick: onTogglePortals },
    { icon: Map, label: "Toggle Navigation Mesh", visible: navMeshVisible, onClick: onToggleNavMesh },
    { icon: Box, label: "Toggle Occlusion", visible: occlusionVisible, onClick: onToggleOcclusion },
    { icon: Cloud, label: "Toggle Point Cloud", visible: pointCloudVisible, onClick: onTogglePointCloud },
  ];

  // Add splat button only if splat data exists
  if (hasSplat) {
    toggleButtons.push({
      icon: Sparkles,
      label: "Toggle Gaussian Splat",
      visible: splatVisible,
      onClick: onToggleSplat,
    });
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between bg-[#282828] py-2 z-10">
        <h2 className="text-[#fafafa] text-base sm:text-xl font-medium">Toggle Visibility</h2>
        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#fafafa] transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
          {toggleButtons.map(({ icon: Icon, label, visible, onClick }) => (
            <button
              key={label}
              className={cn(
                "flex h-8 sm:h-10 w-full items-center justify-center rounded-lg text-[#fafafa] sm:w-10",
                visible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
              )}
              aria-label={label}
              onClick={onClick}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

**Changes:**
- Import `Sparkles` icon from lucide-react (represents splat/particle effect)
- Add new props: `onToggleSplat`, `splatVisible`, `hasSplat`
- Dynamically build toggle buttons array
- Conditionally add splat button only if `hasSplat` is true
- Maintains existing grid layout and styling

---

### Phase 8: WebGL2 Compatibility Check
**Estimated Time:** 30 minutes

#### 8.1 Create WebGL2 Check Utility
**File:** `utils/webgl-check.ts`

```typescript
export function checkWebGL2Support(): {
  supported: boolean;
  message?: string;
} {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    
    if (!gl) {
      return {
        supported: false,
        message: "WebGL2 is not supported in your browser. Gaussian Splat rendering requires WebGL2.",
      };
    }

    // Check for required extensions/features
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log("[WebGL2 Check] Max texture size:", maxTextureSize);

    return { supported: true };
  } catch (e) {
    return {
      supported: false,
      message: "Error checking WebGL2 support: " + (e instanceof Error ? e.message : String(e)),
    };
  }
}
```

#### 8.2 Add Check to SplatViewer
**File:** `components/SplatViewer.tsx`

```typescript
import { useEffect, useState } from "react";
import { checkWebGL2Support } from "@/utils/webgl-check";

export default function SplatViewer({ ... }: SplatViewerProps) {
  const [webgl2Supported, setWebgl2Supported] = useState(true);

  useEffect(() => {
    const check = checkWebGL2Support();
    if (!check.supported) {
      console.warn("[SplatViewer]", check.message);
      setWebgl2Supported(false);
    }
  }, []);

  const { data, isLoading, error } = useSplatData({...});

  if (!webgl2Supported) {
    console.warn("[SplatViewer] WebGL2 not supported, skipping splat rendering");
    return null;
  }

  // ... rest of component
}
```

---

### Phase 9: Testing & Validation
**Estimated Time:** 1-2 hours

#### 9.1 Manual Testing Checklist

**Setup:**
- [ ] Install dependencies successfully
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Development server starts without errors

**Data Loading:**
- [ ] Find a domain with gaussian splat data (coordinate with backend team)
- [ ] Verify splat data is detected in console logs
- [ ] Verify splat file is downloaded (check network tab)
- [ ] Check file size is reasonable (not 0 bytes)

**Rendering:**
- [ ] Splat renders in 3D scene
- [ ] Splat has correct position/orientation
- [ ] Splat respects alignment matrix
- [ ] Splat renders with proper colors
- [ ] No console errors during rendering

**Performance:**
- [ ] Frame rate remains smooth (>30 FPS)
- [ ] Web Worker sorting works correctly
- [ ] Memory usage is reasonable (check DevTools)
- [ ] Sorting updates when camera moves

**UI Controls:**
- [ ] Splat visibility toggle appears when splat data exists
- [ ] Toggle button hides/shows splat correctly
- [ ] Toggle state persists during session
- [ ] UI is responsive and accessible

**Compatibility:**
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Gracefully handles WebGL2 unsupported browsers

**Edge Cases:**
- [ ] Domain without splat data (should show no splat toggle)
- [ ] Network error during splat fetch (should fail gracefully)
- [ ] Corrupted splat data (should log error and skip)
- [ ] Both point cloud and splat visible simultaneously
- [ ] Switching between domains

---

### Phase 10: Optimization & Polish
**Estimated Time:** 1 hour

#### 10.1 Optional Enhancements

**View Mode Switcher:**
Add radio buttons to switch between:
- Point Cloud only
- Gaussian Splat only
- Both (default)

**Loading Indicator:**
Show spinner or progress bar during splat download for large files.

**Error Messages:**
Display user-friendly error message if splat fails to load.

**Alignment Controls:**
Add UI to manually adjust splat position/rotation if alignment is off.

---

## 📝 File Checklist

### New Files to Create
- [x] `for-llms/tasks/splat-implementation-plan.md` (this file)
- [ ] `components/CustomSplat.web.tsx` (~650 lines)
- [ ] `hooks/useSplatData.ts` (~60 lines)
- [ ] `components/SplatViewer.tsx` (~60 lines)
- [ ] `utils/webgl-check.ts` (~30 lines)

### Existing Files to Modify
- [ ] `app/layout.tsx` (Add QueryClientProvider)
- [ ] `app/[id]/ClientPage.tsx` (Add splat state and fetching)
- [ ] `components/Viewer3D.tsx` (Add SplatViewer rendering)
- [ ] `components/DomainInfo.tsx` (Add splat toggle prop)
- [ ] `components/ToggleVisibility.tsx` (Add splat toggle button)
- [ ] `package.json` (Add @tanstack/react-query dependency)

---

## 🔍 Known Unknowns & Questions

### Data Structure Confirmation Needed

1. **What is the exact `data_type` for splat files?**
   - `"gaussian_splat"`?
   - `"splat"`?
   - `"gaussian_splat_v1"`?
   - Something else?

2. **How is the splat file referenced in domain_metadata?**
   - New field `canonicalGaussianSplat`?
   - Same as `canonicalRefinement` with type indicator?
   - Separate field like `canonicalSplat`?

3. **Does splat use the same alignment matrix as point cloud?**
   - Reuse `canonicalRefinementAlignmentMatrix`?
   - Separate `canonicalSplatAlignmentMatrix`?

4. **What is the splat file naming convention?**
   - `gaussian_splat_${id}`?
   - `splat_${id}`?
   - `refined_splat_${id}`?

### Backend Coordination Required

- [ ] Confirm splat file data_type value
- [ ] Confirm domain_metadata field name
- [ ] Confirm splat file naming convention
- [ ] Identify test domain(s) with splat data
- [ ] Verify alignment matrix compatibility

---

## 📦 Dependencies

### Required (to be installed)
- `@tanstack/react-query`: ^5.0.0

### Already Installed
- `three`: ^0.162.0 ✅
- `@react-three/fiber`: ^8.15.19 ✅
- `@react-three/drei`: ^9.102.3 ✅

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data structure different than expected | High | Implement flexible search with fallbacks |
| WebGL2 not supported in user's browser | Medium | Graceful degradation, show point cloud instead |
| Large splat files cause performance issues | Medium | Web Worker sorting, consider file size warnings |
| Alignment matrix incompatible | Medium | Add manual alignment controls as fallback |
| Backend API changes during implementation | Low | Use flexible parsing, log extensively |

---

## 🎯 Success Criteria

### Minimum Viable Product (MVP)
- [x] Data structure investigation complete
- [ ] Dependencies installed
- [ ] Core rendering works for at least one test domain
- [ ] UI toggle appears and functions
- [ ] No console errors during normal operation
- [ ] WebGL2 compatibility check implemented

### Full Feature Complete
- [ ] All phases implemented
- [ ] Works across Chrome, Firefox, Safari
- [ ] Graceful error handling for all edge cases
- [ ] Performance is acceptable (>30 FPS)
- [ ] Code is documented and follows project conventions
- [ ] Both point cloud and splat can be visible simultaneously

---

## 📚 Reference Documentation

### Implementation Guide
- Full technical guide: `for-llms/tasks/splat-viewer.md`
- This file contains complete, production-ready code for all core components

### Related Files
- Point cloud loading reference: `app/[id]/ClientPage.tsx` (lines 131-165)
- 3D rendering reference: `components/Viewer3D.tsx`
- Data fetching reference: `utils/posemeshClientApi.ts`

### External Resources
- [Three.js WebGL2 Support](https://threejs.org/docs/#manual/en/introduction/WebGL-compatibility-check)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Gaussian Splatting Paper](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)

---

## 📅 Estimated Timeline

| Phase | Time | Cumulative |
|-------|------|------------|
| 1. Setup | 30 min | 30 min |
| 2. Core Renderer | 2 hours | 2h 30m |
| 3. Data Fetching | 1 hour | 3h 30m |
| 4. Composition | 45 min | 4h 15m |
| 5. Data Integration | 1 hour | 5h 15m |
| 6. Viewer Integration | 30 min | 5h 45m |
| 7. UI Controls | 30 min | 6h 15m |
| 8. WebGL2 Check | 30 min | 6h 45m |
| 9. Testing | 2 hours | 8h 45m |
| 10. Polish | 1 hour | 9h 45m |

**Total Estimated Time:** ~10 hours for full implementation and testing

---

## 🚀 Next Steps

1. **Confirm with backend team:**
   - Exact data_type value for splat files
   - Domain metadata field name
   - Provide test domain ID with splat data

2. **Start implementation:**
   - Begin with Phase 1 (Dependencies)
   - Proceed sequentially through phases
   - Test incrementally after each phase

3. **Request review after MVP:**
   - Get feedback on rendering quality
   - Validate performance on real data
   - Adjust alignment if needed

---

## 📞 Support & Questions

For questions during implementation:
- Check existing similar implementations (point cloud loading)
- Refer to `splat-viewer.md` for detailed code examples
- Test with console logging at each step
- Use browser DevTools for debugging WebGL issues

---

**Document Version:** 1.0  
**Created:** 2026-01-22  
**Last Updated:** 2026-01-22  
**Status:** Ready for Implementation
