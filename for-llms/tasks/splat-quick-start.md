# Gaussian Splat Integration - Quick Start Guide

## 📋 Pre-Implementation Checklist

### ✅ Confirmed Information
- ✅ Three.js and R3F already installed
- ✅ Data fetching pattern established (PLY point clouds)
- ✅ Alignment matrix system in place
- ✅ UI toggle component structure understood
- ✅ Complete implementation code available in `splat-viewer.md`

### ❓ Needs Confirmation from Backend Team

**IMPORTANT:** Before starting implementation, confirm these with backend:

1. **Splat file data_type value:**
   - Expected: `"gaussian_splat"` or `"splat"`
   - Current known values: `"obj"`, `"refined_pointcloud_ply"`

2. **Domain metadata field name:**
   - Expected: `metadata.canonicalGaussianSplat` or `metadata.canonicalSplat`
   - Current known: `metadata.canonicalRefinement`

3. **Splat file naming pattern:**
   - Expected: `gaussian_splat_${id}` or `splat_${id}`
   - Current known: `refined_pointcloud_${id}`, `navmesh_v1`

4. **Test domain with splat data:**
   - Need at least one domain ID that has splat data for testing

---

## 🚀 Implementation Order

### Step 1: Install Dependency (5 min)
```bash
npm install @tanstack/react-query
```

### Step 2: Add React Query Provider (10 min)
**File:** `app/layout.tsx`
- Import and wrap with QueryClientProvider
- Configure caching (5 min stale time)

### Step 3: Create Core Files (2 hours)
**In order:**
1. `components/CustomSplat.web.tsx` - Copy from `splat-viewer.md` lines 83-651
2. `hooks/useSplatData.ts` - React Query hook (see plan Phase 3)
3. `components/SplatViewer.tsx` - Composition component (see plan Phase 4)
4. `utils/webgl-check.ts` - WebGL2 compatibility check (see plan Phase 8)

### Step 4: Update ClientPage (1 hour)
**File:** `app/[id]/ClientPage.tsx`

Add state:
```typescript
const [splatData, setSplatData] = useState<{fileId: string; alignmentMatrix: number[] | null} | null>(null);
const [splatVisible, setSplatVisible] = useState(true);
```

Add fetching in `loadAllDomainData()` (after point cloud):
```typescript
// Search for splat file - UPDATE data_type AFTER BACKEND CONFIRMATION
const splatItem = domainData.find(
  (item: any) => item.data_type === "gaussian_splat" // CONFIRM THIS VALUE
);
if (splatItem) {
  setSplatData({
    fileId: splatItem.id,
    alignmentMatrix: metadata.canonicalRefinementAlignmentMatrix || null,
  });
}
```

Pass to components:
```typescript
<Viewer3D ... splatData={splatData} splatVisible={splatVisible} domainData={domainData} />
<DomainInfo ... onToggleSplat={() => setSplatVisible(!splatVisible)} splatVisible={splatVisible} hasSplat={!!splatData} />
```

### Step 5: Update Viewer3D (20 min)
**File:** `components/Viewer3D.tsx`

Add import:
```typescript
import SplatViewer from "./SplatViewer";
```

Add props to interface, then render:
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

### Step 6: Update UI Components (30 min)
**Files:**
- `components/DomainInfo.tsx` - Add splat props
- `components/ToggleVisibility.tsx` - Add Sparkles icon and conditional button

See implementation plan Phase 7 for exact code.

### Step 7: Test (1-2 hours)
1. Check console for splat detection logs
2. Verify rendering works
3. Test toggle functionality
4. Check performance (FPS)
5. Test WebGL2 fallback

---

## 🔧 Quick Reference: File Locations

### Copy Complete Code From:
- `for-llms/tasks/splat-viewer.md` lines 83-651 → `components/CustomSplat.web.tsx`

### Detailed Instructions In:
- `for-llms/tasks/splat-implementation-plan.md` - Full step-by-step guide

### Reference Examples:
- Point cloud loading: `app/[id]/ClientPage.tsx` lines 131-165
- PLY parsing: `components/Viewer3D.tsx` lines 73-139
- Existing toggles: `components/ToggleVisibility.tsx`

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@tanstack/react-query'"
**Solution:** Run `npm install @tanstack/react-query`

### Issue: Splat not appearing
**Solutions:**
1. Check console for "Found gaussian splat" log
2. Verify data_type matches backend value
3. Check Network tab for file download
4. Verify alignment matrix is being applied

### Issue: WebGL2 errors
**Solutions:**
1. Check browser compatibility (Chrome 56+, Firefox 51+, Safari 15+)
2. Verify WebGL2 is enabled in browser settings
3. Check for WebGL2 support: `canvas.getContext('webgl2')`

### Issue: Poor performance / low FPS
**Solutions:**
1. Check splat file size (should be reasonable)
2. Verify Web Worker is running (check console logs)
3. Consider enabling `alphaHash` prop for faster rendering

---

## 📊 Data Structure Quick Reference

### Current Known Patterns:
```typescript
// Domain data API response array items:
{
  id: "file_id_123",
  name: "navmesh_v1",
  data_type: "obj"
}

{
  id: "file_id_456",
  name: "refined_pointcloud_abc123",
  data_type: "refined_pointcloud_ply"
}

// Domain metadata JSON:
{
  canonicalRefinement: "abc123",
  canonicalRefinementAlignmentMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
}
```

### Expected Splat Pattern:
```typescript
// UPDATE AFTER BACKEND CONFIRMATION
{
  id: "file_id_789",
  name: "gaussian_splat_xyz789",  // CONFIRM PATTERN
  data_type: "gaussian_splat"      // CONFIRM VALUE
}
```

---

## ✅ Testing Checklist

### Minimal Viable Test
- [ ] App builds without errors
- [ ] Splat file is detected (console log)
- [ ] Splat file is downloaded (network tab)
- [ ] Splat renders in 3D view
- [ ] Toggle button appears and works

### Full Test Suite
- [ ] Works on Chrome, Firefox, Safari
- [ ] WebGL2 fallback works correctly
- [ ] Both point cloud and splat visible together
- [ ] Alignment matrix applied correctly
- [ ] Performance acceptable (>30 FPS)
- [ ] UI responsive on mobile
- [ ] Proper error handling for missing splat

---

## 📞 Need Help?

### Check These First:
1. Console logs - All components log their state
2. Network tab - Verify file downloads
3. React DevTools - Check component props
4. Three.js Inspector - Check 3D scene graph

### Documentation:
- Full plan: `for-llms/tasks/splat-implementation-plan.md`
- Splat guide: `for-llms/tasks/splat-viewer.md`
- Project README: `README.md`

---

## 🎯 Success = All These Work:

1. ✅ Find domain with splat data
2. ✅ Load domain → splat detected in logs
3. ✅ Splat renders with colors in 3D view
4. ✅ Toggle button appears in UI
5. ✅ Click toggle → splat hides/shows
6. ✅ No console errors
7. ✅ Smooth frame rate (>30 FPS)

---

**Estimated Total Time:** 4-6 hours for core implementation + testing  
**Prerequisites:** Backend team confirmation on data structure  
**Status:** Ready to start after backend confirmation
