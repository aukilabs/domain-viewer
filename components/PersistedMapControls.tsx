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

  useFrame(() => {
    if (!controlsRef.current) return;
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


