"use client";

import { useColorScheme } from "@/hooks/useColorScheme";
import { Grid } from "@react-three/drei";
import { DoubleSide } from "three";
import { threeDColors } from "@/styles/theme";

export function FloorGrid() {
  const { colorScheme } = useColorScheme();
  const cellColor = colorScheme === "dark" ? threeDColors.gridCellDark : threeDColors.gridCellLight;
  const sectionColor = colorScheme === "dark" ? threeDColors.gridSectionDark : threeDColors.gridSectionLight;
  return (
    <Grid
      infiniteGrid
      cellSize={0.2}
      cellColor={cellColor}
      sectionSize={1}
      sectionThickness={1}
      sectionColor={sectionColor}
      fadeDistance={500}
      fadeStrength={10}
      fadeFrom={0}
      renderOrder={-100}
      side={DoubleSide}
    />
  );
}


