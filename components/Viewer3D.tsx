"use client";

// React and hooks
import { useEffect, useMemo, useRef, useState } from "react";

// Three.js and React Three Fiber
import { Canvas } from "@react-three/fiber";

// Jotai atoms - visualization store
import {
  portalsVisibleAtom,
  navMeshVisibleAtom,
  occlusionVisibleAtom,
  splatVisibleAtom,
} from "@/store/visualizationStore";

// Jotai atoms - camera store
import { cameraControlModeAtom } from "@/store/camera-store";

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
import SplatViewer from "./SplatViewer";
import LocalSplatViewer from "./LocalSplatViewer";

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
  const splatVisible = useAtomValue(splatVisibleAtom);
  
  const [controlMode, setControlMode] = useAtom(cameraControlModeAtom);
  const fpsStart = useMemo<[number, number, number]>(() => [0, 1.8, 3], []);
  const [splatMountKey, setSplatMountKey] = useState(0);
  const prevSplatVisible = useRef(splatVisible);

  // Track when splat visibility changes to force remount with animation
  useEffect(() => {
    // Only increment when transitioning from false to true (turning on)
    if (splatVisible && !prevSplatVisible.current) {
      setSplatMountKey(prev => prev + 1);
      console.log("[Viewer3D] Splat toggled ON - remounting with new key:", splatMountKey + 1);
    }
    prevSplatVisible.current = splatVisible;
  }, [splatVisible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && !isEmbed) {
        setControlMode((m) => {
          if (m === "fps") {
            document.exitPointerLock();
            return "map";
          }
          return "fps";
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEmbed, setControlMode]);

  return (
    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900 touch-none" tabIndex={0}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} gl={{ alpha: true }}>
        <Scene />
        {/* Point cloud hidden per user request */}
        {/* {pointCloudVisible && <PointCloudRenderer />} */}
        {portalsVisible && <PortalRenderer />}
        {occlusionVisible && <OcclusionMeshRenderer />}
        {navMeshVisible && <NavMeshRenderer />}
        {/* Regular SplatViewer hidden per user request - using LocalSplatViewer instead */}
        {/* {splatVisible && splatData && domainData && (
          <SplatViewer
            domainServerUrl={domainData.domainServerUrl}
            domainId={domainData.domainInfo.id}
            fileId={splatData.fileId}
            accessToken={domainData.domainAccessToken}
            alignmentMatrix={splatData.alignmentMatrix}
            onDataLoaded={setSplatArrayBuffer}
          />
        )} */}
        {/* Local splat - using downloaded file */}
        {splatVisible && (
          <LocalSplatViewer
            key={`local-splat-${splatMountKey}`}
            url="/splats/splat_b57a2941-a323-4146-9870-90c53ec7f47a_79ce4516-b132-4baa-8fd7-5c4374248c28_2026-01-30T04-27-18-412Z.splat"
            position={[5, 2, 0]}
            scale={1}
          />
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
    </div>
  );
}
