import * as THREE from "three"
import { PLYLoader } from "three/addons/loaders/PLYLoader.js"
import { Portal } from "./posemeshClientApi";

const _position = new THREE.Vector3(0, 0, 0);
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);

/**
 * Utility functions for Three.js operations
 */

/**
 * Creates a transformation matrix from a portal's position and orientation data.
 * 
 * @param pose - Portal object containing position (px,py,pz) and orientation (rx,ry,rz,rw)
 * @param matrix - Output matrix to store the transformation
 * @returns boolean indicating if the transformation was successful
 */
export function matrixFromPose(pose: Portal, matrix: THREE.Matrix4): boolean {
    if (pose.px === undefined || pose.py === undefined || pose.pz === undefined) return false;
    if (pose.rx === undefined || pose.ry === undefined || pose.rz === undefined || pose.rw === undefined) return false;
    _position.set(pose.px, pose.py, pose.pz);
    _quaternion.set(pose.rx, pose.ry, pose.rz, pose.rw);
    matrix.compose(_position, _quaternion, _scale);
    return true;
}

export { THREE, PLYLoader }

