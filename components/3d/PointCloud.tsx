"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { plyAsyncParse } from "@/utils/ply-parser.web"

interface PointCloudProps {
  data: ArrayBuffer | null
}

/**
 * Renders a point cloud from PLY file data with vertex colors.
 * 
 * @param data - ArrayBuffer containing the PLY file data
 */
export function PointCloud({ data }: PointCloudProps) {
  const { scene } = useThree()
  const pointsRef = useRef<THREE.Points | null>(null)

  useEffect(() => {
    if (!data) return

    const cleanupRef = { current: () => {} }

    plyAsyncParse(data, true).then((geometry) => {
      const material = new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: true,
        opacity: 1,
        transparent: true,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)
      pointsRef.current = points
      
      // Define cleanup for this effect
      cleanupRef.current = () => {
        scene.remove(points)
        geometry.dispose()
        material.dispose()
      }
    }).catch(error => {
      console.error("Error parsing PLY data:", error)
    })

    return () => {
      cleanupRef.current()
    }
  }, [data, scene])

  return null
} 