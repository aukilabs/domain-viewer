# Custom React Hooks

This directory contains custom React hooks that wrap service layer operations and provide consistent loading/error/success state contracts using React Query.

## Overview

All data-fetching hooks in this directory follow these principles:

1. **TypeScript Generics** - Strongly typed parameters and return values
2. **Consistent State Contract** - All hooks return `{ data, isLoading, isError, error, isSuccess }`
3. **React Query Integration** - Automatic caching, retries, and state management
4. **Service Layer Wrapping** - Hooks wrap corresponding services (`domainService`, `fileService`, etc.)
5. **Comprehensive Documentation** - JSDoc comments with examples for all hooks

## Hook Categories

### Domain Data Hooks

Hooks for loading domain-related data from the Posemesh API.

#### `useDomainData`

Loads complete domain data collection including authentication, portals, meshes, point clouds, and splat data.

**Wraps:** `domainService.loadAllDomainData()`

**Example:**
```tsx
import { useDomainData } from "@/hooks";

function DomainViewer({ domainId }: { domainId: string }) {
  const { data, isLoading, isError, error } = useDomainData({ domainId });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage error={error} />;
  if (!data) return null;

  return (
    <div>
      <h1>{data.domainData.domainInfo.name}</h1>
      <p>Portals: {data.portals.length}</p>
      <p>Has Point Cloud: {data.pointCloud ? "Yes" : "No"}</p>
      <p>Has Splat: {data.splatData ? "Yes" : "No"}</p>
    </div>
  );
}
```

### File Download Hooks

Hooks for downloading files with retry logic and progress tracking.

#### `useFileDownload`

Downloads a file from a URL with automatic retry and progress tracking.

**Wraps:** `fileService.downloadFile()`

**Example:**
```tsx
import { useFileDownload } from "@/hooks";
import { useState } from "react";

function FileDownloader({ url }: { url: string }) {
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  
  const { data, isLoading, isError, error } = useFileDownload({
    url,
    onProgress: (loaded, total) => setProgress({ loaded, total }),
  });

  if (isLoading) {
    const percent = progress.total > 0 
      ? (progress.loaded / progress.total * 100).toFixed(1)
      : 0;
    return <div>Downloading: {percent}%</div>;
  }
  
  if (isError) return <div>Error: {error?.message}</div>;
  if (!data) return null;

  return <div>Downloaded {data.byteLength} bytes</div>;
}
```

#### `useDomainFile`

Downloads a file from a domain server with authentication.

**Wraps:** `fileService.downloadDomainFile()`

**Example:**
```tsx
import { useDomainFile } from "@/hooks";

function NavMeshViewer({ domainData }: { domainData: DomainData }) {
  const { data, isLoading, isError } = useDomainFile({
    domainServerUrl: domainData.domainServerUrl,
    domainId: domainData.domainInfo.id,
    fileId: "navmesh-file-id",
    accessToken: domainData.domainAccessToken,
    posemeshClientId: "client-id",
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage />;
  if (!data) return null;

  return <NavMeshRenderer data={data} />;
}
```

#### `useSplatData`

Downloads Gaussian splat data for rendering.

**Wraps:** `fileService.downloadDomainFile()` (specialized for splat files)

**Example:**
```tsx
import { useSplatData } from "@/hooks";

function SplatViewer({ splatData, domainData }: Props) {
  const { data, isLoading, isError } = useSplatData({
    domainServerUrl: domainData.domainServerUrl,
    domainId: domainData.domainInfo.id,
    fileId: splatData.fileId,
    accessToken: domainData.domainAccessToken,
    visible: true,
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage />;
  if (!data) return null;

  return <CustomSplat splatData={data} />;
}
```

### Data Parsing Hooks

Hooks for parsing binary data into usable formats.

#### `usePlyParser`

Parses PLY (Polygon File Format) data into Three.js geometry.

**Wraps:** `plyAsyncParse()` utility

