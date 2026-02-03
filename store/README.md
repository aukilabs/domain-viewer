# State Management Architecture

This directory contains the application's state management using [Jotai](https://jotai.org/), a primitive and flexible state management library for React.

## Overview

The state is organized into three separate stores based on concerns:

- **`domainStore.ts`** - Domain data and loading states
- **`visualizationStore.ts`** - UI visibility toggles for 3D elements
- **`camera-store.ts`** - Camera position and control mode

This separation provides:
- **Single source of truth** - No prop drilling required
- **Automatic reactivity** - Components re-render when atoms change
- **Type safety** - Full TypeScript support
- **Derived state** - Computed values update automatically
- **Performance** - Only components using specific atoms re-render

## Store Structure

### Domain Store (`domainStore.ts`)

Manages all domain-related data fetched from the Posemesh API.

#### Primitive Atoms (Data)
- `domainDataAtom` - Complete domain data collection
- `pointCloudDataAtom` - Point cloud PLY binary data
- `portalsAtom` - Array of portal/lighthouse markers
- `navMeshDataAtom` - Navigation mesh OBJ binary data
- `occlusionMeshDataAtom` - Occlusion mesh OBJ binary data
- `alignmentMatrixAtom` - 4x4 transformation matrix
- `splatDataAtom` - Splat metadata (file ID + alignment matrix)
- `splatArrayBufferAtom` - Downloaded splat binary data

#### Primitive Atoms (State)
- `isLoadingAtom` - Global loading state
- `loadingErrorAtom` - Error message string
- `errorDetailsAtom` - Detailed error information
- `isInIframeAtom` - Iframe detection flag

#### Derived Atoms (Computed)
- `hasSplatDataAtom` - Boolean: splat data exists
- `isDataLoadedAtom` - Boolean: domain data loaded
- `domainInfoAtom` - Extracted domain info object
- `domainIdAtom` - Extracted domain ID
- `hasPointCloudAtom` - Boolean: point cloud exists
- `hasNavMeshAtom` - Boolean: nav mesh exists
- `hasOcclusionMeshAtom` - Boolean: occlusion mesh exists

### Visualization Store (`visualizationStore.ts`)

Manages visibility states for all 3D visualization layers.

#### Primitive Atoms
- `portalsVisibleAtom` - Portal markers visibility (default: true)
- `navMeshVisibleAtom` - Navigation mesh visibility (default: true)
- `occlusionVisibleAtom` - Occlusion mesh visibility (default: true)
- `pointCloudVisibleAtom` - Point cloud visibility (default: true)
- `splatVisibleAtom` - Gaussian splat visibility (default: true)

#### Derived Atoms
- `allVisibleAtom` - Boolean: all layers visible
- `anyVisibleAtom` - Boolean: at least one layer visible

### Camera Store (`camera-store.ts`)

Manages camera state for the 3D viewer.

#### Primitive Atoms
- `cameraPoseAtom` - Camera position, rotation, zoom, target
- `cameraControlModeAtom` - Control mode: "map" | "fps"

## Usage Patterns

### Reading Atom Values

Use `useAtomValue` when you only need to read an atom's value:

```tsx
import { useAtomValue } from 'jotai';
import { domainInfoAtom } from '@/store/domainStore';

function DomainName() {
  const domainInfo = useAtomValue(domainInfoAtom);
  return <div>{domainInfo?.name}</div>;
}
```

### Reading and Writing Atoms

Use `useAtom` when you need both read and write access:

```tsx
import { useAtom } from 'jotai';
import { portalsVisibleAtom } from '@/store/visualizationStore';

function TogglePortals() {
  const [visible, setVisible] = useAtom(portalsVisibleAtom);
  return (
    <button onClick={() => setVisible(!visible)}>
      {visible ? 'Hide' : 'Show'} Portals
    </button>
  );
}
```

### Writing Only (No Re-renders)

Use `useSetAtom` when you only need to update an atom without reading its value:

```tsx
import { useSetAtom } from 'jotai';
import { isLoadingAtom } from '@/store/domainStore';

function DataLoader() {
  const setIsLoading = useSetAtom(isLoadingAtom);
  
  const loadData = async () => {
    setIsLoading(true);
    // ... load data
    setIsLoading(false);
  };
  
  return <button onClick={loadData}>Load</button>;
}
```

### Toggling Boolean Atoms

Use the functional update pattern to toggle booleans:

```tsx
const [visible, setVisible] = useAtom(portalsVisibleAtom);

// Toggle
setVisible(prev => !prev);

// Set to specific value
setVisible(true);
```

### Using Derived Atoms

Derived atoms automatically recompute when their dependencies change:

```tsx
import { useAtomValue } from 'jotai';
import { hasSplatDataAtom } from '@/store/domainStore';

function SplatButton() {
  const hasSplat = useAtomValue(hasSplatDataAtom);
  
  if (!hasSplat) return null;
  
  return <button>Download Splat</button>;
}
```

## Migration from useState

The migration from React's `useState` to Jotai atoms eliminates prop drilling and provides a cleaner architecture.

### Before (useState with prop drilling)

