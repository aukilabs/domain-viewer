"use client";

import { plyAsyncParse } from "@/utils/ply-parser.web";
import type { Portal } from "@/utils/posemeshClientApi";
import { matrixFromPose } from "@/utils/three-utils";
import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FloorGrid } from "./3d/FloorGrid";
import { PersistedMapControls } from "./PersistedMapControls";
import FPSControls from "./FPSControls";
import OriginLines from "./3d/OriginLines";
import SkyBox from "./SkyBox";

interface Viewer3DProps {
  pointCloudData: ArrayBuffer | null;
  portals?: Portal[] | null;
  occlusionMeshData: ArrayBuffer | null;
  navMeshData: ArrayBuffer | null;
  portalsVisible?: boolean;
  navMeshVisible?: boolean;
  occlusionVisible?: boolean;
  pointCloudVisible?: boolean;
  alignmentMatrix?: number[] | null;
}

function parseASCIIPLY(data: ArrayBuffer): THREE.BufferGeometry {
  const text = new TextDecoder().decode(data);
  const lines = text.split("\n");

  let vertexCount = 0;
  let headerEnd = 0;

  // Parse header
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("element vertex")) {
      vertexCount = Number.parseInt(lines[i].split(" ")[2]);
    }
    if (lines[i].trim() === "end_header") {
      headerEnd = i + 1;
      break;
    }
  }

  // Parse vertex data
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const parts = lines[i + headerEnd].trim().split(" ");
    positions[i * 3] = Number.parseFloat(parts[0]);
    positions[i * 3 + 1] = Number.parseFloat(parts[1]);
    positions[i * 3 + 2] = Number.parseFloat(parts[2]);
    colors[i * 3] = Number.parseInt(parts[3]) / 255.0;
    colors[i * 3 + 1] = Number.parseInt(parts[4]) / 255.0;
    colors[i * 3 + 2] = Number.parseInt(parts[5]) / 255.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return geometry;
}

/**
 * Renders a point cloud from PLY file data with vertex colors.
 *
 * @param data - ArrayBuffer containing the PLY file data
 */
function PointCloud({
  data,
  alignmentMatrix,
}: {
  data: ArrayBuffer;
  alignmentMatrix: number[] | null;
}) {
  const { scene } = useThree();
  const pointsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!data) return;

    plyAsyncParse(data, true).then((geometry) => {
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
      pointsRef.current = points;
    });

    // const geometry = parseASCIIPLY(data)

    return () => {
      if (pointsRef.current) {
        const points = pointsRef.current;
        scene.remove(points);

        // Dispose of geometry and material to prevent memory leaks
        if (points.geometry) {
          points.geometry.dispose();
        }
        if (points.material) {
          if (Array.isArray(points.material)) {
            points.material.forEach((material) => material.dispose());
          } else {
            points.material.dispose();
          }
        }

        // Remove from parent group if it exists
        if (points.parent) {
          points.parent.remove(points);
        }
      }
    };
  }, [data, scene, alignmentMatrix]);

  return null;
}

/**
 * Renders portal markers (QR codes) at specified positions and orientations.
 * Uses a 3D model loaded from QR.glb.
 *
 * @param portals - Array of Portal objects containing position and orientation data
 */