**Example:**
```tsx
import { usePlyParser, useDomainFile } from "@/hooks";

function PointCloudRenderer({ domainData, fileId }: Props) {
  // First fetch the PLY data
  const { data: plyData } = useDomainFile({
    domainServerUrl: domainData.domainServerUrl,
    domainId: domainData.domainInfo.id,
    fileId,
    accessToken: domainData.domainAccessToken,
    posemeshClientId: "client-id",
  });

  // Then parse it into Three.js geometry
  const { geometry, isLoading, isError } = usePlyParser({
    data: plyData,
    threaded: true, // Use Web Worker for better performance
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage />;
  if (!geometry) return null;

  return (
    <points>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial size={0.01} vertexColors />
    </points>
  );
}
```

### UI Utility Hooks

General-purpose utility hooks for UI state and device detection.

#### `useColorScheme`

Detects and tracks user's color scheme preference (light/dark).

#### `useDebounce`

Debounces a value to prevent excessive updates.

#### `isMobile`

Detects if the current device is mobile.

## Hook State Contract

All data-fetching hooks return an object with the following shape:

```typescript
interface HookResult<T> {
  data: T | undefined;        // The fetched data
  isLoading: boolean;         // True while fetching
  isError: boolean;           // True if fetch failed
  error: Error | null;        // Error object if failed
  isSuccess: boolean;         // True if fetch succeeded
}
```

This consistent contract makes it easy to handle loading, error, and success states across the application.

## Usage Patterns

### Basic Pattern

```tsx
function Component() {
  const { data, isLoading, isError, error } = useHook(params);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage error={error} />;
  if (!data) return null;

  return <div>{/* Render with data */}</div>;
}
```

### Conditional Fetching

All hooks support an `enabled` parameter to conditionally enable/disable fetching:

```tsx
function Component({ domainId }: { domainId: string | null }) {
  const { data } = useDomainData({
    domainId: domainId || "",
    enabled: !!domainId, // Only fetch when domainId exists
  });

  return data ? <Viewer data={data} /> : null;
}
```

### Chaining Hooks

Hooks can be chained using the `enabled` parameter:

```tsx
function Component({ domainId }: { domainId: string }) {
  // First fetch domain data
  const { data: domainData } = useDomainData({ domainId });

  // Then fetch specific file once domain data is loaded
  const { data: fileData } = useDomainFile({
    domainServerUrl: domainData?.domainData.domainServerUrl || "",
    domainId: domainData?.domainData.domainInfo.id || "",
    fileId: "file-123",
    accessToken: domainData?.domainData.domainAccessToken || "",
    posemeshClientId: "client-id",
    enabled: !!domainData, // Only fetch file after domain data loads
  });

  return fileData ? <FileViewer data={fileData} /> : null;
}
```

### Progress Tracking

File download hooks support progress callbacks:

```tsx
function Component() {
  const [progress, setProgress] = useState(0);

  const { data } = useFileDownload({
    url: "https://example.com/large-file.bin",
    onProgress: (loaded, total) => {
      setProgress((loaded / total) * 100);
    },
  });

  return <div>Progress: {progress.toFixed(1)}%</div>;
}
```

### Error Handling

Errors can be handled at the component level or passed up to error boundaries:

```tsx
function Component() {
  const { data, isError, error } = useHook(params);

  if (isError) {
    // Handle specific error types
    if (error?.message.includes("401")) {
      return <AuthError />;
    }
    if (error?.message.includes("timeout")) {
      return <TimeoutError onRetry={refetch} />;
    }
    return <GenericError error={error} />;
  }

  return <div>{/* Render with data */}</div>;
}
```

## React Query Integration

