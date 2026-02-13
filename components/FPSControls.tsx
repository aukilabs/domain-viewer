"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef } from "react";
import { Vector3 } from "three";

interface FPSControlsProps {
  start: [number, number, number];
  makeDefault?: boolean;
  onExit?: () => void;
}

export default function FPSControls({
  start,
  makeDefault,
  onExit
}: FPSControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const exitedRef = useRef(false);

  const movement = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
  });

  useEffect(() => {
    camera.position.set(start[0], start[1], start[2]);
  }, [camera, start]);

  const doExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    try { document.exitPointerLock(); } catch { /* already unlocked */ }
    onExit?.();
  }, [onExit]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          movement.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          movement.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          movement.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          movement.current.right = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          movement.current.shift = true;
          break;
        case "Escape":
          // If pointer is not locked (overlay showing), exit FPS mode.
          // If pointer IS locked, the browser handles Escape to unlock;
          // we don't exit FPS mode—just show the overlay again.
          if (!document.pointerLockElement) {
            doExit();
          }
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          movement.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          movement.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          movement.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          movement.current.right = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          movement.current.shift = false;
          break;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [doExit]);

  useFrame((_, delta) => {
    const speed = (movement.current.shift ? 6 : 3) * delta;
    const dir = new Vector3();
    if (movement.current.forward) dir.z -= 1;
    if (movement.current.backward) dir.z += 1;
    if (movement.current.left) dir.x -= 1;
    if (movement.current.right) dir.x += 1;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const move = dir.applyQuaternion(camera.quaternion).multiplyScalar(speed);
      camera.position.add(move);
    }
    camera.position.y = start[1];
  });

  return <PointerLockControls ref={controlsRef} makeDefault={makeDefault} />;
}
