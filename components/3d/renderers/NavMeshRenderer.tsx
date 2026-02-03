"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useAtomValue } from "jotai";
import { navMeshDataAtom } from "@/store/domainStore";

/**
 * Renders the navigation mesh that represents walkable areas in the space.
 * Reads nav mesh data from Jotai atoms and manages Three.js geometry lifecycle.
 */
export default function NavMeshRenderer() {
  const navMeshData = useAtomValue(navMeshDataAtom);
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!navMeshData) return;

    const loader = new OBJLoader();
    const objString = new TextDecoder().decode(navMeshData);
    const obj = loader.parse(objString);

    // Create a group to hold all meshes
    const group = new THREE.Group();

    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({
            color: 0x2b4d2b,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          })
        );
        group.add(mesh);
      }
    });

    scene.add(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) {
        scene.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      }
    };
  }, [navMeshData, scene]);

  return null;
}