All hooks use [@tanstack/react-query](https://tanstack.com/query) for data fetching, which provides:

- **Automatic Caching** - Fetched data is cached and shared across components
- **Background Refetching** - Stale data is refetched in the background
- **Retry Logic** - Failed requests are automatically retried with exponential backoff
- **Deduplication** - Multiple components requesting the same data only trigger one fetch
- **Garbage Collection** - Unused cached data is automatically cleaned up

### Cache Configuration

Each hook has sensible default cache settings:

- `useDomainData`: 5 minutes stale time, 3 retries
- `useFileDownload`: 10 minutes stale time, configurable retries
- `useDomainFile`: 10 minutes stale time, configurable retries
- `useSplatData`: 10 minutes stale time, 2 retries
- `usePlyParser`: Infinity stale time (parsed geometry never goes stale)

## Testing

When testing components that use these hooks, you can mock React Query:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

test("renders domain data", async () => {
  const { findByText } = renderWithQuery(<DomainViewer domainId="123" />);
  expect(await findByText(/Domain Name/)).toBeInTheDocument();
});
```

## Best Practices

### 1. Always Handle Loading and Error States

```tsx
// ✅ Good
function Component() {
  const { data, isLoading, isError } = useHook(params);
  if (isLoading) return <Loading />;
  if (isError) return <Error />;
  return <Render data={data} />;
}

// ❌ Bad
function Component() {
  const { data } = useHook(params);
  return <Render data={data} />; // Could render with undefined data
}
```

### 2. Use Conditional Fetching

```tsx
// ✅ Good
const { data } = useHook({ ...params, enabled: !!requiredParam });

// ❌ Bad
const { data } = useHook({ ...params }); // Fetches even if params invalid
```

### 3. Leverage Type Safety

```tsx
// ✅ Good - TypeScript knows data shape
const { data } = useDomainData({ domainId });
if (data) {
  console.log(data.domainData.domainInfo.name); // Type-safe
}

// ❌ Bad - Unsafe casting
const { data } = useHook(params) as any;
```

### 4. Extract Reusable Patterns

```tsx
// Create composite hooks for common patterns
function useDomainWithPointCloud(domainId: string) {
  const { data: domainData, ...domainQuery } = useDomainData({ domainId });
  
  const { geometry, ...geometryQuery } = usePlyParser({
    data: domainData?.pointCloud,
    threaded: true,
    enabled: !!domainData?.pointCloud,
  });

  return {
    domainData,
    geometry,
    isLoading: domainQuery.isLoading || geometryQuery.isLoading,
    isError: domainQuery.isError || geometryQuery.isError,
  };
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                         │
│                  (Viewer, Renderers, etc.)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Custom Hooks Layer                         │
│  (useDomainData, useFileDownload, usePlyParser, etc.)       │
│                                                              │
│  Features:                                                   │
│  - React Query integration                                   │
│  - Consistent state contracts                                │
│  - TypeScript generics                                       │
│  - Automatic caching & retries                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│         (domainService, fileService)                         │
│                                                              │
│  Features:                                                   │
│  - Business logic                                            │
│  - Error handling                                            │
│  - Retry logic                                               │
│  - Data orchestration                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Utilities Layer                            │
│          (plyAsyncParse, retry, etc.)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│              (Posemesh API, Domain Servers)                  │
└─────────────────────────────────────────────────────────────┘
```

## Migration Guide

### From Direct Service Calls

**Before:**
```tsx
function Component({ domainId }: Props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    domainService.loadAllDomainData(domainId)
      .then(result => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .finally(() => setLoading(false));
  }, [domainId]);

  if (loading) return <Loading />;
  if (error) return <Error />;
  return <Render data={data} />;
}
```

**After:**
```tsx
function Component({ domainId }: Props) {
  const { data, isLoading, isError } = useDomainData({ domainId });

  if (isLoading) return <Loading />;
  if (isError) return <Error />;
  return <Render data={data} />;
}
```

**Benefits:**
- ✅ Less boilerplate code
- ✅ Automatic caching and deduplication
- ✅ Built-in retry logic
- ✅ Better error handling
- ✅ Type safety

## Related Documentation

- [Service Layer Documentation](../services/README.md) - Service layer architecture
- [Store Documentation](../store/README.md) - State management with Jotai
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview) - React Query guide

## Future Enhancements

Potential improvements for future iterations:

1. **Suspense Support** - Add experimental Suspense support for React 18+
2. **Optimistic Updates** - Add mutation hooks for write operations
3. **Prefetching** - Add prefetch utilities for improved perceived performance
4. **Pagination** - Add pagination hooks for large data sets
5. **Infinite Queries** - Add infinite scroll support for lists
6. **WebSocket Support** - Add real-time data subscription hooks
