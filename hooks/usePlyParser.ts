import { useQuery } from "@tanstack/react-query";
import { plyAsyncParse } from "@/utils/ply-parser.web";
import * as THREE from "three";

export interface UsePlyParserParams {
  data: ArrayBuffer | string | null | undefined;
  threaded?: boolean;
  enabled?: boolean;
}

export interface UsePlyParserResult {
  geometry: THREE.BufferGeometry | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

/**
 * React Query hook for parsing PLY (Polygon File Format) data into Three.js geometry.
 * 
 * Wraps the plyAsyncParse utility and provides:
 * - Automatic caching of parsed geometry
 * - Loading, error, and success states
 * - Optional Web Worker threading for better performance
 * - Retry logic for parsing failures
 * 
 * This hook is particularly useful for parsing point cloud data downloaded from
 * domain servers. The parsed geometry can be directly used in Three.js renderers.
 * 
 * @param params - Hook parameters
 * @param params.data - PLY data as ArrayBuffer or string to parse
 * @param params.threaded - Whether to use Web Worker for parsing (default: false)
 * @param params.enabled - Whether the query should run (default: true)
 * 
 * @returns Query result with parsed geometry, loading, error, and success states
 * 
 * @example
 * ```tsx
 * function PointCloudRenderer() {
 *   // First fetch the PLY data
 *   const { data: plyData } = useDomainFile({
 *     domainServerUrl,
 *     domainId,
 *     fileId: "pointcloud-file-id",
 *     accessToken,
 *     posemeshClientId,
 *   });
 * 
 *   // Then parse it into Three.js geometry
 *   const { geometry, isLoading, isError } = usePlyParser({
 *     data: plyData,
 *     threaded: true,
 *   });
 * 
 *   if (isLoading) return <LoadingSpinner />;
 *   if (isError) return <ErrorMessage />;
 *   if (!geometry) return null;
 * 
 *   return (
 *     <points>
 *       <primitive object={geometry} attach="geometry" />
 *       <pointsMaterial size={0.01} vertexColors />
 *     </points>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Combined with useDomainData for full pipeline
 * function PointCloudViewer({ domainId }: { domainId: string }) {
 *   const { data: domainData } = useDomainData({ domainId });
 *   const pointCloudData = domainData?.pointCloud;
 *   
 *   const { geometry, isLoading } = usePlyParser({
 *     data: pointCloudData,
 *     threaded: true,
 *     enabled: !!pointCloudData,
 *   });
 * 
 *   return geometry ? <PointCloud geometry={geometry} /> : null;
 * }
 * ```
 */
export function usePlyParser({
  data,
  threaded = false,
  enabled = true,
}: UsePlyParserParams): UsePlyParserResult {
  const query = useQuery({
    queryKey: ["ply-parser", data, threaded],
    queryFn: async () => {
      if (!data) {
        throw new Error("No PLY data provided for parsing");
      }

      console.log("[usePlyParser] Parsing PLY data:", {
        dataType: typeof data,
        size: data instanceof ArrayBuffer ? data.byteLength : data.length,
        threaded,
      });

      const startTime = performance.now();
      const geometry = await plyAsyncParse(data, threaded);
      const parseTime = performance.now() - startTime;

      console.log("[usePlyParser] PLY data parsed successfully:", {
        parseTime: `${parseTime.toFixed(2)}ms`,
        vertexCount: geometry.attributes.position?.count || 0,
        hasNormals: !!geometry.attributes.normal,
        hasColors: !!geometry.attributes.color,
        hasUVs: !!geometry.attributes.uv,
        threaded,
      });

      return geometry;
    },
    enabled: Boolean(enabled && data),
    staleTime: Infinity, // Parsed geometry never goes stale (immutable data)
    retry: 2,
    retryDelay: 1000,
  });

  return {
    geometry: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
  };
}
