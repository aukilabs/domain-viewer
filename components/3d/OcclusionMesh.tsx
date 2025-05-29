"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

interface OcclusionMeshProps {
  occlusionMeshData: ArrayBuffer | null
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
 * Renders the occlusion mesh that represents physical barriers in the space.
 * 
 * @param occlusionMeshData - ArrayBuffer containing the OBJ file data
 */
export function OcclusionMesh({ occlusionMeshData }: OcclusionMeshProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!occlusionMeshData) return

    const loader = new OBJLoader()
    const objString = new TextDecoder().decode(occlusionMeshData)
    const obj = loader.parse(objString)
    
    // Create a group to hold all meshes
    const group = new THREE.Group()
    
    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create wireframe geometry
        const wireframe = new THREE.WireframeGeometry(child.geometry)
        const edges = new THREE.LineSegments(
          wireframe,
          new THREE.LineBasicMaterial({ color: 0x303030 })
        )

        // Create mesh with transparent faces
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({ 
            color: 0x808080,
            transparent: true,
            opacity: 0.8
          })
        )

        group.add(mesh)
        group.add(edges)
      }
    })

    scene.add(group)
    groupRef.current = group

    return () => {
      if (groupRef.current) {
        scene.remove(group)
        disposeModel(group)
      }
    }
  }, [occlusionMeshData, scene])

  return null
} 