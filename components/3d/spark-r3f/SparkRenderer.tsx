"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { WebGLRenderer } from "three";
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
  const prevSceneVersionRef = useRef<number>(-1);

  const sparkRenderer = useMemo(() => {
    if (!sparkModule) return null;

    const glRenderer = gl as unknown as WebGLRenderer;
    const pixelRatio = glRenderer.getPixelRatio();
    if (pixelRatio > 1.0) {
      glRenderer.setPixelRatio(1.0);
    }
    const renderer = new sparkModule.SparkRenderer({
      renderer: glRenderer,
      maxStdDev: Math.sqrt(5),
      minPixelRadius: 2,
    });
    renderer.autoUpdate = autoUpdate;
    return renderer;
  }, [autoUpdate, gl, sparkModule]);

  useEffect(() => {
    if (!sparkRenderer) return;
    if (sceneVersion > prevSceneVersionRef.current) {
      prevSceneVersionRef.current = sceneVersion;
      sparkRenderer.update({ scene });
    }
  }, [sceneVersion, scene, sparkRenderer]);

  useInterval(() => {
    if (sparkRenderer && !sparkRenderer.autoUpdate) {
      sparkRenderer.update({ scene });
    }
  }, 100);

  return null;
}
