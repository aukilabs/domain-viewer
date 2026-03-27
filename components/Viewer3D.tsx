"use client";

// React and hooks
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Three.js and React Three Fiber
import { Canvas } from "@react-three/fiber";

// Jotai atoms - camera store
import { cameraControlModeAtom } from "@/store/camera-store";

// Jotai atoms - domain store
import { domainDataAtom, domainIdAtom, refinementIdAtom, splatLoadingAtom } from "@/store/domainStore";
// Jotai atoms - visibility
import { splatVisibleAtom } from "@/store/visualizationStore";

// Jotai hooks
import { useAtom, useAtomValue, useSetAtom } from "jotai";

// Local components - Scene and controllers
import Scene from "./3d/Scene";
import CameraController from "./3d/controllers/CameraController";

// Local components - Renderers
import {
  PointCloudRenderer,
  PortalRenderer,
  NavMeshRenderer,
  OcclusionMeshRenderer,
} from "./3d/renderers";

// Other components
import FPSControls from "./FPSControls";
import { PersistedMapControls } from "./PersistedMapControls";

// Analytics
import { useAnalytics } from "@/hooks/useAnalytics";

// Spark touches `navigator` at module scope; keep it out of server rendering paths.
const RefinementSplat = dynamic(() => import("./3d/RefinementSplat"), {
  ssr: false,
});

interface Viewer3DProps {
  isEmbed?: boolean;
}

/**
 * Main 3D visualization component that renders the domain data using Three.js.
 * Handles rendering of point clouds, portals, navigation meshes, and occlusion meshes.
 * Each renderer reads its own visibility atom directly so that toggling one
 * layer never re-renders another.
 */
export default function Viewer3D({ isEmbed = false }: Viewer3DProps) {
  // Read domain data and splat visibility from atoms
  const domainData = useAtomValue(domainDataAtom);
  const domainId = useAtomValue(domainIdAtom);
  const refinementId = useAtomValue(refinementIdAtom);
  const splatVisible = useAtomValue(splatVisibleAtom);
  const setSplatLoading = useSetAtom(splatLoadingAtom);

  // When splat is hidden, clear loading state so overlay does not hang
  useEffect(() => {
    if (!splatVisible) setSplatLoading(false);
  }, [splatVisible, setSplatLoading]);

  const [controlMode, setControlMode] = useAtom(cameraControlModeAtom);
  const controlModeRef = useMemo(() => ({ current: controlMode }), [controlMode]);
  const fpsStart = useMemo<[number, number, number]>(() => [0, 1.6, 3], []);

  // Analytics
  const { trackViewerInteractionStarted, trackCameraModeSwitched } = useAnalytics();
  const interactionFiredRef = useRef<string | null>(null);

  // Fire viewer_interaction_started once per domain load
  useEffect(() => {
    if (!domainId) return;
    // Reset when domain changes
    interactionFiredRef.current = null;
  }, [domainId]);

  const handleFirstInteraction = useCallback(() => {
    if (!domainId || interactionFiredRef.current === domainId) return;
    interactionFiredRef.current = domainId;
    trackViewerInteractionStarted(domainId, controlModeRef.current);
  }, [domainId, controlModeRef, trackViewerInteractionStarted]);

  // Track whether the pointer is currently locked (for overlay visibility)
  const [pointerLocked, setPointerLocked] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && !isEmbed) {
        const fromMode = controlModeRef.current;
        const toMode = fromMode === "fps" ? "map" : "fps";
        if (fromMode === "fps") {
          document.exitPointerLock();
        }
        setControlMode(toMode);
        if (domainId) {
          trackCameraModeSwitched(domainId, fromMode, toMode);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEmbed, setControlMode, controlModeRef, domainId, trackCameraModeSwitched]);

  const handleOverlayClick = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.requestPointerLock();
    }
  }, []);

  const showOverlay = controlMode === "fps" && !pointerLocked;

  return (
    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900 touch-none relative" tabIndex={0} onPointerDown={handleFirstInteraction} onWheel={handleFirstInteraction}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} gl={{ alpha: true, preserveDrawingBuffer: true }}>
        <Scene />
        <PointCloudRenderer />
        <PortalRenderer />
        <OcclusionMeshRenderer />
        <NavMeshRenderer />
        {refinementId && domainData && (
          <RefinementSplat refinementId={refinementId} visible={splatVisible} />
        )}
        {controlMode === "fps" ? (
          <>
            {/* SkyBox removed to preserve color theme */}
            <FPSControls start={fpsStart} makeDefault onExit={() => setControlMode("map")} />
          </>
        ) : (
          <PersistedMapControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            enableDamping={true}
            dampingFactor={0.05}
            onStart={() => { }}
            onEnd={() => { }}
            onChange={() => { }}
          />
        )}
        <CameraController />
      </Canvas>

      {/* Click-to-lock overlay — shown when in FPS mode but pointer isn't locked yet */}
      {showOverlay && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 cursor-pointer select-none"
          onClick={handleOverlayClick}
        >
          {/* Crosshair */}
          <svg width="48" height="48" viewBox="0 0 48 48" className="mb-4 text-white opacity-80">
            <line x1="24" y1="8" x2="24" y2="20" stroke="currentColor" strokeWidth="2" />
            <line x1="24" y1="28" x2="24" y2="40" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="2" />
            <line x1="28" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2" />
            <circle cx="24" cy="24" r="2" fill="currentColor" />
          </svg>

          <p className="text-white text-lg font-medium mb-2">Click to enter first-person mode</p>
          <div className="flex gap-4 text-white/70 text-sm">
            <span><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">W A S D</kbd> Move</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Mouse</kbd> Look</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Shift</kbd> Sprint</span>
          </div>
          <p className="mt-3 text-white/50 text-xs">
            Press <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs font-mono">F</kbd> or <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs font-mono">Esc</kbd> to exit
          </p>
        </div>
      )}
    </div>
  );
}
