# Service Layer Architecture

This directory contains the service layer that separates data fetching concerns from UI components. The service layer provides a clean, maintainable architecture for domain data operations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                            │
│                  (ClientPage.tsx, etc.)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Service                             │
│         (Orchestrates all domain operations)                 │
└──────┬──────────────────────────────────────────────┬───────┘
       │                                               │
       ▼                                               ▼
┌──────────────────┐                          ┌──────────────┐
│  File Service    │                          │ Server Action│
│ (File downloads) │                          │ (Auth only)  │
└──────────────────┘                          └──────────────┘
       │
       ▼
┌──────────────────┐
│  Retry Utility   │
│ (Error handling) │
└──────────────────┘
```

## Data Flow

1. **Server Action** (`app/actions.ts`) - Handles initial authentication with environment credentials
2. **Domain Service** (`services/domainService.ts`) - Orchestrates all domain data operations
3. **File Service** (`services/fileService.ts`) - Handles file downloads with retry logic
4. **Components** - Consume data from services via simple async calls

## Files

### Core Services

- **`domainService.ts`** - Main service for domain operations
  - Authentication
  - Portal fetching
  - Data list retrieval
  - Metadata parsing
  - Mesh and point cloud downloads
  - Orchestration method `loadAllDomainData()`

- **`fileService.ts`** - File download service
  - Generic file downloads
  - Domain-specific file downloads
  - Progress tracking
  - Timeout handling
  - Retry logic integration

### Supporting Files

- **`errors.ts`** - Custom error classes
  - `DomainServiceError` - Base error class
  - `AuthenticationError` - Auth failures (401, 403)
  - `DataNotFoundError` - Missing data (404)
  - `NetworkError` - Network failures
  - `FileDownloadError` - Download failures
  - `ParseError` - Data parsing failures
  - `TimeoutError` - Timeout errors

- **`README.md`** - This file

## Usage

### Basic Usage

```typescript
import { domainService } from '@/services/domainService';

// Load all domain data
const result = await domainService.loadAllDomainData('domain-123');

if (result.success) {
  const { domainData, portals, navMesh, pointCloud, splatData } = result.data;
  console.log(`Loaded ${portals.length} portals`);
} else {
  console.error('Failed to load domain:', result.error);
}
```

### Individual Operations

```typescript
// Authenticate
const domainData = await domainService.authenticateDomain('domain-123');

// Fetch portals
const portals = await domainService.fetchDomainPortals(domainData);

// Fetch data list
const dataList = await domainService.fetchDomainDataList(domainData);

// Fetch metadata
const metadata = await domainService.fetchDomainMetadata(domainData, dataList);

// Fetch optional data
const navMesh = await domainService.fetchNavMesh(domainData, dataList);
const pointCloud = await domainService.fetchPointCloud(domainData, dataList, metadata);
const splatData = await domainService.fetchSplatData(domainData, dataList, metadata);
```

### File Downloads

```typescript
import { fileService } from '@/services/fileService';

// Download with progress tracking
const data = await fileService.downloadFile(url, {
  maxRetries: 3,
  timeout: 60000,
  onProgress: (loaded, total) => {
    console.log(`Progress: ${(loaded / total * 100).toFixed(1)}%`);
  }
});

// Download domain file
const fileData = await fileService.downloadDomainFile(
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  posemeshClientId
);
```

## Error Handling

All service methods use comprehensive error handling:

```typescript
try {
  const result = await domainService.loadAllDomainData('domain-123');
  if (!result.success) {
    // Handle error
    console.error(result.error);
  }
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle auth error
  } else if (error instanceof NetworkError) {
    // Handle network error
  } else {
    // Handle other errors
  }
}
```

## Retry Logic

All network operations include automatic retry with exponential backoff:

- **Max retries**: 3 attempts
- **Backoff**: Exponential (1000ms, 2000ms, 4000ms)
- **Retryable errors**: Network errors, 5xx responses, timeouts
- **Non-retryable errors**: 4xx responses (except 429), auth failures

## Type Safety

All services use comprehensive TypeScript types from `types/domain.ts`:

- `DomainData` - Complete domain data
- `Portal` - Portal/lighthouse data
- `DomainDataItem` - Individual data items
- `DomainMetadata` - Domain metadata
- `ServiceResult<T>` - Generic result wrapper
- And many more...

## Testing

Mock data is available in `__mocks__/domainData.ts` for testing:

```typescript
import { mockDomainData, mockPortals } from '@/__mocks__/domainData';

// Use in tests
const service = new DomainService('test-client-id', mockFileService);
```

## Migration Notes

### From Old API Client

The old `PosemeshClientApi` class has been replaced by the service layer:

**Before:**
```typescript
const clientApi = new PosemeshClientApi();
const result = await fetchDomainInfo(domainId, clientApi.posemeshClientId);
const portals = await clientApi.fetchDomainPortals(...);
const domainData = await clientApi.fetchDomainData(...);
// ... manual data item finding and downloading
```

**After:**
```typescript
const result = await domainService.loadAllDomainData(domainId);
// All data loaded and organized
```

### Backward Compatibility

- Same data structures passed to components
- Same loading states and error behaviors
- No breaking changes to component interfaces

## Future Enhancements

Potential improvements for future phases:

1. **React Query Integration** - Cache and synchronize server state
2. **State Management** - Migrate to Jotai for global state
3. **Optimistic Updates** - Improve perceived performance
4. **Streaming Downloads** - Better progress tracking for large files
5. **Parallel Downloads** - Download multiple files simultaneously
6. **Service Workers** - Offline support and caching
