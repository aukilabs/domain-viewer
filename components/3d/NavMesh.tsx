"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

interface NavMeshProps {
  navMeshData: ArrayBuffer | null
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
 * Renders the navigation mesh that represents walkable areas in the space.
 * 
 * @param navMeshData - ArrayBuffer containing the OBJ file data
 */
export function NavMesh({ navMeshData }: NavMeshProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!navMeshData) return

    const loader = new OBJLoader()
    const objString = new TextDecoder().decode(navMeshData)
    const obj = loader.parse(objString)
    
    // Create a group to hold all meshes
    const group = new THREE.Group()
    
    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({ 
            color: 0x2B4D2B,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          })
        )
        group.add(mesh)
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
  }, [navMeshData, scene])

  return null
} 