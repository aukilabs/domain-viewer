"use client";

/**
 * RefinementSplat.tsx — Composition (Scene Integration)
 *
 * Top-level component that ties the data loading hook to the SparkSplat renderer.
 * Drop this inside your R3F <Canvas> to render Gaussian splats for a refinement.
 *
 * Supports both partitioned (tiled LOD) and single-file splats, including
 * SOG compressed format. Data is loaded progressively — partitions appear
 * one by one as they download.
 *
 * Visibility is gated at the outer RefinementSplat level so that SplatContent
 * fully unmounts when hidden. This is critical: SparkJS transfers ArrayBuffers
 * into the GPU on first use (making them detached). Full unmount/remount ensures
 * fresh buffer copies are created from the React Query cache on re-enable,
 * preventing the "splat won't turn back on" bug.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { SparkRenderer, SplatMesh } from '@/components/3d/spark-r3f';
import { useRefinementSplat } from '@/hooks/useRefinementSplat';
import {
  domainDataAtom,
  domainDataItemsAtom,
  splatLoadingAtom,
} from '@/store/domainStore';
import { splatVisibleAtom } from '@/store/visualizationStore';
import type { SplatEffect } from '@/types/splat';

/** All available reveal animation effects */
const REVEAL_EFFECTS: SplatEffect[] = ['Magic'];

/** Pick a random reveal effect */
function randomRevealEffect(): SplatEffect {
  return REVEAL_EFFECTS[Math.floor(Math.random() * REVEAL_EFFECTS.length)];
}

// ── Inner content component ──────────────────────────────

function SplatContent({
  refinementId,
  allowReveal = true,
}: {
  refinementId: string;
  allowReveal?: boolean;
}) {
  const domainData = useAtomValue(domainDataAtom);
  const domainDataItems = useAtomValue(domainDataItemsAtom);
  const setSplatLoading = useSetAtom(splatLoadingAtom);
  const initialAllowRevealRef = useRef(allowReveal);
  const revealEffect = useMemo(
    () => (initialAllowRevealRef.current ? randomRevealEffect() : undefined),
    [],
  );

  const { data, isLoading, error } = useRefinementSplat({
    refinementId,
    domainServerUrl: domainData?.domainServerUrl ?? '',
    domainId: domainData?.domainInfo.id ?? '',
    accessToken: domainData?.domainAccessToken ?? '',
    domainDataItems,
  });

  useEffect(() => {
    setSplatLoading(isLoading);
  }, [isLoading, setSplatLoading]);

  const partitionBuffers = useMemo(() => {
    if (data?.type === 'partitions') {
      return data.partitions.map((p) => p.loadedData!.slice(0));
    }
    return [];
  }, [data]);

  const singleBuffer = useMemo(() => {
    if (data?.type === 'single' && data.buffer) {
      return data.buffer.slice(0);
    }
    return null;
  }, [data]);

  const hasRenderableData =
    (data?.type === 'partitions' && data.partitions.length > 0) ||
    data?.type === 'single';

  if (isLoading && !hasRenderableData) return null;
  if (error) {
    console.error('[RefinementSplat] Error loading splat:', error);
    return null;
  }
  if (!data) return null;

  // ── PARTITIONED SPLAT ──────────────────────────────────
  if (data.type === 'partitions') {
    return (
      <group>
        <SparkRenderer
          autoUpdate={false}
          sceneVersion={data.partitions.length}
        />
        {data.partitions.map((partition, i) => (
          <SplatMesh
            key={i}
            fileBytes={partitionBuffers[i]}
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
            revealEffect={revealEffect}
            frustumCulled={false}
          />
        ))}
      </group>
    );
  }

  // ── SINGLE-FILE SPLAT ──────────────────────────────────
  if (data.type === 'single' && singleBuffer && singleBuffer.byteLength > 0) {
    return (
      <group>
        <SparkRenderer autoUpdate={false} sceneVersion={0} />
        <SplatMesh
          fileBytes={singleBuffer}
          format={data.splatFileType}
          rotation={[Math.PI, 0, 0]}
          partitionSize={100}
          maxDistance={50}
          fadeDistance={4}
          revealEffect={revealEffect}
          frustumCulled={false}
        />
      </group>
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
  const visible = useAtomValue(splatVisibleAtom);
  const setSplatLoading = useSetAtom(splatLoadingAtom);
  const revealPlayedByRefinementRef = useRef<Record<string, boolean>>({});
  const allowReveal = !revealPlayedByRefinementRef.current[refinementId];

  useEffect(() => {
    if (visible && allowReveal) {
      revealPlayedByRefinementRef.current[refinementId] = true;
    }
  }, [visible, allowReveal, refinementId]);

  // When toggled off, ensure splatLoading is cleared so overlays don't hang.
  useEffect(() => {
    if (!visible) setSplatLoading(false);
  }, [visible, setSplatLoading]);

  // Visibility gate at this level: SplatContent fully unmounts when hidden.
  // This is intentional — SparkJS transfers ArrayBuffers to GPU on first use,
  // making them detached. Full unmount guarantees fresh copies on re-enable.
  if (!visible) return null;

  return (
    <Suspense fallback={null}>
      <SplatContent refinementId={refinementId} allowReveal={allowReveal} />
    </Suspense>
  );
}
