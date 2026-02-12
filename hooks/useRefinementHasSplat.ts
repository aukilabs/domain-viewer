/**
 * useRefinementHasSplat — Existence Check Hook
 *
 * A lightweight check (no binary downloads) that tells you whether a given
 * refinement has splat data available. Useful for conditionally showing a
 * "View 3D" button or toggling splat visibility in the UI.
 */
import { useMemo } from 'react';
import type { DomainDataItem } from '@/types/domain';

/**
 * Check if splat data exists for a refinement.
 * Uses the domain data metadata list only (no binary downloads).
 *
 * @param domainDataItems  Array of metadata items from the domain server
 * @param refinementId     The refinement UUID to check
 * @returns boolean
 */
export function refinementHasSplat(
  domainDataItems: Array<{ name?: string; data_type?: string }>,
  refinementId: string
): boolean {
  if (!domainDataItems || !refinementId) return false;

  // Check single-file splat
  const singleSplatDataTypes = [
    'splat_data',
    'splat_data_sog',
    'refined_splat',
    'splat',
    'gaussian_splat',
  ];
  const splatNamePrefixes = ['refined_splat_', 'splat_', 'gaussian_splat_'];

  const hasSingle = domainDataItems.some(
    (item) =>
      item.data_type &&
      singleSplatDataTypes.includes(item.data_type) &&
      splatNamePrefixes.some(
        (prefix) => item.name === `${prefix}${refinementId}`
      )
  );
  if (hasSingle) return true;

  // Check partitioned splats
  const partitionSplatDataTypes = ['splat_partition', 'splat_partition_sog'];
  const partitionNameRegex = new RegExp(
    `^splat_partition_(full|coarse|fine)_(\\d+)_(-?\\d+)_(-?\\d+)_${refinementId}$`
  );
  return domainDataItems.some(
    (item) =>
      item.name &&
      item.data_type &&
      partitionSplatDataTypes.includes(item.data_type) &&
      partitionNameRegex.test(item.name)
  );
}

/**
 * React hook version — returns whether splat data exists for a given refinement.
 *
 * @param domainDataItems  Array of metadata items from the domain server
 * @param refinementId     The refinement UUID to check
 * @returns boolean — true if at least one splat entry exists
 */
export function useRefinementHasSplat(
  domainDataItems: DomainDataItem[],
  refinementId: string | null
): boolean {
  return useMemo(
    () => (refinementId ? refinementHasSplat(domainDataItems, refinementId) : false),
    [domainDataItems, refinementId]
  );
}
