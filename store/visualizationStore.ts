/**
 * Visualization Toggles Store
 * 
 * Manages visibility states for all 3D visualization elements.
 * Each atom controls whether a specific layer (portals, meshes, point cloud, splat)
 * is visible in the 3D viewer.
 * 
 * @example
 * ```tsx
 * import { useAtom } from 'jotai';
 * import { portalsVisibleAtom } from '@/store/visualizationStore';
 * 
 * function ToggleButton() {
 *   const [visible, setVisible] = useAtom(portalsVisibleAtom);
 *   return (
 *     <button onClick={() => setVisible(prev => !prev)}>
 *       {visible ? 'Hide' : 'Show'} Portals
 *     </button>
 *   );
 * }
 * ```
 */

import { atom } from 'jotai';

// ============================================================================
// Primitive Atoms - Visibility Toggles
// ============================================================================

/**
 * Controls visibility of portal/lighthouse markers in the 3D viewer.
 * Default: true (portals are visible by default)
 * 
 * @example
 * ```tsx
 * const [portalsVisible, setPortalsVisible] = useAtom(portalsVisibleAtom);
 * ```
 */
export const portalsVisibleAtom = atom<boolean>(true);

/**
 * Controls visibility of the navigation mesh in the 3D viewer.
 * Default: true (nav mesh is visible by default)
 * 
 * @example
 * ```tsx
 * const [navMeshVisible, setNavMeshVisible] = useAtom(navMeshVisibleAtom);
 * ```
 */
export const navMeshVisibleAtom = atom<boolean>(true);

/**
 * Controls visibility of the occlusion mesh in the 3D viewer.
 * Default: true (occlusion mesh is visible by default)
 * 
 * @example
 * ```tsx
 * const [occlusionVisible, setOcclusionVisible] = useAtom(occlusionVisibleAtom);
 * ```
 */
export const occlusionVisibleAtom = atom<boolean>(true);

/**
 * Controls visibility of the point cloud in the 3D viewer.
 * Default: true (point cloud is visible by default)
 * 
 * @example
 * ```tsx
 * const [pointCloudVisible, setPointCloudVisible] = useAtom(pointCloudVisibleAtom);
 * ```
 */
export const pointCloudVisibleAtom = atom<boolean>(true);

/**
 * Controls visibility of the splat (Gaussian Splatting) in the 3D viewer.
 * Default: true (splat is visible by default when available)
 * 
 * @example
 * ```tsx
 * const [splatVisible, setSplatVisible] = useAtom(splatVisibleAtom);
 * ```
 */
export const splatVisibleAtom = atom<boolean>(true);

// ============================================================================
// Derived Atoms - Computed Visibility States
// ============================================================================

/**
 * Computed boolean indicating if all visualization layers are visible.
 * True only when every layer is set to visible.
 * 
 * @example
 * ```tsx
 * const allVisible = useAtomValue(allVisibleAtom);
 * ```
 */
export const allVisibleAtom = atom((get) => 
  get(portalsVisibleAtom) &&
  get(navMeshVisibleAtom) &&
  get(occlusionVisibleAtom) &&
  get(pointCloudVisibleAtom) &&
  get(splatVisibleAtom)
);

/**
 * Computed boolean indicating if any visualization layer is visible.
 * True when at least one layer is set to visible.
 * 
 * @example
 * ```tsx
 * const anyVisible = useAtomValue(anyVisibleAtom);
 * ```
 */
export const anyVisibleAtom = atom((get) =>
  get(portalsVisibleAtom) ||
  get(navMeshVisibleAtom) ||
  get(occlusionVisibleAtom) ||
  get(pointCloudVisibleAtom) ||
  get(splatVisibleAtom)
);
