import { useQuery } from "@tanstack/react-query";
import { domainService } from "@/services/domainService";
import { DomainDataCollection } from "@/types/domain";

export interface UseDomainDataParams {
  domainId: string;
  posemeshClientId?: string;
  enabled?: boolean;
}

export interface UseDomainDataResult {
  data: DomainDataCollection | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

/**
 * React Query hook for loading complete domain data.
 * 
 * Wraps the domainService.loadAllDomainData() method and provides:
 * - Automatic caching of domain data
 * - Loading, error, and success states
 * - Retry logic with exponential backoff
 * - Stale-while-revalidate behavior
 * 
 * @param params - Hook parameters
 * @param params.domainId - Unique identifier of the domain to load
 * @param params.posemeshClientId - Optional client identifier for API tracking
 * @param params.enabled - Whether the query should run (default: true)
 * 
 * @returns Query result with data, loading, error, and success states
 * 
 * @example
 * ```tsx
 * function DomainViewer({ domainId }: { domainId: string }) {
 *   const { data, isLoading, isError, error } = useDomainData({ domainId });
 * 
 *   if (isLoading) return <LoadingSpinner />;
 *   if (isError) return <ErrorMessage error={error} />;
 *   if (!data) return null;
 * 
 *   return (
 *     <div>
 *       <h1>{data.domainData.domainInfo.name}</h1>
 *       <p>Portals: {data.portals.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDomainData({
  domainId,
  posemeshClientId,
  enabled = true,
}: UseDomainDataParams): UseDomainDataResult {
  const query = useQuery({
    queryKey: ["domain-data", domainId, posemeshClientId],
    queryFn: async () => {
      console.log("[useDomainData] Loading domain data:", {
        domainId,
        posemeshClientId,
      });

      const result = await domainService.loadAllDomainData(
        domainId,
        posemeshClientId
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to load domain data");
      }

      console.log("[useDomainData] Domain data loaded successfully:", {
        domainId,
        hasPortals: result.data!.portals.length > 0,
        hasNavMesh: !!result.data!.navMesh,
        hasOcclusionMesh: !!result.data!.occlusionMesh,
        hasPointCloud: !!result.data!.pointCloud,
        hasSplatData: !!result.data!.splatData,
      });

      return result.data!;
    },
    enabled: Boolean(enabled && domainId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
  };
}
