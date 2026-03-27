"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { ShaderMaterial, WebGLRenderer } from "three";
import useInterval from "@/hooks/useInterval";
import { useSparkModule } from "./useSparkModule";

type SparkRendererProps = {
  autoUpdate?: boolean;
  sceneVersion?: number;
};

export function SparkRenderer({
  autoUpdate = true,
  sceneVersion = 0,
}: SparkRendererProps) {
  const { gl, scene } = useThree();
  const sparkModule = useSparkModule();
  const sparkRendererRef = useRef<InstanceType<
    NonNullable<ReturnType<typeof useSparkModule>>["SparkRenderer"]
  > | null>(null);
  const prevSceneVersionRef = useRef<number>(-1);
  const savedPixelRatioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sparkModule) return;

    const glRenderer = gl as unknown as WebGLRenderer;
    savedPixelRatioRef.current = glRenderer.getPixelRatio();
    if (savedPixelRatioRef.current > 1.0) {
      glRenderer.setPixelRatio(1.0);
    }

    const renderer = new sparkModule.SparkRenderer({
      renderer: glRenderer,
      maxStdDev: Math.sqrt(5),
      minPixelRadius: 2,
    });
    renderer.autoUpdate = autoUpdate;
    sparkRendererRef.current = renderer;

    return () => {
      renderer.geometry?.dispose();
      (renderer.material as ShaderMaterial)?.dispose();
      (renderer as any).dispose?.();
      sparkRendererRef.current = null;
      if (savedPixelRatioRef.current !== null) {
        glRenderer.setPixelRatio(savedPixelRatioRef.current);
      }
    };
  }, [autoUpdate, gl, sparkModule]);

  useEffect(() => {
    const sr = sparkRendererRef.current;
    if (!sr) return;
    if (sceneVersion !== prevSceneVersionRef.current) {
      prevSceneVersionRef.current = sceneVersion;
      sr.update({ scene });
    }
  }, [sceneVersion, scene]);

  useInterval(() => {
    const sr = sparkRendererRef.current;
    if (sr && !sr.autoUpdate) {
      sr.update({ scene });
    }
  }, 100);

  return null;
}
