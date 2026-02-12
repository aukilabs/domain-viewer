/**
 * spark-r3f.tsx — SparkRoot & SparkSplat (Recommended Renderer)
 *
 * Primary rendering layer for Gaussian splats using @sparkjsdev/spark.
 * Wraps the Spark engine into React Three Fiber components.
 *
 * - SparkRoot: Must be rendered ONCE inside the <Canvas> tree.
 *   Initialises the SparkRenderer and periodically updates the scene.
 *
 * - SparkSplat: Renders a single Gaussian splat. Can be instanced
 *   multiple times for partitioned splats.
 */
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group, Vector3, WebGLRenderer } from 'three';
import { SplatMesh, SparkRenderer, SplatFileType } from '@sparkjsdev/spark';
import useInterval from '@/hooks/useInterval';
import { createSplatModifier } from '@/utils/splatShaders';
import type { SplatEffect } from '@/types/splat';

// ── SparkRoot ────────────────────────────────────────────────────────────────

type SparkRootProps = {
  /** If false (recommended), calls spark.update() on an interval for you. */
  autoUpdate?: boolean;
  /** Bump this number when new SplatMesh objects are added to trigger an immediate update. */
  sceneVersion?: number;
};

export function SparkRoot({ autoUpdate = true, sceneVersion = 0 }: SparkRootProps) {
  const { gl, scene } = useThree();
  const prevSceneVersionRef = useRef<number>(0);

  const spark = useMemo(() => {
    const glRenderer = gl as unknown as WebGLRenderer;
    const pixelRatio = glRenderer.getPixelRatio();
    if (pixelRatio > 1.0) {
      glRenderer.setPixelRatio(1.0);
    }
    const s = new SparkRenderer({
      renderer: glRenderer,
      maxStdDev: Math.sqrt(5),
      minPixelRadius: 2,
    });
    s.autoUpdate = autoUpdate;
    return s;
  }, [autoUpdate]);

  useEffect(() => {
    if (sceneVersion > prevSceneVersionRef.current) {
      prevSceneVersionRef.current = sceneVersion;
      spark.update({ scene });
    }
  }, [sceneVersion, spark, scene]);

  // Periodic update when autoUpdate is off (polls every 100ms)
  useInterval(() => {
    if (!spark.autoUpdate) {
      spark.update({ scene });
    }
  }, 100);

  return null;
}

// ── SparkSplat ───────────────────────────────────────────────────────────────

type SparkSplatProps = {
  /** Raw binary splat data */
  fileBytes: ArrayBuffer;
  /** SplatFileType.SPLAT or SplatFileType.PCSOGSZIP */
  format: SplatFileType;
  /** World-space size of this partition tile (used for culling calculations) */
  partitionSize: number;
  /** Maximum render distance from camera. Tiles beyond this are culled. */
  maxDistance?: number;
  /** Distance over which the splat fades out before the max distance */
  fadeDistance?: number;
  /** Keep every Nth Gaussian when downsampling at distance */
  downsampleNth?: number;
  /** Distance at which downsampling begins */
  downsampleDistance?: number;
  /** Smoothing factor for the downsampling transition */
  downsampleSmoothing?: number;
  /** Reveal animation effect name. When set, the splat plays a reveal animation on load. */
  revealEffect?: SplatEffect;
  /** Duration of the reveal animation in seconds (default 10) */
  revealDuration?: number;
} & Omit<JSX.IntrinsicElements['group'], 'children'>;

export function SparkSplat({
  fileBytes,
  format,
  partitionSize,
  maxDistance,
  fadeDistance,
  downsampleNth,
  downsampleDistance,
  downsampleSmoothing,
  revealEffect,
  revealDuration = 10,
  ...groupProps
}: SparkSplatProps) {
  const { camera } = useThree();
  const [culled, setCulled] = useState<boolean>(false);
  const [splatMesh, setSplatMesh] = useState<SplatMesh | null>(null);
  const groupRef = useRef<Group | null>(null);

  // ── Reveal animation state ──────────────────────────────
  const animateT = useRef(0);
  const animationComplete = useRef(false);
  const frameSkip = useRef(0);

  // Create SplatMesh from raw bytes.
  // Always clone because SplatMesh transfers the buffer to a Web Worker
  // (detaching it), but React may re-run this effect with the same cached prop.
  // .slice(0) is a fast native memcpy (~1-2ms for 10 MB) and only runs once per load.
  useEffect(() => {
    if (!fileBytes || (fileBytes as any).detached) return;

    const mesh = new SplatMesh({ fileBytes: fileBytes.slice(0), editable: false, fileType: format });
    setSplatMesh((prev) => {
      prev?.dispose();
      return mesh;
    });

    // Reset animation when a new mesh is created
    animateT.current = 0;
    animationComplete.current = false;
    frameSkip.current = 0;

    return () => {
      mesh.dispose();
    };
  }, [fileBytes, format]);

  // Apply reveal effect modifier to the SplatMesh
  useEffect(() => {
    if (!splatMesh || !revealEffect) return;
    createSplatModifier(splatMesh, animateT, revealEffect);
  }, [splatMesh, revealEffect]);

  // Drive the reveal animation via the R3F render loop
  useFrame((_state, delta) => {
    if (!splatMesh || !revealEffect || animationComplete.current) return;

    // Frame-skip optimisation: update shader uniforms every 2nd frame
    frameSkip.current++;
    if (frameSkip.current % 2 !== 0) return;

    animateT.current += delta;
    splatMesh.updateGenerator();

    if (animateT.current >= revealDuration) {
      animationComplete.current = true;
    }
  });

  // Apply rendering parameters
  useEffect(() => {
    if (!splatMesh) return;

    if (maxDistance && maxDistance > 0) {
      splatMesh.setDistanceRange(0.001, maxDistance);
    }
    if (fadeDistance && fadeDistance > 0) {
      splatMesh.setFadeDistance(fadeDistance);
    }
    if (downsampleDistance && downsampleDistance > 0) {
      splatMesh.setDownsampling(
        downsampleDistance,
        downsampleNth || 2,
        downsampleSmoothing || 0.2
      );
    }
  }, [splatMesh, maxDistance, fadeDistance, downsampleNth, downsampleDistance, downsampleSmoothing]);

  const dispose = () => {
    setSplatMesh((prev) => {
      prev?.dispose();
      return null;
    });
  };

  // Distance-based frustum culling (randomised interval to avoid pop-in sync)
  const cullCheckIntervalMs = 80 + Math.floor(Math.random() * 20);
  useInterval(() => {
    if (splatMesh && groupRef.current && maxDistance && maxDistance > 0) {
      const splatCenter = new Vector3();
      groupRef.current.getWorldPosition(splatCenter);
      const distanceToCam = camera.position.distanceTo(splatCenter);
      const distanceToEdge = Math.max(distanceToCam - (partitionSize / 2) * Math.sqrt(2), 0);
      setCulled(distanceToEdge > maxDistance);
    }
  }, cullCheckIntervalMs);

  return (
    <group {...groupProps} dispose={dispose} ref={groupRef}>
      {splatMesh && !culled && <primitive object={splatMesh} />}
    </group>
  );
}
