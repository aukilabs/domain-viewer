"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useGLTF, Text } from "@react-three/drei"
import { CustomGrid } from "./CustomGrid"
import { useEffect, useRef, useState, useMemo } from "react"
import * as THREE from "three"
import type { Portal } from "@/utils/posemeshClientApi"
import { matrixFromPose } from "@/utils/three-utils"
import { Portals } from "./3d/Portals"
import { OcclusionMesh } from "./3d/OcclusionMesh"
import { NavMesh } from "./3d/NavMesh"
import { CameraController } from "./3d/CameraController"
import { PointCloud } from "./3d/PointCloud"
import { DomainDevices } from "./3d/DomainDevices"
import { type DeviceData } from "./3d/DeviceUtils"

/**
 * Props for the main Viewer3D component
 */
interface Viewer3DProps {
  pointCloudData: ArrayBuffer | null
  portals?: Portal[] | null
  occlusionMeshData: ArrayBuffer | null
  navMeshData: ArrayBuffer | null
  portalsVisible?: boolean
  navMeshVisible?: boolean
  occlusionVisible?: boolean
  pointCloudVisible?: boolean
  scan3DVisible?: boolean
  domainDeviceData?: DeviceData[] | null
}

/**
 * Renders a 3D scan model from a GLB file.
 */
function Scan3D() {
  const { scene } = useThree()
  // const { scene: gltfScene } = useGLTF('/L10CommonSpace.glb')
  const { scene: gltfScene } = useGLTF('/lounge.glb')
  const modelRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!gltfScene) return

    // Clone the model to avoid modifying the cached original
    const model = gltfScene.clone()
    
    // Apply offset along Z axis
    model.position.set(1, 0, 2)
    
    // Add the model to the scene
    scene.add(model)
    modelRef.current = model

    return () => {
      if (modelRef.current) {
        scene.remove(model)
        disposeModel(model)
      }
    }
  }, [gltfScene, scene])

  return null
}

/**
 * Main 3D visualization component that renders the domain data using Three.js.
 * Handles rendering of point clouds, portals, navigation meshes, and occlusion meshes.
 */
export default function Viewer3D({ 
  pointCloudData, 
  portals = [], 
  occlusionMeshData, 
  navMeshData, 
  portalsVisible = true,
  navMeshVisible = true,
  occlusionVisible = true,
  pointCloudVisible = true,
  scan3DVisible = true,
  domainDeviceData = null
}: Viewer3DProps) {
  return (
    <div className="w-full h-full bg-[#131313]">
      <Canvas 
        camera={{ position: [15, 15, 15], fov: 50 }}
        gl={{ 
          // Enable proper color rendering
          outputColorSpace: THREE.SRGBColorSpace,
          // Enable proper alpha blending for textures
          premultipliedAlpha: false
        }}
      >
        <color attach="background" args={["#131313"]} />
        <ambientLight intensity={0.5} />
        <directionalLight intensity={0.5} position={[10, 100, 10]} />
        
        {/* Static elements */}
        <CustomGrid />
        
        {/* Conditional rendering based on visibility flags */}
        {pointCloudVisible && pointCloudData && (
          <PointCloud data={pointCloudData} />
        )}
        
        {portalsVisible && portals && (
          <Portals portals={portals} />
        )}
        
        {occlusionVisible && occlusionMeshData && (
          <OcclusionMesh occlusionMeshData={occlusionMeshData} />
        )}
        
        {navMeshVisible && navMeshData && (
          <NavMesh navMeshData={navMeshData} />
        )}
        
        {/* {scan3DVisible && (
          <Scan3D />
        )} */}
        
        {domainDeviceData && (
          <DomainDevices domainDeviceData={domainDeviceData} />
        )}
        
        <CameraController pointCloudData={pointCloudData} />
      </Canvas>
    </div>
  )
}

// useGLTF.preload('/L10CommonSpace.glb')
// useGLTF.preload('/lounge.glb')

/**
 * Helper function to dispose of Three.js model resources
 */
function disposeModel(model: THREE.Object3D) {
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose()
      }
      if (object.material instanceof THREE.Material) {
        object.material.dispose()
      } else if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose())
      }
    }
  })
}

