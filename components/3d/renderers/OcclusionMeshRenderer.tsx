"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useAtomValue } from "jotai";
import { occlusionMeshDataAtom } from "@/store/domainStore";

/**
 * Renders the occlusion mesh that represents physical barriers in the space.
 * Reads occlusion mesh data from Jotai atoms and manages Three.js geometry lifecycle.
 */
export default function OcclusionMeshRenderer() {
  const occlusionMeshData = useAtomValue(occlusionMeshDataAtom);
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!occlusionMeshData) return;

    const loader = new OBJLoader();
    const objString = new TextDecoder().decode(occlusionMeshData);
    const obj = loader.parse(objString);

    // Create a group to hold all meshes
    const group = new THREE.Group();

    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create wireframe geometry
        const wireframe = new THREE.WireframeGeometry(child.geometry);
        const edges = new THREE.LineSegments(
          wireframe,
          new THREE.LineBasicMaterial({ color: 0x303030 })
        );

        // Create mesh with transparent faces
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({
            color: 0x808080,
            transparent: true,
            opacity: 0.8,
          })
        );

        group.add(mesh);
        group.add(edges);
      }
    });

    scene.add(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) {
        scene.remove(group);
        group.traverse((child) => {
          if (
            child instanceof THREE.Mesh ||
            child instanceof THREE.LineSegments
          ) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      }
    };
  }, [occlusionMeshData, scene]);

  return null;
}
