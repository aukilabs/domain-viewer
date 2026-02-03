import * as THREE from "three";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { checkWebGL2Support } from "@/utils/webgl-check";
import { useThree, useFrame } from "@react-three/fiber";
import { SplatMesh, SparkRenderer, SplatFileType } from "@sparkjsdev/spark";
import { useQuery } from "@tanstack/react-query";
import { createSplatModifier } from "@/utils/splatShaders";
import { measureAsync, measureSync } from "@/components/PerformanceMonitor";
import { useAtomValue } from "jotai";
import { splatVisibleAtom } from "@/store/visualizationStore";
import type { SplatEffect } from "@/types/splat";

interface LocalSplatViewerProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * Loads and renders a local gaussian splat file from the public directory.
 */
export default function LocalSplatViewer({
  url,
  position = [0, 0, 0],
  rotation = [-Math.PI, -Math.PI, 0],
  scale = 1,
}: LocalSplatViewerProps) {
  const [webgl2Supported, setWebgl2Supported] = useState(true);
  const { gl, scene } = useThree();
  const sparkRendererRef = useRef<SparkRenderer | null>(null);
  const sparkRendererInitialized = useRef(false);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animateT = useRef(0);
  const animationComplete = useRef(false);
  const frameSkip = useRef(0);
  const ANIMATION_DURATION = 10; // seconds
  
  // Available effects: Magic, Spread, Unroll, Twister, Rain
  const availableEffects: SplatEffect[] = ["Magic", "Spread", "Unroll"];
  
  // Choose a random effect on mount
  const [currentEffect] = useState<SplatEffect>(() => {
    const randomEffect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
    console.log("[LocalSplatViewer] Selected random effect:", randomEffect);
    return randomEffect;
  });

  // Get visibility state from store
  const splatVisible = useAtomValue(splatVisibleAtom);

  // Reset animation on mount or when visibility/effect changes
  useEffect(() => {
    console.log("[LocalSplatViewer] Component mounted - resetting animation with effect:", currentEffect);
    animateT.current = 0;
    animationComplete.current = false;
  }, [currentEffect, splatVisible]);

  useEffect(() => {
    const check = checkWebGL2Support();
    if (!check.supported) {
      console.warn("[LocalSplatViewer]", check.message);
      setWebgl2Supported(false);
    }
  }, []);

  // Fetch the local splat file
  const { data, isLoading, error } = useQuery({
    queryKey: ["local-splat", url],
    queryFn: async () => {
      console.log("[LocalSplatViewer] Fetching local splat:", url);
      
      return await measureAsync("LocalSplatViewer:fetchFile", async () => {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch local splat: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        console.log("[LocalSplatViewer] Local splat loaded:", {
          url,
          size: arrayBuffer.byteLength,
          sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
        });

        return arrayBuffer;
      });
    },
    enabled: Boolean(url && webgl2Supported && splatVisible),
    staleTime: Infinity, // Cache forever for local files
  });

  // Initialize SparkRenderer - only once
  useEffect(() => {
    if (!sparkRendererInitialized.current) {
      console.log("[LocalSplatViewer] Initializing SparkRenderer");
      const sparkRenderer = new SparkRenderer({
        renderer: gl,
        autoUpdate: true,
      });

      // Add SparkRenderer to the scene
      scene.add(sparkRenderer);
      sparkRendererRef.current = sparkRenderer;
      sparkRendererInitialized.current = true;
    }

    return () => {
      console.log("[LocalSplatViewer] Cleaning up SparkRenderer");
      if (sparkRendererRef.current) {
        try {
          // First remove any splat meshes
          if (splatMeshRef.current) {
            console.log("[LocalSplatViewer] Removing SplatMesh from cleanup");
            splatMeshRef.current.dispose();
            scene.remove(splatMeshRef.current);
            splatMeshRef.current = null;
          }
          // Then dispose GPU resources and remove the renderer
          if ('dispose' in sparkRendererRef.current && typeof sparkRendererRef.current.dispose === 'function') {
            sparkRendererRef.current.dispose();
          }
          scene.remove(sparkRendererRef.current);
          sparkRendererRef.current = null;
          sparkRendererInitialized.current = false;
        } catch (err) {
          console.error("[LocalSplatViewer] Error during SparkRenderer cleanup:", err);
        }
      }
    };
  }, [gl, scene]);

  // Animation loop for reveal effect - only runs during animation
  useFrame((state, delta) => {
    // Early return if not visible
    if (!splatVisible) return;

    if (splatMeshRef.current && !animationComplete.current) {
      // Frame skip optimization - only update every 3rd frame for local splats
      frameSkip.current++;
      if (frameSkip.current % 3 !== 0) return;

      animateT.current += delta;
      splatMeshRef.current.updateGenerator();
      
      // Stop updating once animation is complete
      if (animateT.current >= ANIMATION_DURATION) {
        animationComplete.current = true;
        console.log("[LocalSplatViewer] Reveal animation complete, stopping updates");
      }
    }
  });

  // Memoize splat configuration
  const splatConfig = useMemo(
    () => ({
      position,
      rotation,
      scale,
      url,
    }),
    [position, rotation, scale, url]
  );

  // Memoized setup function
  const setupSplatModifier = useCallback(
    (splatMesh: SplatMesh) => {
      measureSync("LocalSplatViewer:setupShader", () => {
        createSplatModifier(splatMesh, animateT, currentEffect);
      });
    },
    [currentEffect]
  );

  // Memoized load function
  const loadSplat = useCallback(
    async (data: ArrayBuffer, cancelledRef: { current: boolean }) => {
      try {
        // Determine file type from URL extension
        let fileType = SplatFileType.SPLAT;
        const fileTypeDetection = measureSync("LocalSplatViewer:detectFileType", () => {
          if (splatConfig.url.endsWith(".ply")) {
            return SplatFileType.PLY;
          } else if (splatConfig.url.endsWith(".spz")) {
            return SplatFileType.SPZ;
          }
          return SplatFileType.SPLAT;
        });
        fileType = fileTypeDetection;

        // Clone the ArrayBuffer to prevent detached buffer errors
        // This is necessary because the buffer may be transferred to a worker
        const clonedData = data.slice(0);

        // Create SplatMesh from the ArrayBuffer
        const splatMesh = new SplatMesh({
          fileBytes: clonedData,
          fileType: fileType,
        });

        // Wait for initialization
        await measureAsync("LocalSplatViewer:meshInit", async () => {
          await splatMesh.initialized;
        });

        // Check if cancelled after async operation
        if (cancelledRef.current) {
          console.log("[LocalSplatViewer] Load cancelled, disposing mesh");
          splatMesh.dispose();
          return;
        }

        console.log("[LocalSplatViewer] SplatMesh initialized");

        // Apply 180-degree rotation correction for SparkJS coordinate system
        splatMesh.rotation.y = Math.PI;

        // Apply transformations
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
          console.log("[LocalSplatViewer] Load cancelled before scene add, disposing mesh");
          splatMesh.dispose();
          return;
        }

        // Add to scene
        scene.add(splatMesh);
        splatMeshRef.current = splatMesh;

        // Setup reveal effect
        setupSplatModifier(splatMesh);

        console.log("[LocalSplatViewer] SplatMesh added to scene at position:", splatConfig.position, "with reveal effect");
      } catch (err) {
        console.error("[LocalSplatViewer] Error loading splat mesh:", err);
      }
    },
    [scene, splatConfig, setupSplatModifier]
  );

  // Load and render splat data
  useEffect(() => {
    if (!data || !sparkRendererRef.current) return;

    console.log("[LocalSplatViewer] Loading splat data:", data.byteLength, "bytes");

    let cancelled = false;
    const cancelledRef = { current: cancelled };

    // Await the async loading to ensure proper cleanup
    (async () => {
      await measureAsync("LocalSplatViewer:loadSplat", () => loadSplat(data, cancelledRef));
    })();

    return () => {
      // Set cancelled flag to prevent post-unmount additions
      cancelledRef.current = true;
      
      if (splatMeshRef.current) {
        console.log("[LocalSplatViewer] Cleanup: Removing and disposing SplatMesh");
        try {
          // Proper disposal order
          splatMeshRef.current.dispose();
          scene.remove(splatMeshRef.current);
          splatMeshRef.current = null;
          
          // Reset animation state
          animationComplete.current = false;
          animateT.current = 0;
        } catch (err) {
          console.error("[LocalSplatViewer] Error during cleanup:", err);
        }
      }
    };
  }, [data, scene, loadSplat]);

  if (!webgl2Supported) {
    console.warn("[LocalSplatViewer] WebGL2 not supported, skipping splat rendering");
    return null;
  }

  if (error) {
    console.error("[LocalSplatViewer] Error loading local splat:", error);
    return null;
  }

  if (isLoading || !data) {
    return null;
  }

  return null;
}