function Portals({ portals = [] }: { portals: Portal[] | null | undefined }) {
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

/**
 * Controls camera behavior including auto-rotation when idle.
 *
 * @param pointCloudData - Point cloud data used to determine if content is loaded
 */
function CameraController({
  pointCloudData,
  controlMode,
}: {
  pointCloudData: ArrayBuffer | null;
  controlMode: "map" | "fps";
}) {
  const { camera, controls } = useThree();
  const [isIdle, setIsIdle] = useState(false);
  const lastInteractionTime = useRef(Date.now());
  const animationRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const previousControlMode = useRef(controlMode);

  const resetIdleTimer = () => {
    lastInteractionTime.current = Date.now();
    setIsIdle(false);
  };

  useEffect(() => {
    // When switching from FPS to Map mode, we need to ensure the camera is upright
    // and looking at a valid target for the MapControls to work properly
    if (previousControlMode.current === "fps" && controlMode === "map") {
      // Reset camera up vector to ensure it's not tilted
      camera.up.set(0, 1, 0);

      // Calculate a target point in front of the camera
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const target = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(10));

      // Update the controls target if available
      if (controls && (controls as any).target) {
        (controls as any).target.copy(target);
        (controls as any).update();
      }
    }
    previousControlMode.current = controlMode;
  }, [controlMode, camera, controls]);

  useEffect(() => {
    const reset = () => resetIdleTimer();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("wheel", reset, { passive: true } as any);
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset, { passive: true } as any);
    return () => {
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("wheel", reset as any);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset as any);
    };
  }, []);

  useFrame(() => {
    // Disable auto-rotation in FPS mode
    if (controlMode === "fps") {
      lastInteractionTime.current = Date.now();
      return;
    }

    if (
      pointCloudData &&
      !isIdle &&
      Date.now() - lastInteractionTime.current > 5000
    ) {
      // Get the current target from MapControls
      const target = (controls as any)?.target || new THREE.Vector3(0, 0, 0);
      targetRef.current.copy(target);

      // Calculate the current angle from camera position relative to target
      const offsetX = camera.position.x - targetRef.current.x;
      const offsetZ = camera.position.z - targetRef.current.z;
      const currentAngle = Math.atan2(offsetZ, offsetX);
      angleRef.current = currentAngle;
      setIsIdle(true);
    }
    if (isIdle) {
      angleRef.current += 0.0015;
      const offsetX = camera.position.x - targetRef.current.x;
      const offsetZ = camera.position.z - targetRef.current.z;
      const radius = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);
      const y = camera.position.y;
      const x = targetRef.current.x + Math.cos(angleRef.current) * Math.max(5, radius);
      const z = targetRef.current.z + Math.sin(angleRef.current) * Math.max(5, radius);
      camera.position.set(x, y, z);
      camera.lookAt(targetRef.current);
      camera.updateProjectionMatrix();
    }
  });

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    // We attach handlers via PersistedMapControls in the main component
    null
  );
}

/**
 * Renders the occlusion mesh that represents physical barriers in the space.
 *
 * @param occlusionMeshData - ArrayBuffer containing the OBJ file data
 */
function OcclusionMesh({
  occlusionMeshData,
}: {
  occlusionMeshData: ArrayBuffer | null;
}) {
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

/**
 * Renders the navigation mesh that represents walkable areas in the space.
 *
 * @param navMeshData - ArrayBuffer containing the OBJ file data
 */
function NavMesh({ navMeshData }: { navMeshData: ArrayBuffer | null }) {
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

/**
 * Main 3D visualization component that renders the domain data using Three.js.
 * Handles rendering of point clouds, portals, navigation meshes, and occlusion meshes.
 */
export default function Viewer3D({
  pointCloudData,
  portals = [],
  occlusionMeshData,
  navMeshData,
  portalsVisible = true,
  navMeshVisible = true,
  occlusionVisible = true,
  pointCloudVisible = true,
  alignmentMatrix,
  isEmbed = false,
}: Viewer3DProps & { isEmbed?: boolean }) {
  const [controlMode, setControlMode] = useState<"map" | "fps">("map");
  const fpsStart = useMemo<[number, number, number]>(() => [0, 1.8, 3], []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && !isEmbed) {
        setControlMode((m) => {
          if (m === "fps") {
            document.exitPointerLock();
            return "map";
          }
          return "fps";
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEmbed]);

  return (
    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900">
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight intensity={0.5} position={[10, 100, 10]} />
        <OriginLines />
        <FloorGrid />
        {pointCloudVisible && pointCloudData && (
          <PointCloud
            data={pointCloudData}
            alignmentMatrix={alignmentMatrix || null}
          />
        )}
        {portalsVisible && <Portals portals={portals} />}
        {occlusionVisible && (
          <OcclusionMesh occlusionMeshData={occlusionMeshData} />
        )}
        {navMeshVisible && <NavMesh navMeshData={navMeshData} />}
        {controlMode === "fps" ? (
          <>
            {/* SkyBox removed to preserve color theme */}
            <FPSControls start={fpsStart} makeDefault onExit={() => setControlMode("map")} />
          </>
        ) : (
          <PersistedMapControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            enableDamping={true}
            dampingFactor={0.05}
            onStart={() => { }}
            onEnd={() => { }}
            onChange={() => { }}
          />
        )}
        <CameraController pointCloudData={pointCloudData} controlMode={controlMode} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/QR.glb");
