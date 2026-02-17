"use client";

import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore } from "jotai";
import React, { useEffect, useRef } from "react";
import { cameraPoseAtom } from "@/store/camera-store";

export function PersistedMapControls(
  props: React.ComponentProps<typeof MapControls>
) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const jotaiStore = useStore();
  const frameCount = useRef(0);
  const SAVE_INTERVAL = 30; // Save every 30 frames (~0.5 seconds at 60fps)

  const storedPoseRef = React.useRef<
    import("@/store/camera-store").CameraPose | null
  >(jotaiStore.get(cameraPoseAtom));

  useEffect(() => {
    const pose = storedPoseRef.current;
    if (pose?.target && pose.target.length === 3 && controlsRef.current) {
      (controlsRef.current as any).target.fromArray(pose.target);
      controlsRef.current.update?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throttle camera state saving to reduce performance overhead
  useFrame(() => {
    if (!controlsRef.current) return;
    
    frameCount.current++;
    if (frameCount.current < SAVE_INTERVAL) return;
    frameCount.current = 0;
    
    const pose = {
      position: camera.position.toArray() as [number, number, number],
      quaternion: camera.quaternion.toArray() as [
        number,
        number,
        number,
        number
      ],
      zoom: (camera as any).zoom ?? 1,
      target: (controlsRef.current as any).target
        ? ((controlsRef.current as any).target.toArray() as [
            number,
            number,
            number
          ])
        : storedPoseRef.current?.target ?? [0, 0, 0]
    };
    jotaiStore.set(cameraPoseAtom, pose);
  });

  return <MapControls ref={controlsRef} {...props} />;
}


