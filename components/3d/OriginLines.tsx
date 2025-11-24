"use client";

import { Line } from "@react-three/drei";
import React from "react";
import * as THREE from "three";

export default function OriginLines() {
  const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
  const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)];

  return (
    <>
      <Line points={xPoints} color="#dc2626" lineWidth={2} />
      <Line points={yPoints} color="#84cc16" lineWidth={2} />
      <Line points={zPoints} color="#2563eb" lineWidth={2} />
    </>
  );
}


