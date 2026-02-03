"use client";

import OriginLines from "./OriginLines";
import { FloorGrid } from "./FloorGrid";

/**
 * Scene setup component that provides lighting and basic scene elements.
 * Renders ambient and directional lights along with origin lines and floor grid.
 */
export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight intensity={0.5} position={[10, 100, 10]} />
      <OriginLines />
      <FloorGrid />
    </>
  );
}
