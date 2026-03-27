"use client";

/**
 * RefinementSplat.tsx — Composition (Scene Integration)
 *
 * Stays mounted while the domain/refinement is active and uses `visible` to hide.
 * This avoids replaying reveal animation when users toggle visibility on/off.
 * Buffer useMemos depend on useId() so each mount gets fresh copies (avoids
 * reusing detached buffers after refinement changes or Strict Mode remounts).
 */
import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { SparkRenderer, SplatMesh } from '@/components/3d/spark-r3f';
import { useRefinementSplat } from '@/hooks/useRefinementSplat';
import {
  domainDataAtom,
  domainDataItemsAtom,
  splatLoadingAtom,
} from '@/store/domainStore';
import type { SplatEffect } from '@/types/splat';

const DEFAULT_REVEAL_DURATION = 3;

const REVEAL_EFFECTS: SplatEffect[] = ['Magic'];

function randomRevealEffect(): SplatEffect {
  return REVEAL_EFFECTS[Math.floor(Math.random() * REVEAL_EFFECTS.length)];
}

// ── Inner content component ──────────────────────────────

function SplatContent({
  refinementId,
  visible,
  skipReveal = false,
  onRevealPlayed,
}: {
  refinementId: string;
  visible: boolean;
  skipReveal?: boolean;
  onRevealPlayed?: () => void;
}) {
  const domainData = useAtomValue(domainDataAtom);
  const domainDataItems = useAtomValue(domainDataItemsAtom);
  const setSplatLoading = useSetAtom(splatLoadingAtom);
  const revealEffectRef = useRef<SplatEffect>(randomRevealEffect());
  const instanceId = useId();
  const revealEffect = useMemo(
    () => (skipReveal ? undefined : revealEffectRef.current),
    [skipReveal],
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

  // instanceId ensures each mount (including Strict Mode remount) gets fresh
  // buffer copies; otherwise cached memos can hand detached buffers to Spark.
  const partitionBuffers = useMemo(() => {
    if (data?.type === 'partitions') {
      return data.partitions.map((p) => {
        try {
          return p.loadedData!.slice(0);
        } catch {
          return new ArrayBuffer(0);
        }
      });
    }
    return [];
  }, [data, instanceId]);

  const singleBuffer = useMemo(() => {
    if (data?.type === 'single' && data.buffer) {
      try {
        return data.buffer.slice(0);
      } catch {
        return null;
      }
    }
    return null;
  }, [data, instanceId]);

  const hasRenderableData =
    (data?.type === 'partitions' && data.partitions.length > 0) ||
    data?.type === 'single';

  useEffect(() => {
    if (!skipReveal && hasRenderableData && !isLoading) {
      onRevealPlayed?.();
    }
  }, [skipReveal, hasRenderableData, isLoading, onRevealPlayed]);

  if (isLoading && !hasRenderableData) return null;
  if (error) {
    console.error('[RefinementSplat] Error loading splat:', error);
    return null;
  }
  if (!data) return null;

  // ── PARTITIONED SPLAT ──────────────────────────────────
  if (data.type === 'partitions') {
    const sceneVersionBase = data.partitions.length;
    return (
      <group visible={visible}>
        <SparkRenderer
          autoUpdate={false}
          sceneVersion={sceneVersionBase * 10 + (visible ? 1 : 0)}
        />
        {data.partitions.map((partition, i) => (
          <SplatMesh
            key={i}
            fileBytes={partitionBuffers[i]}
            visible={visible}
            position={[
              (partition.partitionX + 0.5) * partition.partitionSize,
              0,
              (partition.partitionZ - 0.5) * partition.partitionSize,
            ]}
            rotation={[Math.PI, 0, 0]}
            format={partition.splatFileType}
            partitionSize={partition.partitionSize}
            maxDistance={partition.lodType === 'fine' ? 50 : 500}
            fadeDistance={partition.lodType === 'fine' ? 5 : 10}
            downsampleNth={partition.lodType === 'fine' ? 5 : 10}
            downsampleDistance={partition.lodType === 'fine' ? 30 : 200}
            downsampleSmoothing={partition.lodType === 'fine' ? 0.6 : 0.8}
            revealEffect={revealEffect}
            revealDuration={DEFAULT_REVEAL_DURATION}
            frustumCulled={false}
          />
        ))}
      </group>
    );
  }

  // ── SINGLE-FILE SPLAT ──────────────────────────────────
  if (data.type === 'single' && singleBuffer && singleBuffer.byteLength > 0) {
    return (
      <group visible={visible}>
        <SparkRenderer autoUpdate={false} sceneVersion={visible ? 1 : 0} />
        <SplatMesh
          fileBytes={singleBuffer}
          visible={visible}
          format={data.splatFileType}
          rotation={[Math.PI, 0, 0]}
          partitionSize={100}
          maxDistance={500}
          fadeDistance={10}
          revealEffect={revealEffect}
          revealDuration={DEFAULT_REVEAL_DURATION}
          frustumCulled={false}
        />
      </group>
    );
  }

  return null;
}

// ── Exported wrapper ─────────────────────────────────────
// Viewer3D keeps this mounted and passes visibility through `visible`.

export default function RefinementSplat({
  refinementId,
  visible,
}: {
  refinementId: string;
  visible: boolean;
}) {
  const [revealPlayed, setRevealPlayed] = useState(false);

  useEffect(() => {
    setRevealPlayed(false);
  }, [refinementId]);

  return (
    <Suspense fallback={null}>
      <SplatContent
        refinementId={refinementId}
        visible={visible}
        skipReveal={revealPlayed}
        onRevealPlayed={() => setRevealPlayed(true)}
      />
    </Suspense>
  );
}
