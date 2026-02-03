import { useQuery } from "@tanstack/react-query";

interface UseSplatDataParams {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  enabled?: boolean;
  visible?: boolean;
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
  visible = true,
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
    enabled: Boolean(enabled && visible && domainServerUrl && domainId && fileId && accessToken),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}