```tsx
// ClientPage.tsx
function ClientPage() {
  const [domainData, setDomainData] = useState(null);
  const [portalsVisible, setPortalsVisible] = useState(true);
  
  return (
    <Viewer3D 
      domainData={domainData}
      portalsVisible={portalsVisible}
      onTogglePortals={() => setPortalsVisible(!portalsVisible)}
    />
  );
}

// Viewer3D.tsx
function Viewer3D({ domainData, portalsVisible, onTogglePortals }) {
  return (
    <DomainInfo 
      domainData={domainData}
      portalsVisible={portalsVisible}
      onTogglePortals={onTogglePortals}
    />
  );
}

// DomainInfo.tsx
function DomainInfo({ domainData, portalsVisible, onTogglePortals }) {
  // Finally use the props here
}
```

### After (Jotai atoms, no prop drilling)

```tsx
// ClientPage.tsx
function ClientPage() {
  const setDomainData = useSetAtom(domainDataAtom);
  
  // Load data directly into atoms
  useEffect(() => {
    loadData().then(data => setDomainData(data));
  }, []);
  
  return <Viewer3D />;
}

// Viewer3D.tsx
function Viewer3D() {
  // No props needed
  return <DomainInfo />;
}

// DomainInfo.tsx
function DomainInfo() {
  // Access atoms directly
  const domainData = useAtomValue(domainDataAtom);
  const [portalsVisible, setPortalsVisible] = useAtom(portalsVisibleAtom);
  
  return (
    <button onClick={() => setPortalsVisible(prev => !prev)}>
      Toggle Portals
    </button>
  );
}
```

## Best Practices

### 1. Use the Right Hook

- `useAtomValue` - Read-only access (most common)
- `useAtom` - Read + write access (for interactive components)
- `useSetAtom` - Write-only access (for data loading, no re-renders)

### 2. Prefer Derived Atoms Over Computed Values

❌ **Bad**: Computing in component

```tsx
function Component() {
  const splatData = useAtomValue(splatDataAtom);
  const hasSplat = !!splatData; // Computed every render
  return <div>{hasSplat ? 'Has splat' : 'No splat'}</div>;
}
```

✅ **Good**: Using derived atom

```tsx
function Component() {
  const hasSplat = useAtomValue(hasSplatDataAtom); // Cached
  return <div>{hasSplat ? 'Has splat' : 'No splat'}</div>;
}
```

### 3. Keep Atoms Focused

Each atom should represent a single piece of state. Don't create mega-atoms with unrelated data.

### 4. Document Your Atoms

Every atom should have JSDoc comments explaining:
- What data it stores
- When it changes
- Example usage
- Related atoms

### 5. Initialize with Sensible Defaults

Atoms should have default values that make sense for the initial render:

```tsx
// ✅ Good: Safe default
export const portalsVisibleAtom = atom<boolean>(true);

// ❌ Bad: Null requires null checks everywhere
export const portalsVisibleAtom = atom<boolean | null>(null);
```

## Common Patterns

### Loading Data Pattern

```tsx
function DataLoader() {
  const setDomainData = useSetAtom(domainDataAtom);
  const setIsLoading = useSetAtom(isLoadingAtom);
  const setError = useSetAtom(loadingErrorAtom);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchDomainData();
        setDomainData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
}
```

### Conditional Rendering Pattern

```tsx
function ConditionalComponent() {
  const domainInfo = useAtomValue(domainInfoAtom);
  
  // Early return if data not loaded
  if (!domainInfo) {
    return <LoadingSpinner />;
  }
  
  return <div>{domainInfo.name}</div>;
}
```

### Toggle All Pattern

```tsx
function ToggleAllButton() {
  const setPortalsVisible = useSetAtom(portalsVisibleAtom);
  const setNavMeshVisible = useSetAtom(navMeshVisibleAtom);
  const setOcclusionVisible = useSetAtom(occlusionVisibleAtom);
  const allVisible = useAtomValue(allVisibleAtom);
  
  const toggleAll = () => {
    const newState = !allVisible;
    setPortalsVisible(newState);
    setNavMeshVisible(newState);
    setOcclusionVisible(newState);
  };
  
  return <button onClick={toggleAll}>Toggle All</button>;
}
```

## Performance Considerations

### Atoms Are Lightweight

Jotai atoms are extremely lightweight. Don't hesitate to create many small atoms rather than few large ones.

### Only Used Atoms Cause Re-renders

Components only re-render when atoms they actually read change:

```tsx
function Component() {
  const domainId = useAtomValue(domainIdAtom);
  // This component will NOT re-render when portalsVisibleAtom changes
  // because it doesn't read that atom
}
```

### Derived Atoms Are Cached

Derived atoms only recompute when their dependencies change:

```tsx
export const hasSplatDataAtom = atom((get) => !!get(splatDataAtom));
// This computation is cached and only runs when splatDataAtom changes
```

## Testing

### Testing Components with Atoms

Use Jotai's `Provider` to set initial values in tests:

```tsx
import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';

function TestWrapper({ children, initialValues }) {
  useHydrateAtoms(initialValues);
  return children;
}

test('renders domain name', () => {
  render(
    <Provider>
      <TestWrapper initialValues={[[domainInfoAtom, mockDomainInfo]]}>
        <DomainName />
      </TestWrapper>
    </Provider>
  );
});
```

## Resources

- [Jotai Documentation](https://jotai.org/)
- [Jotai vs Redux](https://jotai.org/docs/basics/comparison)
- [Jotai DevTools](https://jotai.org/docs/tools/devtools)
- [Jotai Best Practices](https://jotai.org/docs/guides/best-practices)
