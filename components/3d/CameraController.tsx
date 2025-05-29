"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useRef, useState } from "react"
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface CameraControllerProps {
  pointCloudData: ArrayBuffer | null
}

/**
 * Controls camera behavior including auto-rotation when idle.
 * 
 * @param pointCloudData - Point cloud data used to determine if content is loaded
 */
export function CameraController({ pointCloudData }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [isIdle, setIsIdle] = useState(false)
  const lastInteractionTime = useRef(Date.now())
  const animationRef = useRef<number | null>(null)
  
  // Time before starting auto-rotation (ms)
  const IDLE_TIMEOUT = 5000

  const resetIdleTimer = () => {
    lastInteractionTime.current = Date.now()
    if (isIdle) {
      setIsIdle(false)
    }
  }

  const startOrbitAnimation = () => {
    if (controlsRef.current && !animationRef.current) {
      const animate = () => {
        if (controlsRef.current) {
          controlsRef.current.autoRotate = true
          controlsRef.current.update()
        }
        animationRef.current = requestAnimationFrame(animate)
      }
      animate()
    }
  }

  const stopOrbitAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false
    }
  }

  // Check for idle state in animation frame
  useFrame(() => {
    if (pointCloudData && !isIdle && 
        Date.now() - lastInteractionTime.current > IDLE_TIMEOUT) {
      setIsIdle(true)
      startOrbitAnimation()
    }
  })

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const handleStart = () => {
    resetIdleTimer()
    stopOrbitAnimation()
  }

  const handleEnd = () => {
    resetIdleTimer()
  }

  return (
    <OrbitControls
      ref={controlsRef}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      makeDefault
      autoRotateSpeed={0.5}
      enableDamping={true}
      dampingFactor={0.05}
      onStart={handleStart}
      onEnd={handleEnd}
      onChange={resetIdleTimer}
    />
  )
} 