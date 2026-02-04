"use client";

// React and hooks
import { useEffect, useMemo } from "react";

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

// Jotai atoms - domain store
import { domainDataAtom, splatDataAtom } from "@/store/domainStore";

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
  
  // Read domain data from atoms
  const domainData = useAtomValue(domainDataAtom);
  const splatData = useAtomValue(splatDataAtom);
  
  const [controlMode, setControlMode] = useAtom(cameraControlModeAtom);
  const fpsStart = useMemo<[number, number, number]>(() => [0, 1.8, 3], []);

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
        {splatVisible && splatData && domainData && (
          <SplatViewer
            domainServerUrl={domainData.domainServerUrl}
            domainId={domainData.domainInfo.id}
            fileId={splatData.fileId}
            accessToken={domainData.domainAccessToken}
            alignmentMatrix={splatData.alignmentMatrix}
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
