/**
 * Type definitions for splat-related functionality
 */

/**
 * Available visual effects for splat rendering
 */
export type SplatEffect = "Magic" | "Spread" | "Unroll" | "Twister" | "Rain";

/**
 * Configuration for splat mesh positioning and transformation
 */
export interface SplatMeshConfig {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  alignmentMatrix?: number[] | null;
}

/**
 * State tracking for splat viewer components
 */
export interface SplatViewerState {
  isLoading: boolean;
  error: Error | null;
  animationComplete: boolean;
  webgl2Supported: boolean;
}
