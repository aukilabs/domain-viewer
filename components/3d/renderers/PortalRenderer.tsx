"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useAtomValue } from "jotai";
import { portalsAtom } from "@/store/domainStore";
import { matrixFromPose } from "@/utils/three-utils";

/**
 * Renders portal markers (QR codes) at specified positions and orientations.
 * Uses a 3D model loaded from QR.glb and reads portal data from Jotai atoms.
 */
export default function PortalRenderer() {
  const portals = useAtomValue(portalsAtom);
  const { scene: gltfScene } = useGLTF("/QR.glb");
  const { scene } = useThree();
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const matrix = new THREE.Matrix4();

  useEffect(() => {
    if (!gltfScene) return;

    portals?.forEach((portal) => {
      let model: THREE.Group;

      if (modelsRef.current.has(portal.id)) {
        model = modelsRef.current.get(portal.id)!;
      } else {
        model = gltfScene.clone();
        scene.add(model);
        modelsRef.current.set(portal.id, model);
      }

      // Use matrixFromPose to set the transform
      if (matrixFromPose(portal, matrix)) {
        matrix.decompose(model.position, model.quaternion, model.scale);
        // Apply the reported size
        if (portal.reported_size) {
          const size = portal.reported_size * 0.01; // Convert to meters
          model.scale.setScalar(size);
        }
      }
    });

    // Cleanup removed portals
    modelsRef.current.forEach((model, id) => {
      if (!portals?.find((p) => p.id === id)) {
        scene.remove(model);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
        modelsRef.current.delete(id);
      }
    });

    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      });
      modelsRef.current.clear();
    };
  }, [gltfScene, scene, portals]);

  return null;
}

useGLTF.preload("/QR.glb");
