"use client";

import { useEffect, useRef, useState } from "react";
import { useThree, useFrame, type ThreeElements } from "@react-three/fiber";
import type {
  SplatMesh as SparkNativeSplatMesh,
  SplatFileType,
} from "@sparkjsdev/spark";
import { Group, Vector3 } from "three";
import useInterval from "@/hooks/useInterval";
import { useSparkModule } from "./useSparkModule";
import { createSplatModifier } from "@/utils/splatShaders";
import type { SplatEffect } from "@/types/splat";

type SplatMeshProps = {
  fileBytes: ArrayBuffer;
  format: SplatFileType;
  partitionSize: number;
  maxDistance?: number;
  fadeDistance?: number;
  downsampleNth?: number;
  downsampleDistance?: number;
  downsampleSmoothing?: number;
  revealEffect?: SplatEffect;
  revealDuration?: number;
  revealTimeScale?: number;
} & Omit<ThreeElements["group"], "children">;

export function SplatMesh({
  fileBytes,
  format,
  partitionSize,
  maxDistance,
  fadeDistance,
  downsampleNth,
  downsampleDistance,
  downsampleSmoothing,
  revealEffect,
  revealDuration = 3,
  revealTimeScale = 2.5,
  ...groupProps
}: SplatMeshProps) {
  const { camera } = useThree();
  const sparkModule = useSparkModule();
  const isVisible = groupProps.visible ?? true;
  const [culled, setCulled] = useState<boolean>(false);
  const [splatMesh, setSplatMesh] = useState<SparkNativeSplatMesh | null>(null);
  const groupRef = useRef<Group | null>(null);

  const animateT = useRef(0);
  const animationComplete = useRef(false);
  const frameSkip = useRef(0);

  useEffect(() => {
    if (!sparkModule || !fileBytes || fileBytes.byteLength === 0 || !isVisible) return;

    let creationBytes: ArrayBuffer;
    try {
      // Spark can transfer/detach buffers; keep the prop buffer reusable across toggles.
      creationBytes = fileBytes.slice(0);
    } catch (error) {
      console.error("[SplatMesh] Failed to copy file bytes:", error);
      return;
    }

    let mesh: SparkNativeSplatMesh;
    try {
      mesh = new sparkModule.SplatMesh({
        fileBytes: creationBytes,
        editable: false,
        fileType: format as never,
      }) as SparkNativeSplatMesh;
    } catch (err) {
      console.error("[SplatMesh] Failed to create mesh:", err);
      return;
    }

    void mesh.initialized
      ?.then(() => {
        console.log("[SplatMesh] Mesh initialized", {
          isInitialized: mesh.isInitialized,
          numSplats: mesh.numSplats,
        });
      })
      .catch((error: unknown) => {
        console.error("[SplatMesh] Mesh initialization failed", error);
      });

    setSplatMesh((prev) => {
      prev?.dispose?.();
      return mesh;
    });

    animateT.current = 0;
    animationComplete.current = false;
    frameSkip.current = 0;

    return () => {
      mesh.dispose();
    };
  }, [fileBytes, format, sparkModule, isVisible]);

  useEffect(() => {
    if (isVisible) return;
    setSplatMesh((prev) => {
      prev?.dispose?.();
      return null;
    });
  }, [isVisible]);

  useEffect(() => {
    if (!splatMesh || !revealEffect) return;
    createSplatModifier(splatMesh, animateT, revealEffect);
  }, [splatMesh, revealEffect]);

  useFrame((_state, delta) => {
    if (!isVisible || !splatMesh || !revealEffect || animationComplete.current) return;

    animateT.current += delta * revealTimeScale;

    if (animateT.current >= revealDuration) {
      animationComplete.current = true;
      splatMesh.objectModifier = undefined;
      splatMesh.updateGenerator();
      return;
    }

    frameSkip.current++;
    if (frameSkip.current % 2 !== 0) return;

    splatMesh.updateGenerator();
  });

  useEffect(() => {
    if (!splatMesh) return;
    if (maxDistance && maxDistance > 0) splatMesh.setDistanceRange(0.001, maxDistance);
    if (fadeDistance && fadeDistance > 0) splatMesh.setFadeDistance(fadeDistance);
    if (downsampleDistance && downsampleDistance > 0)
      splatMesh.setDownsampling(
        downsampleDistance,
        downsampleNth || 2,
        downsampleSmoothing || 0.2,
      );
  }, [splatMesh, maxDistance, fadeDistance, downsampleNth, downsampleDistance, downsampleSmoothing]);

  const cullCheckIntervalMs = 80 + Math.floor(Math.random() * 20);
  useInterval(() => {
    if (!isVisible) return;
    if (splatMesh && groupRef.current && maxDistance && maxDistance > 0) {
      const splatCenter = new Vector3();
      groupRef.current.getWorldPosition(splatCenter);
      const distanceToCam = camera.position.distanceTo(splatCenter);
      const distanceToEdge = Math.max(
        distanceToCam - (partitionSize / 2) * Math.sqrt(2),
        0,
      );
      setCulled(distanceToEdge > maxDistance);
    }
  }, cullCheckIntervalMs);

  return (
    <group {...groupProps} ref={groupRef}>
      {splatMesh && !culled && isVisible && (
        <primitive object={splatMesh} dispose={null} />
      )}
    </group>
  );
}
