"use client";

import { Sky } from "@react-three/drei";
import React from "react";

export default function SkyBox() {
  return (
    <Sky
      distance={450000}
      sunPosition={[1, 1, 0]}
      inclination={0}
      azimuth={0.25}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
      turbidity={2}
      rayleigh={1}
    />
  );
}


