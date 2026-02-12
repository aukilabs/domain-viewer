/**
 * Domain Data Store
 * 
 * Manages all domain-related data and loading states using Jotai atoms.
 * This store handles data fetched from the Posemesh API including point clouds,
 * portals, meshes, and splat data.
 * 
 * @example
 * ```tsx
 * import { useAtomValue, useSetAtom } from 'jotai';
 * import { domainDataAtom, isLoadingAtom } from '@/store/domainStore';
 * 
 * function MyComponent() {
 *   const domainData = useAtomValue(domainDataAtom);
 *   const setIsLoading = useSetAtom(isLoadingAtom);
 *   // ...
 * }
 * ```
 */

import { atom } from 'jotai';
import type { DomainData, DomainDataItem, Portal } from '@/types/domain';

// ============================================================================
// Primitive Atoms - Domain Data
// ============================================================================

/**
 * Stores the complete domain data collection from the service layer.
 * Contains domainInfo, pointCloud, portals, meshes, and splat metadata.
 * 
 * @example
 * ```tsx
 * const [domainData, setDomainData] = useAtom(domainDataAtom);
 * ```
 */
export const domainDataAtom = atom<DomainData | null>(null);

/**
 * Stores the point cloud PLY data as an ArrayBuffer.
 * Used by the 3D viewer to render the point cloud visualization.
 * 
 * @example
 * ```tsx
 * const pointCloudData = useAtomValue(pointCloudDataAtom);
 * ```
 */
export const pointCloudDataAtom = atom<ArrayBuffer | null>(null);

/**
 * Stores the array of portal/lighthouse markers.
 * Each portal represents a physical location marker in the domain.
 * 
 * @example
 * ```tsx
 * const portals = useAtomValue(portalsAtom);
 * ```
 */
export const portalsAtom = atom<Portal[] | null>(null);

/**
 * Stores the navigation mesh OBJ data as an ArrayBuffer.
 * Used for pathfinding and walkable surface visualization.
 * 
 * @example
 * ```tsx
 * const navMeshData = useAtomValue(navMeshDataAtom);
 * ```
 */
export const navMeshDataAtom = atom<ArrayBuffer | null>(null);

/**
 * Stores the occlusion mesh OBJ data as an ArrayBuffer.
 * Used for rendering surfaces that occlude other objects.
 * 
 * @example
 * ```tsx
 * const occlusionMeshData = useAtomValue(occlusionMeshDataAtom);
 * ```
 */
export const occlusionMeshDataAtom = atom<ArrayBuffer | null>(null);

/**
 * Stores the alignment/transformation matrix for coordinate system alignment.
 * 16-element array representing a 4x4 transformation matrix.
 * 
 * @example
 * ```tsx
 * const alignmentMatrix = useAtomValue(alignmentMatrixAtom);
 * ```
 */
export const alignmentMatrixAtom = atom<number[] | null>(null);

/**
 * Stores splat metadata including file ID and alignment matrix.
 * Contains reference to the splat file but not the actual binary data.
 * 
 * @example
 * ```tsx
 * const splatData = useAtomValue(splatDataAtom);
 * if (splatData) {
 *   console.log('Splat file ID:', splatData.fileId);
 * }
 * ```
 */
export const splatDataAtom = atom<{
  fileId: string;
  alignmentMatrix: number[] | null;
} | null>(null);

/**
 * Stores the downloaded splat binary data as an ArrayBuffer.
 * This is the actual .splat or .spz file content loaded for rendering.
 * 
 * @example
 * ```tsx
 * const splatArrayBuffer = useAtomValue(splatArrayBufferAtom);
 * ```
 */
export const splatArrayBufferAtom = atom<ArrayBuffer | null>(null);

/**
 * Stores the raw domain data items list from the server.
 * Used by useRefinementSplat to discover partition and single-file splats.
 *
 * @example
 * ```tsx
 * const domainDataItems = useAtomValue(domainDataItemsAtom);
 * ```
 */
export const domainDataItemsAtom = atom<DomainDataItem[]>([]);

