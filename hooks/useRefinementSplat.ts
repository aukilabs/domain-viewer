/**
 * useRefinementSplat — Data Loading Hook
 *
 * Responsible for:
 * 1. Querying domain data metadata to find splat entries for a given refinementId
 * 2. Downloading raw binary data (one file or multiple partitions)
 * 3. Progressively providing data to the renderer via React Query cache updates
 *
 * Supports both partitioned splats (with LOD: full/coarse/fine) and single-file splats,
 * including SOG compressed format (.sogs.zip).
 */
import { SplatFileType } from '@sparkjsdev/spark';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DomainDataItem } from '@/types/domain';

// ── Types ────────────────────────────────────────────────

/** Represents a parsed partition entry ready for rendering. */
export type ParsedPartition = {
  id: string;
  name: string;
  partitionSize: number;
  partitionX: number;
  partitionZ: number;
  splatFileType: SplatFileType;
  lodType: 'full' | 'coarse' | 'fine';
  loadedData: ArrayBuffer | null; // populated when downloaded
};

/** Return type of the hook — either partitioned or single-file data. */
export type RefinementSplatData =
  | { type: 'partitions'; partitions: ParsedPartition[] }
  | { type: 'single'; buffer: ArrayBuffer; splatFileType: SplatFileType }
  | null;

// ── Helper ───────────────────────────────────────────────

export function dataTypeToSplatFileType(dataType: string): SplatFileType {
  if (dataType === 'splat_partition_sog' || dataType === 'splat_data_sog') {
    return SplatFileType.PCSOGSZIP;
  }
  return SplatFileType.SPLAT;
}

// ── Hook ─────────────────────────────────────────────────

interface UseRefinementSplatParams {
  /** The refinement UUID (canonical refinement from domain metadata) */
  refinementId: string;
  /** Base URL of the domain server */
  domainServerUrl: string;
  /** Domain UUID */
  domainId: string;
  /** Authentication token */
  accessToken: string;
  /** Array of domain data items (metadata list from the server) */
  domainDataItems: DomainDataItem[];
}

/**
 * Loads Gaussian splat data for a given refinement.
 *
 * The hook returns a React Query result whose `data` is either:
 *   • `{ type: 'partitions', partitions: ParsedPartition[] }` — tiled splat
 *   • `{ type: 'single', buffer: ArrayBuffer, splatFileType }` — single file
 *   • `null` — no splat found
 */
export function useRefinementSplat({
  refinementId,
  domainServerUrl,
  domainId,
  accessToken,
  domainDataItems,
}: UseRefinementSplatParams) {
  const queryClient = useQueryClient();
  const queryKey = ['refinement-splat', refinementId, domainId];

  return useQuery<RefinementSplatData>({
    queryKey,
    queryFn: async (): Promise<RefinementSplatData> => {
      if (!domainDataItems || domainDataItems.length === 0) {
        return null;
      }

      // ─── LOOK FOR PARTITIONED SPLATS ──────────────────────
      const partitionDataTypes = ['splat_partition', 'splat_partition_sog'];
      const nameRegex = new RegExp(
        `^splat_partition_(full|coarse|fine)_(\\d+)_(-?\\d+)_(-?\\d+)_${refinementId}$`
      );

      const partitionDomainData = domainDataItems.filter(
        (item) =>
          item.name &&
          item.data_type &&
          partitionDataTypes.includes(item.data_type) &&
          nameRegex.test(item.name)
      );

      // Parse each into a ParsedPartition
      let partitions: ParsedPartition[] = partitionDomainData
        .map((item) => {
          const match = item.name.match(nameRegex);
          if (!match || match.length !== 5) return null;
          return {
            id: item.id,
            name: item.name,
            partitionSize: parseInt(match[2], 10),
            partitionX: parseInt(match[3], 10),
            partitionZ: parseInt(match[4], 10),
            splatFileType: dataTypeToSplatFileType(item.data_type),
            lodType: match[1] as 'full' | 'coarse' | 'fine',
            loadedData: null,
          };
        })
        .filter(Boolean) as ParsedPartition[];

      // LOD selection: prefer coarse+fine; fallback to full
      const coarse = partitions.filter((p) => p.lodType === 'coarse');
      const fine = partitions.filter((p) => p.lodType === 'fine');
      const full = partitions.filter((p) => p.lodType === 'full');

      if (coarse.length > 0 || fine.length > 0) {
        partitions = [...coarse, ...fine];
      } else {
        partitions = [...full];
      }

      // Download each partition sequentially (progressive loading)
      if (partitions.length > 0) {
        const loadedPartitions: ParsedPartition[] = [];

        for (const partition of partitions) {
          try {
            const resp = await fetch(
              `${domainServerUrl}/api/v1/domains/${domainId}/data/${partition.id}?raw=true`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'User-Agent': 'domain-viewer',
                },
              }
            );

            if (!resp.ok) {
              console.warn(
                `[useRefinementSplat] Failed to download partition ${partition.name}: ${resp.statusText}`
              );
              continue;
            }

            partition.loadedData = await resp.arrayBuffer();
            loadedPartitions.push(partition);

            // Progressive update: update cache so UI renders tiles as they load
            queryClient.setQueryData<RefinementSplatData>(queryKey, {
              type: 'partitions',
              partitions: [...loadedPartitions],
            });
          } catch (err) {
            console.error(
              `[useRefinementSplat] Error downloading partition ${partition.name}:`,
              err
            );
          }
        }

        if (loadedPartitions.length > 0) {
          return { type: 'partitions' as const, partitions: loadedPartitions };
        }
      }

      // ─── FALLBACK: LOOK FOR SINGLE-FILE SPLAT ─────────────
      const singleSplatDataTypes = [
        'splat_data',
        'splat_data_sog',
        'refined_splat',
        'splat',
        'gaussian_splat',
      ];
      const splatNamePrefixes = ['refined_splat_', 'splat_', 'gaussian_splat_'];

      const splatItem = domainDataItems.find(
        (item) =>
          item.data_type &&
          singleSplatDataTypes.includes(item.data_type) &&
          splatNamePrefixes.some(
            (prefix) => item.name === `${prefix}${refinementId}`
          )
      );

      if (!splatItem) {
        console.log(
          `[useRefinementSplat] No splat data found for refinement ${refinementId}`
        );
        return null;
      }

      console.log(
        `[useRefinementSplat] Downloading single-file splat: ${splatItem.name}`
      );

      const resp = await fetch(
        `${domainServerUrl}/api/v1/domains/${domainId}/data/${splatItem.id}?raw=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'domain-viewer',
          },
        }
      );

      if (!resp.ok) {
        throw new Error(
          `Failed to download splat ${splatItem.name}: ${resp.statusText}`
        );
      }

      const buffer = await resp.arrayBuffer();

      console.log(
        `[useRefinementSplat] Splat loaded: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`
      );

      return {
        type: 'single' as const,
        buffer,
        splatFileType: dataTypeToSplatFileType(splatItem.data_type),
      };
    },
    enabled: Boolean(
      refinementId && domainServerUrl && domainId && accessToken && domainDataItems?.length
    ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}
