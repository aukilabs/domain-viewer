/**
 * Theme Configuration
 * 
 * Centralizes design tokens that need to be accessed in JavaScript.
 * For styling React components, prefer Tailwind CSS classes defined in tailwind.config.js.
 * This file is for values that must be used in JavaScript contexts (e.g., inline styles, Three.js materials).
 */

/**
 * 3D Visualization Colors
 * 
 * Hex color values for Three.js materials and 3D scene elements.
 * These cannot use Tailwind classes as they're used in WebGL contexts.
 */
export const threeDColors = {
  // Grid colors (dark theme)
  gridCellDark: '#404040',
  gridSectionDark: '#404040',
  gridSubdivision: '#1a1a1a',
  gridMain: '#333333',
  
  // Grid colors (light theme)
  gridCellLight: '#c0c0c0',
  gridSectionLight: '#c0c0c0',
  
  // Axis colors
  xAxis: '#D0384D',  // Red
  yAxis: '#84cc16',  // Green (lime)
  zAxis: '#74AD18',  // Green
  
  // Origin line colors (for debug visualization)
  xAxisDebug: '#dc2626',  // Tailwind red-600
  yAxisDebug: '#84cc16',  // Tailwind lime-500
  zAxisDebug: '#2563eb',  // Tailwind blue-600
  
  // Performance monitor
  performanceText: '#0f0',  // Green for performance stats
  performanceBg: 'rgba(0, 0, 0, 0.7)',
  performanceWhite: '#fff',
  performanceBorder: '#333',
} as const;

/**
 * Spacing Constants
 * 
 * Use these for inline styles when Tailwind classes cannot be used.
 * Prefer Tailwind spacing classes (p-2, m-4, etc.) in JSX.
 */
export const spacing = {
  xs: '0.5rem',  // 8px
  sm: '0.75rem', // 12px
  md: '1rem',    // 16px
  lg: '1.5rem',  // 24px
  xl: '2rem',    // 32px
} as const;

/**
 * Border Radius Constants
 * 
 * Use these for inline styles when Tailwind classes cannot be used.
 * Prefer Tailwind rounded classes (rounded, rounded-lg, etc.) in JSX.
 */
export const borderRadius = {
  sm: '0.375rem', // 6px
  md: '0.5rem',   // 8px
  lg: '0.75rem',  // 12px
  xl: '1rem',     // 16px
} as const;

/**
 * Z-Index Scale
 * 
 * Use these for inline styles when Tailwind classes cannot be used.
 * Prefer Tailwind z-index classes (z-10, z-20, etc.) in JSX.
 * 
 * Note: Performance monitor uses a high z-index (1000) to ensure it's always visible.
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  performanceMonitor: 1000,
} as const;

/**
 * Type Definitions
 */
export type ThreeDColorKey = keyof typeof threeDColors;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ZIndexKey = keyof typeof zIndex;

export type ThemeConfig = {
  threeDColors: typeof threeDColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  zIndex: typeof zIndex;
};
