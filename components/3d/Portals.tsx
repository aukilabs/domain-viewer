"use client"

import { useGLTF } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import type { Portal } from "@/utils/posemeshClientApi"
import { matrixFromPose } from "@/utils/three-utils"

interface PortalsProps {
  portals: Portal[] | null | undefined
}

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

/**
 * Renders portal markers (QR codes) at specified positions and orientations.
 * Uses a 3D model loaded from QR.glb.
 * 
 * @param portals - Array of Portal objects containing position and orientation data
 */
export function Portals({ portals = [] }: PortalsProps) {
  const { scene: gltfScene } = useGLTF('/QR.glb')
  const { scene } = useThree()
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const matrix = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    if (!gltfScene || !portals || portals.length === 0) return

    // Create or update models for each portal
    portals.forEach(portal => {
      let model: THREE.Group
      
      if (modelsRef.current.has(portal.id)) {
        model = modelsRef.current.get(portal.id)!
      } else {
        model = gltfScene.clone()
        scene.add(model)
        modelsRef.current.set(portal.id, model)
      }

      // Set portal position and rotation
      if (matrixFromPose(portal, matrix)) {
        matrix.decompose(model.position, model.quaternion, model.scale)
        
        // Apply the reported size if available
        if (portal.reported_size) {
          const size = portal.reported_size * 0.01 // Convert to meters
          model.scale.setScalar(size)
        }
      }
    })

    // Cleanup removed portals
    modelsRef.current.forEach((model, id) => {
      if (!portals.find(p => p.id === id)) {
        scene.remove(model)
        disposeModel(model)
        modelsRef.current.delete(id)
      }
    })

    // Cleanup function
    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model)
        disposeModel(model)
      })
      modelsRef.current.clear()
    }
  }, [gltfScene, scene, portals, matrix])

  return null
}

// Preload the QR.glb model
useGLTF.preload('/QR.glb') 