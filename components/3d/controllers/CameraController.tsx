"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useAtomValue } from "jotai";
import { pointCloudDataAtom } from "@/store/domainStore";
import { cameraControlModeAtom } from "@/store/camera-store";

/**
 * Controls camera behavior including auto-rotation when idle.
 * Reads point cloud data and control mode from Jotai atoms.
 */
export default function CameraController() {
  const pointCloudData = useAtomValue(pointCloudDataAtom);
  const controlMode = useAtomValue(cameraControlModeAtom);
  const { camera, controls, gl } = useThree();
  const [isIdle, setIsIdle] = useState(false);
  const idleAccumulator = useRef(0);
  const animationRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const previousControlMode = useRef(controlMode);

  const resetIdleTimer = () => {
    idleAccumulator.current = 0;
    setIsIdle(false);
  };

  useEffect(() => {
    // When switching from FPS to Map mode, we need to ensure the camera is upright
    // and looking at a valid target for the MapControls to work properly
    if (previousControlMode.current === "fps" && controlMode === "map") {
      // Reset camera up vector to ensure it's not tilted
      camera.up.set(0, 1, 0);

      // Calculate a target point in front of the camera
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const target = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(10));

      // Update the controls target if available
      if (controls && (controls as any).target) {
        (controls as any).target.copy(target);
        (controls as any).update?.();
      }
    }
    previousControlMode.current = controlMode;
  }, [controlMode, camera, controls]);

  // Debug logging removed for performance

  useEffect(() => {
    resetIdleTimer();
    if (pointCloudData && controls) {
      console.log("[CameraController] Forcing focus and enabling controls");
      // Force focus on the canvas to ensure keyboard inputs work immediately
      const canvas = gl.domElement;
      canvas.focus();

      // Explicitly enable controls
      (controls as any).enabled = true;
      (controls as any).update?.();
    }
  }, [pointCloudData, controls, gl]);

  useEffect(() => {
    if (!controls) return;

    const reset = () => resetIdleTimer();
    // @ts-ignore
    controls.addEventListener("change", reset);

    // Keep keydown for keyboard navigation that might not trigger 'change' immediately
    window.addEventListener("keydown", reset);

    return () => {
      // @ts-ignore
      controls.removeEventListener("change", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [controls]);

  useFrame((state, delta) => {
    // Disable auto-rotation in FPS mode
    if (controlMode === "fps") {
      idleAccumulator.current = 0;
      return;
    }

    // Only run idle detection if we have point cloud data
    if (!pointCloudData) return;

    // Accumulate idle time, but clamp delta to 0.1s to ignore lag spikes (e.g. loading)
    idleAccumulator.current += Math.min(delta, 0.1);

    if (!isIdle && idleAccumulator.current > 5) {
      // Get the current target from MapControls
      const target = (controls as any)?.target || new THREE.Vector3(0, 0, 0);
      targetRef.current.copy(target);

      // Calculate the current angle from camera position relative to target
      const offsetX = camera.position.x - targetRef.current.x;
      const offsetZ = camera.position.z - targetRef.current.z;
      const currentAngle = Math.atan2(offsetZ, offsetX);
      angleRef.current = currentAngle;
      setIsIdle(true);
    } else if (isIdle) {
      // Only perform rotation calculations when idle
      angleRef.current += 0.0015;
      const offsetX = camera.position.x - targetRef.current.x;
      const offsetZ = camera.position.z - targetRef.current.z;
      const radius = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);
      const y = camera.position.y;
      const x = targetRef.current.x + Math.cos(angleRef.current) * Math.max(5, radius);
      const z = targetRef.current.z + Math.sin(angleRef.current) * Math.max(5, radius);
      camera.position.set(x, y, z);
      camera.lookAt(targetRef.current);
      camera.updateProjectionMatrix();
    }
  });

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return null;
}
