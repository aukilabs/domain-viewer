"use client";

// React and hooks
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Three.js and React Three Fiber
import { Canvas } from "@react-three/fiber";

// Jotai atoms - visualization store
import {
  portalsVisibleAtom,
  navMeshVisibleAtom,
  occlusionVisibleAtom,
} from "@/store/visualizationStore";

// Jotai atoms - camera store
import { cameraControlModeAtom } from "@/store/camera-store";

// Jotai atoms - domain store
import { domainDataAtom, splatDataAtom, refinementIdAtom } from "@/store/domainStore";

// Jotai hooks
import { useAtom, useAtomValue } from "jotai";

// Local components - Scene and controllers
import Scene from "./3d/Scene";
import CameraController from "./3d/controllers/CameraController";

// Local components - Renderers
import {
  PortalRenderer,
  NavMeshRenderer,
  OcclusionMeshRenderer,
} from "./3d/renderers";

// Other components
import FPSControls from "./FPSControls";
import { PersistedMapControls } from "./PersistedMapControls";

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
 * All data and visibility states are managed through Jotai atoms.
 */
export default function Viewer3D({ isEmbed = false }: Viewer3DProps) {
  // Read visibility states from atoms
  const portalsVisible = useAtomValue(portalsVisibleAtom);
  const navMeshVisible = useAtomValue(navMeshVisibleAtom);
  const occlusionVisible = useAtomValue(occlusionVisibleAtom);
  
  // Read domain data from atoms
  const domainData = useAtomValue(domainDataAtom);
  const splatData = useAtomValue(splatDataAtom);
  const refinementId = useAtomValue(refinementIdAtom);
  
  const [controlMode, setControlMode] = useAtom(cameraControlModeAtom);
  const controlModeRef = useMemo(() => ({ current: controlMode }), [controlMode]);
  const fpsStart = useMemo<[number, number, number]>(() => [0, 1.6, 3], []);

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
        if (controlModeRef.current === "fps") {
          document.exitPointerLock();
          setControlMode("map");
        } else {
          setControlMode("fps");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEmbed, setControlMode, controlModeRef]);

  const handleOverlayClick = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.requestPointerLock();
    }
  }, []);

  const showOverlay = controlMode === "fps" && !pointerLocked;

  return (
    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900 touch-none relative" tabIndex={0}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} gl={{ alpha: true }}>
        <Scene />
        {/* Point cloud hidden per user request */}
        {/* {pointCloudVisible && <PointCloudRenderer />} */}
        {portalsVisible && <PortalRenderer />}
        {occlusionVisible && <OcclusionMeshRenderer />}
        {navMeshVisible && <NavMeshRenderer />}
        {refinementId && domainData && (
          <RefinementSplat refinementId={refinementId} />
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
