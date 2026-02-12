/**
 * RefinementSplat.tsx — Composition (Scene Integration)
 *
 * Top-level component that ties the data loading hook to the SparkSplat renderer.
 * Drop this inside your R3F <Canvas> to render Gaussian splats for a refinement.
 *
 * Supports both partitioned (tiled LOD) and single-file splats, including
 * SOG compressed format. Data is loaded progressively — partitions appear
 * one by one as they download.
 */
import { Suspense } from 'react';
import { useAtomValue } from 'jotai';
import { SparkRoot, SparkSplat } from './spark-r3f';
import {
  useRefinementSplat,
  type ParsedPartition,
} from '@/hooks/useRefinementSplat';
import { SplatFileType } from '@sparkjsdev/spark';
import {
  domainDataAtom,
  domainDataItemsAtom,
} from '@/store/domainStore';
import { splatVisibleAtom } from '@/store/visualizationStore';
import type { SplatEffect } from '@/types/splat';

/** Default reveal animation effect applied to all splats */
const DEFAULT_REVEAL_EFFECT: SplatEffect = 'Spread';

// ── Inner content component ──────────────────────────────

function SplatContent({ refinementId }: { refinementId: string }) {
  const domainData = useAtomValue(domainDataAtom);
  const domainDataItems = useAtomValue(domainDataItemsAtom);
  const splatVisible = useAtomValue(splatVisibleAtom);

  const { data, isLoading, error } = useRefinementSplat({
    refinementId,
    domainServerUrl: domainData?.domainServerUrl ?? '',
    domainId: domainData?.domainInfo.id ?? '',
    accessToken: domainData?.domainAccessToken ?? '',
    domainDataItems,
  });

  // Respect visibility toggle
  if (!splatVisible) return null;

  const hasRenderableData =
    (data?.type === 'partitions' && data.partitions.length > 0) ||
    data?.type === 'single';

  if (isLoading && !hasRenderableData) {
    // Could render a loading indicator in 3D space here
    return null;
  }

  if (error) {
    console.error('[RefinementSplat] Error loading splat:', error);
    return null;
  }

  if (!data) return null;

  // ── PARTITIONED SPLAT ──────────────────────────────────
  if (data.type === 'partitions') {
    return (
      <>
        <SparkRoot autoUpdate={false} sceneVersion={data.partitions.length} />
        {data.partitions.map((partition, i) => (
          <SparkSplat
            key={i}
            fileBytes={partition.loadedData!}
            position={[
              (partition.partitionX + 0.5) * partition.partitionSize,
              0,
              (partition.partitionZ - 0.5) * partition.partitionSize,
            ]}
            rotation={[Math.PI, 0, 0]}
            format={partition.splatFileType}
            partitionSize={partition.partitionSize}
            maxDistance={partition.lodType === 'fine' ? 10 : 100}
            fadeDistance={partition.lodType === 'fine' ? 2 : 1}
            downsampleNth={partition.lodType === 'fine' ? 5 : 10}
            downsampleDistance={partition.lodType === 'fine' ? 6 : 30}
            downsampleSmoothing={partition.lodType === 'fine' ? 0.6 : 0.8}
            revealEffect={DEFAULT_REVEAL_EFFECT}
            frustumCulled={false}
          />
        ))}
      </>
    );
  }

  // ── SINGLE-FILE SPLAT ──────────────────────────────────
  if (data.type === 'single' && data.buffer && data.buffer.byteLength > 0) {
    return (
      <>
        <SparkRoot autoUpdate={false} sceneVersion={0} />
        <SparkSplat
          fileBytes={data.buffer}
          format={data.splatFileType}
          rotation={[Math.PI, 0, 0]}
          partitionSize={100}
          maxDistance={20}
          fadeDistance={4}
          revealEffect={DEFAULT_REVEAL_EFFECT}
          frustumCulled={false}
        />
      </>
    );
  }

  return null;
}

// ── Exported wrapper with Suspense ───────────────────────

export default function RefinementSplat({
  refinementId,
}: {
  refinementId: string;
}) {
  return (
    <Suspense fallback={null}>
      <SplatContent refinementId={refinementId} />
    </Suspense>
  );
}
