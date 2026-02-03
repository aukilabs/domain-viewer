import { useQuery } from "@tanstack/react-query";
import { fileService } from "@/services/fileService";
import { DownloadOptions } from "@/types/domain";

export interface UseFileDownloadParams extends DownloadOptions {
  url: string;
  enabled?: boolean;
}

export interface UseFileDownloadResult {
  data: ArrayBuffer | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

/**
 * React Query hook for downloading files with retry logic and progress tracking.
 * 
 * Wraps the fileService.downloadFile() method and provides:
 * - Automatic caching of downloaded files
 * - Loading, error, and success states
 * - Retry logic with exponential backoff
 * - Progress tracking via callback
 * - Timeout and abort signal support
 * 
 * @param params - Hook parameters
 * @param params.url - The URL to download from
 * @param params.enabled - Whether the query should run (default: true)
 * @param params.maxRetries - Maximum number of retry attempts (default: 3)
 * @param params.timeout - Timeout in milliseconds (default: 60000)
 * @param params.onProgress - Progress callback function
 * @param params.signal - AbortSignal for cancellation
 * @param params.raw - Whether to return raw binary data
 * 
 * @returns Query result with data, loading, error, and success states
 * 
 * @example
 * ```tsx
 * function FileDownloader() {
 *   const [progress, setProgress] = useState({ loaded: 0, total: 0 });
 *   
 *   const { data, isLoading, isError, error } = useFileDownload({
 *     url: "https://example.com/file.bin",
 *     onProgress: (loaded, total) => setProgress({ loaded, total }),
 *   });
 * 
 *   if (isLoading) {
 *     const percent = progress.total > 0 
 *       ? (progress.loaded / progress.total * 100).toFixed(1)
 *       : 0;
 *     return <div>Downloading: {percent}%</div>;
 *   }
 *   
 *   if (isError) return <div>Error: {error?.message}</div>;
 *   if (!data) return null;
 * 
 *   return <div>Downloaded {data.byteLength} bytes</div>;
 * }
 * ```
 */
export function useFileDownload({
  url,
  enabled = true,
  maxRetries = 3,
  timeout = 60000,
  onProgress,
  signal,
  raw,
}: UseFileDownloadParams): UseFileDownloadResult {
  const query = useQuery({
    queryKey: ["file-download", url],
    queryFn: async () => {
      console.log("[useFileDownload] Downloading file:", { url });

      const arrayBuffer = await fileService.downloadFile(url, {
        maxRetries,
        timeout,
        onProgress,
        signal,
        raw,
      });

      console.log("[useFileDownload] File downloaded:", {
        url,
        size: arrayBuffer.byteLength,
        sizeKB: (arrayBuffer.byteLength / 1024).toFixed(2),
        sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      });

      return arrayBuffer;
    },
    enabled: Boolean(enabled && url),
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