/**
 * Stores the canonical refinement ID from domain metadata.
 * Used as the key for loading Gaussian splat data (partitioned or single-file).
 *
 * @example
 * ```tsx
 * const refinementId = useAtomValue(refinementIdAtom);
 * ```
 */
export const refinementIdAtom = atom<string | null>(null);

// ============================================================================
// Primitive Atoms - Loading & Error States
// ============================================================================

/**
 * Global loading state for domain data fetching.
 * True when any data is being loaded from the API.
 * 
 * @example
 * ```tsx
 * const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
 * ```
 */
export const isLoadingAtom = atom<boolean>(true);

/**
 * Stores error messages from failed data loading operations.
 * Null when no error has occurred.
 * 
 * @example
 * ```tsx
 * const loadingError = useAtomValue(loadingErrorAtom);
 * if (loadingError) {
 *   return <ErrorMessage>{loadingError}</ErrorMessage>;
 * }
 * ```
 */
export const loadingErrorAtom = atom<string | null>(null);

/**
 * Stores detailed error information including timestamp and context.
 * Used for debugging and detailed error reporting.
 * 
 * @example
 * ```tsx
 * const errorDetails = useAtomValue(errorDetailsAtom);
 * ```
 */
export const errorDetailsAtom = atom<{
  message: string;
  timestamp: number;
  domainId?: string;
} | null>(null);

// ============================================================================
// Primitive Atoms - UI State
// ============================================================================

/**
 * Detects if the application is running inside an iframe.
 * Used to conditionally hide UI elements in embedded mode.
 * 
 * @example
 * ```tsx
 * const isInIframe = useAtomValue(isInIframeAtom);
 * ```
 */
export const isInIframeAtom = atom<boolean>(false);

// ============================================================================
// Derived Atoms - Computed Values
// ============================================================================

/**
 * Computed boolean indicating if splat data is available.
 * True when either legacy splatData exists or a refinementId is set
 * (the new RefinementSplat path discovers and loads splats lazily).
 * 
 * @example
 * ```tsx
 * const hasSplatData = useAtomValue(hasSplatDataAtom);
 * ```
 */
export const hasSplatDataAtom = atom(
  (get) => !!get(splatDataAtom) || !!get(refinementIdAtom)
);

/**
 * Computed boolean indicating if domain data has been loaded.
 * True when domainDataAtom is not null.
 * 
 * @example
 * ```tsx
 * const isDataLoaded = useAtomValue(isDataLoadedAtom);
 * ```
 */
export const isDataLoadedAtom = atom((get) => !!get(domainDataAtom));

/**
 * Extracts just the domainInfo object from the full domain data.
 * Returns null if domain data hasn't been loaded yet.
 * 
 * @example
 * ```tsx
 * const domainInfo = useAtomValue(domainInfoAtom);
 * if (domainInfo) {
 *   console.log('Domain name:', domainInfo.name);
 * }
 * ```
 */
export const domainInfoAtom = atom((get) => get(domainDataAtom)?.domainInfo ?? null);

/**
 * Extracts the domain ID from the loaded domain data.
 * Returns null if domain data hasn't been loaded yet.
 * 
 * @example
 * ```tsx
 * const domainId = useAtomValue(domainIdAtom);
 * ```
 */
export const domainIdAtom = atom((get) => get(domainDataAtom)?.domainInfo.id ?? null);

/**
 * Computed boolean indicating if point cloud data is available.
 * 
 * @example
 * ```tsx
 * const hasPointCloud = useAtomValue(hasPointCloudAtom);
 * ```
 */
export const hasPointCloudAtom = atom((get) => !!get(pointCloudDataAtom));

/**
 * Computed boolean indicating if navigation mesh data is available.
 * 
 * @example
 * ```tsx
 * const hasNavMesh = useAtomValue(hasNavMeshAtom);
 * ```
 */
export const hasNavMeshAtom = atom((get) => !!get(navMeshDataAtom));

/**
 * Computed boolean indicating if occlusion mesh data is available.
 * 
 * @example
 * ```tsx
 * const hasOcclusionMesh = useAtomValue(hasOcclusionMeshAtom);
 * ```
 */
export const hasOcclusionMeshAtom = atom((get) => !!get(occlusionMeshDataAtom));
