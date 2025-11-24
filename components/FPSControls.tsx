"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
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
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);

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

  const exitFPS = () => {
    if (controlsRef.current) {
      controlsRef.current.unlock();
    }
    onExit?.();
  };

  useEffect(() => {
    const canvas = gl.domElement as HTMLElement;
    if (controlsRef.current) {
      controlsRef.current.lock();
    }

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
          exitFPS();
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
      exitFPS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    camera.position.y = 1.8;
  });

  return <PointerLockControls ref={controlsRef} makeDefault={makeDefault} />;
}


