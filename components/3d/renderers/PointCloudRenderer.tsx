"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { plyAsyncParse } from "@/utils/ply-parser.web";
import { useAtomValue } from "jotai";
import { pointCloudDataAtom, alignmentMatrixAtom } from "@/store/domainStore";

/**
 * Renders a point cloud from PLY file data with vertex colors.
 * Reads data from Jotai atoms and manages Three.js geometry lifecycle.
 */
export default function PointCloudRenderer() {
  const pointCloudData = useAtomValue(pointCloudDataAtom);
  const alignmentMatrix = useAtomValue(alignmentMatrixAtom);
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!pointCloudData) return;

    isMountedRef.current = true;

    plyAsyncParse(pointCloudData, true).then((geometry) => {
      // Check if component is still mounted before adding to scene
      if (!isMountedRef.current) {
        console.log("PointCloud unmounted before parse completed, disposing geometry");
        geometry.dispose();
        return;
      }

      console.log("completed parse ply");
      const material = new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: true,
        opacity: 1,
        transparent: true,
      });

      const points = new THREE.Points(geometry, material);
      points.matrixAutoUpdate = false;
      if (alignmentMatrix) {
        console.log("HAAAASalignmentMatrix", alignmentMatrix);
        points.applyMatrix4(new THREE.Matrix4().fromArray(alignmentMatrix));
      }
      console.log("points", points);
      const group = new THREE.Group();
      group.add(points);
      group.matrixAutoUpdate = false;
      scene.add(group);
      groupRef.current = group;
    });

    return () => {
      isMountedRef.current = false;

      if (groupRef.current) {
        const group = groupRef.current;
        scene.remove(group);

        // Dispose of geometry and material to prevent memory leaks
        group.traverse((child) => {
          if (child instanceof THREE.Points) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });

        groupRef.current = null;
      }
    };
  }, [pointCloudData, scene, alignmentMatrix]);

  return null;
}
