import { useSplatData } from "@/hooks";
import * as THREE from "three";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { checkWebGL2Support } from "@/utils/webgl-check";
import { useThree, useFrame } from "@react-three/fiber";
import { SplatMesh, SparkRenderer, SplatFileType } from "@sparkjsdev/spark";
import { createSplatModifier } from "@/utils/splatShaders";
import { measureAsync, measureSync } from "@/components/PerformanceMonitor";
import { useAtomValue } from "jotai";
import { splatVisibleAtom } from "@/store/visualizationStore";
import type { SplatEffect } from "@/types/splat";

interface SplatViewerProps {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  alignmentMatrix?: number[] | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onDataLoaded?: (data: ArrayBuffer) => void;
}

/**
 * High-level Gaussian Splat viewer component using SparkJS.
 * Handles data fetching, loading states, and rendering.
 */
export default function SplatViewer({
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  alignmentMatrix,
  position,
  rotation,
  scale,
  onDataLoaded,
}: SplatViewerProps) {
  const [webgl2Supported, setWebgl2Supported] = useState(true);
  const { gl, scene } = useThree();
  const sparkRendererRef = useRef<SparkRenderer | null>(null);
  const sparkRendererInitialized = useRef(false);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animateT = useRef(0);
  const animationComplete = useRef(false);
  const frameSkip = useRef(0);
  const ANIMATION_DURATION = 10; // seconds
  const effectName: SplatEffect = "Spread";

  // Get visibility state from store
  const splatVisible = useAtomValue(splatVisibleAtom);

  useEffect(() => {
    const check = checkWebGL2Support();
    if (!check.supported) {
      console.warn("[SplatViewer]", check.message);
      setWebgl2Supported(false);
    }
  }, []);

  const { data, isLoading, error } = useSplatData({
    domainServerUrl,
    domainId,
    fileId,
    accessToken,
    enabled: Boolean(fileId && webgl2Supported),
    visible: splatVisible,
  });

  // Notify parent when data is loaded
  useEffect(() => {
    if (data && onDataLoaded) {
      onDataLoaded(data);
    }
  }, [data, onDataLoaded]);

  // Initialize SparkRenderer - only once
  useEffect(() => {
    if (!sparkRendererInitialized.current) {
      console.log("[SplatViewer] Initializing SparkRenderer");
      const sparkRenderer = new SparkRenderer({
        renderer: gl,
        autoUpdate: true,
      });
      
      // Add SparkRenderer to the scene (it's a THREE.Mesh)
      scene.add(sparkRenderer);
      sparkRendererRef.current = sparkRenderer;
      sparkRendererInitialized.current = true;
    }

    return () => {
      if (sparkRendererRef.current) {
        console.log("[SplatViewer] Disposing SparkRenderer");
        try {
          // Dispose GPU resources before removing from scene
          if ('dispose' in sparkRendererRef.current && typeof sparkRendererRef.current.dispose === 'function') {
            sparkRendererRef.current.dispose();
          }
          scene.remove(sparkRendererRef.current);
          sparkRendererRef.current = null;
          sparkRendererInitialized.current = false;
        } catch (err) {
          console.error("[SplatViewer] Error disposing SparkRenderer:", err);
        }
      }
    };
  }, [gl, scene]);

  // Reset animation state when visibility changes
  useEffect(() => {
    if (splatVisible) {
      animateT.current = 0;
      animationComplete.current = false;
    }
  }, [splatVisible]);

  // Animation loop for reveal effect - only runs during animation
  useFrame((state, delta) => {
    // Early return if not visible
    if (!splatVisible) return;

    if (splatMeshRef.current && !animationComplete.current) {
      // Frame skip optimization - only update every 2nd frame
      frameSkip.current++;
      if (frameSkip.current % 2 !== 0) return;

      animateT.current += delta;
      splatMeshRef.current.updateGenerator();
      
      // Stop updating once animation is complete
      if (animateT.current >= ANIMATION_DURATION) {
        animationComplete.current = true;
        console.log("[SplatViewer] Reveal animation complete, stopping updates");
      }
    }
  });

  // Memoize splat configuration
  const splatConfig = useMemo(
    () => ({
      alignmentMatrix,
      position,
      rotation,
      scale,
    }),
    [alignmentMatrix, position, rotation, scale]
  );

  // Memoized setup function
  const setupSplatModifier = useCallback(
    (splatMesh: SplatMesh) => {
      measureSync("SplatViewer:setupShader", () => {
        createSplatModifier(splatMesh, animateT, effectName);
      });
    },
    []
  );

  // Memoized load function
  const loadSplat = useCallback(
    async (data: ArrayBuffer, cancelledRef: { current: boolean }) => {
      try {
        // Clone the ArrayBuffer to prevent detached buffer errors
        // This is necessary because the buffer may be transferred to a worker
        const clonedData = data.slice(0);

        // Create SplatMesh from the ArrayBuffer
        const splatMesh = new SplatMesh({
          fileBytes: clonedData,
          fileType: SplatFileType.SPLAT, // Assuming .splat format
        });

        // Wait for initialization
        await measureAsync("SplatViewer:meshInit", async () => {
          await splatMesh.initialized;
        });

        // Check if cancelled after async operation
        if (cancelledRef.current) {
          console.log("[SplatViewer] Load cancelled, disposing mesh");
          splatMesh.dispose();
          return;
        }

        console.log("[SplatViewer] SplatMesh initialized");

        console.log("alignmentMatrix", splatConfig.alignmentMatrix);
        // Apply transformations
        if (splatConfig.alignmentMatrix) {
          const matrix = new THREE.Matrix4().fromArray(splatConfig.alignmentMatrix);
          splatMesh.applyMatrix4(matrix);
        }

        // Apply 180-degree rotation correction for SparkJS coordinate system
        splatMesh.rotation.z = Math.PI;
        splatMesh.rotation.y = Math.PI;

        if (splatConfig.position) {
          splatMesh.position.set(...splatConfig.position);
        }

        if (splatConfig.rotation) {
          // Add rotation on top of the 180-degree correction
          splatMesh.rotation.x += splatConfig.rotation[0];
          splatMesh.rotation.y += splatConfig.rotation[1];
          splatMesh.rotation.z += splatConfig.rotation[2];
        }

        if (splatConfig.scale !== undefined) {
          splatMesh.scale.setScalar(splatConfig.scale);
        }

        // Check if cancelled before adding to scene
        if (cancelledRef.current) {
          console.log("[SplatViewer] Load cancelled before scene add, disposing mesh");
          splatMesh.dispose();
          return;
        }

        // Add to scene
        scene.add(splatMesh);
        splatMeshRef.current = splatMesh;

        // Setup reveal effect
        setupSplatModifier(splatMesh);

        console.log("[SplatViewer] SplatMesh added to scene with reveal effect");
      } catch (err) {
        console.error("[SplatViewer] Error loading splat mesh:", err);
      }
    },
    [scene, splatConfig, setupSplatModifier]
  );

  // Load and render splat data
  useEffect(() => {
    if (!data || !sparkRendererRef.current) return;

    console.log("[SplatViewer] Loading splat data:", data.byteLength, "bytes");

    let cancelled = false;
    const cancelledRef = { current: cancelled };

    // Await the async loading to ensure proper cleanup
    (async () => {
      await measureAsync("SplatViewer:loadSplat", () => loadSplat(data, cancelledRef));
    })();

    return () => {
      // Set cancelled flag to prevent post-unmount additions
      cancelledRef.current = true;
      
      if (splatMeshRef.current) {
        console.log("[SplatViewer] Removing and disposing SplatMesh");
        try {
          // Proper disposal order
          splatMeshRef.current.dispose();
          scene.remove(splatMeshRef.current);
          splatMeshRef.current = null;
          
          // Reset animation state
          animationComplete.current = false;
          animateT.current = 0;
        } catch (err) {
          console.error("[SplatViewer] Error during cleanup:", err);
        }
      }
    };
  }, [data, scene, loadSplat]);

  if (!webgl2Supported) {
    console.warn("[SplatViewer] WebGL2 not supported, skipping splat rendering");
    return null;
  }

  if (error) {
    console.error("[SplatViewer] Error loading splat:", error);
    return null; // Silent failure - splat is optional
  }

  if (isLoading || !data) {
    return null; // Could add a loading indicator here if desired
  }

  return null;
}
