"use client"

import { Grid } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

/**
 * Renders a custom infinite grid with fading axes lines.
 * The grid provides visual reference for the 3D space.
 */
export function CustomGrid() {
  const { scene } = useThree()

  useEffect(() => {
    /**
     * Creates a line that fades out with distance from the origin.
     * Used for rendering the X and Z axes.
     * 
     * @param start - Starting point coordinates [x,y,z]
     * @param end - Ending point coordinates [x,y,z]
     * @param color - CSS color string for the line
     * @returns THREE.Line object with custom shader material
     */
    const createFadingLine = (start: [number, number, number], end: [number, number, number], color: string) => {
      const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          color: { value: new THREE.Color(color) },
          fadeDistance: { value: 900 },
          fadeStart: { value: 0 },
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float fadeDistance;
          uniform float fadeStart;
          varying vec3 vPosition;
          void main() {
            float distance = length(vPosition);
            float alpha = 1.0 - smoothstep(fadeStart, fadeDistance, distance);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      })
      const line = new THREE.Line(geometry, material)
      line.renderOrder = 1 // Ensure axes render on top
      return line
    }

    const xAxis = createFadingLine([-1000, 0, 0], [1000, 0, 0], "#D0384D")
    const zAxis = createFadingLine([0, 0, -1000], [0, 0, 1000], "#74AD18")

    scene.add(xAxis)
    scene.add(zAxis)

    return () => {
      scene.remove(xAxis)
      scene.remove(zAxis)
    }
  }, [scene])

  return (
    <>
      {/* Subdivisions (5x5) */}
      <Grid
        renderOrder={-2}
        infiniteGrid
        cellSize={1}
        cellThickness={0.3}
        cellColor={new THREE.Color(0.1, 0.1, 0.1)}
        sectionSize={5}
        sectionThickness={0.5}
        sectionColor={new THREE.Color(0.15, 0.15, 0.15)}
        fadeDistance={1000}
      />
      {/* Main grid */}
      <Grid
        renderOrder={-1}
        infiniteGrid
        cellSize={5}
        cellThickness={0.6}
        cellColor={new THREE.Color(0.2, 0.2, 0.2)}
        sectionSize={25}
        sectionThickness={1}
        sectionColor={new THREE.Color(0.25, 0.25, 0.25)}
        fadeDistance={1000}
      />
    </>
  )
}

