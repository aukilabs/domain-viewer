import { useQuery } from "@tanstack/react-query";
import { fileService } from "@/services/fileService";
import { DownloadOptions } from "@/types/domain";

export interface UseDomainFileParams extends Omit<DownloadOptions, "raw"> {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  posemeshClientId: string;
  enabled?: boolean;
  raw?: boolean;
}

export interface UseDomainFileResult {
  data: ArrayBuffer | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

/**
 * React Query hook for downloading domain-specific files.
 * 
 * Wraps the fileService.downloadDomainFile() method and provides:
 * - Automatic caching of domain files
 * - Loading, error, and success states
 * - Retry logic with exponential backoff
 * - Progress tracking via callback
 * - Proper authentication headers
 * 
 * @param params - Hook parameters
 * @param params.domainServerUrl - Base URL of the domain server
 * @param params.domainId - Unique identifier of the domain
 * @param params.fileId - Unique identifier of the file to download
 * @param params.accessToken - Authentication token for the domain
 * @param params.posemeshClientId - Client identifier for API tracking
 * @param params.enabled - Whether the query should run (default: true)
 * @param params.raw - Whether to return raw binary data (default: true)
 * @param params.maxRetries - Maximum number of retry attempts (default: 3)
 * @param params.timeout - Timeout in milliseconds (default: 60000)
 * @param params.onProgress - Progress callback function
 * @param params.signal - AbortSignal for cancellation
 * 
 * @returns Query result with data, loading, error, and success states
 * 
 * @example
 * ```tsx
 * function NavMeshViewer({ domainData }: { domainData: DomainData }) {
 *   const { data, isLoading, isError } = useDomainFile({
 *     domainServerUrl: domainData.domainServerUrl,
 *     domainId: domainData.domainInfo.id,
 *     fileId: "navmesh-file-id",
 *     accessToken: domainData.domainAccessToken,
 *     posemeshClientId: "client-id",
 *   });
 * 
 *   if (isLoading) return <LoadingSpinner />;
 *   if (isError) return <ErrorMessage />;
 *   if (!data) return null;
 * 
 *   return <NavMeshRenderer data={data} />;
 * }
 * ```
 */
export function useDomainFile({
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  posemeshClientId,
  enabled = true,
  raw = true,
  maxRetries = 3,
  timeout = 60000,
  onProgress,
  signal,
}: UseDomainFileParams): UseDomainFileResult {
  const query = useQuery({
    queryKey: ["domain-file", domainId, fileId, raw],
    queryFn: async () => {
      console.log("[useDomainFile] Downloading domain file:", {
        domainId,
        fileId,
      });

      const arrayBuffer = await fileService.downloadDomainFile(
        domainServerUrl,
        domainId,
        fileId,
        accessToken,
        posemeshClientId,
        {
          raw,
          maxRetries,
          timeout,
          onProgress,
          signal,
        }
      );

      console.log("[useDomainFile] Domain file downloaded:", {
        domainId,
        fileId,
        size: arrayBuffer.byteLength,
        sizeKB: (arrayBuffer.byteLength / 1024).toFixed(2),
        sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      });

      return arrayBuffer;
    },
    enabled: Boolean(
      enabled &&
        domainServerUrl &&
        domainId &&
        fileId &&
        accessToken &&
        posemeshClientId
    ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: maxRetries,
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
