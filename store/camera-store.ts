/**
 * Camera State Store
 * 
 * Manages camera position, rotation, and control mode for the 3D viewer.
 * This store maintains separation of concerns from domain data and visualization toggles.
 * 
 * @example
 * ```tsx
 * import { useAtom } from 'jotai';
 * import { cameraPoseAtom } from '@/store/camera-store';
 * 
 * function CameraController() {
 *   const [cameraPose, setCameraPose] = useAtom(cameraPoseAtom);
 *   // ...
 * }
 * ```
 */

import { atom } from "jotai";

/**
 * Represents the complete state of the camera in 3D space.
 * Used for persisting and restoring camera position between sessions.
 */
export interface CameraPose {
  /** Camera position in 3D space [x, y, z] */
  position: [number, number, number];
  /** Camera rotation as quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
  /** Camera zoom level */
  zoom: number;
  /** Optional target point the camera is looking at [x, y, z] */
  target?: [number, number, number];
}

/**
 * Stores the current camera pose for persistence across sessions.
 * Null when no pose has been saved yet.
 * 
 * @example
 * ```tsx
 * const [cameraPose, setCameraPose] = useAtom(cameraPoseAtom);
 * ```
 */
export const cameraPoseAtom = atom<CameraPose | null>(null);

/**
 * Stores the current camera control mode.
 * - "map": Map-style controls (pan, rotate, zoom)
 * - "fps": First-person shooter controls (WASD movement)
 * 
 * @example
 * ```tsx
 * const [controlMode, setControlMode] = useAtom(cameraControlModeAtom);
 * ```
 */
export const cameraControlModeAtom = atom<"map" | "fps">("map");


