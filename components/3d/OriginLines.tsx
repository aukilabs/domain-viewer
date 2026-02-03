"use client";

import { Line } from "@react-three/drei";
import React from "react";
import * as THREE from "three";
import { threeDColors } from "@/styles/theme";

export default function OriginLines() {
  const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
  const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)];

  return (
    <>
      <Line points={xPoints} color={threeDColors.xAxisDebug} lineWidth={2} />
      <Line points={yPoints} color={threeDColors.yAxisDebug} lineWidth={2} />
      <Line points={zPoints} color={threeDColors.zAxisDebug} lineWidth={2} />
    </>
  );
}


