import * as THREE from "three"

/**
 * Animation and timing constants
 */
export const ANIMATION = {
  LERP_DURATION: 2000, // 2 seconds in milliseconds
} as const

/**
 * Debug visualization constants
 */
export const DEBUG = {
  SPHERE_RADIUS: 0.2,
  SPHERE_SEGMENTS: 16,
  SPHERE_RINGS: 16,
} as const

/**
 * Device scale constants
 */
export const DEVICE_SCALES = {
  GLASSES: new THREE.Vector3(1.5, 1.5, 1.5),
  PHONE: new THREE.Vector3(0.5, 0.5, 0.5),
  ROBOT: new THREE.Vector3(1, 1, 1),
} as const

/**
 * Logo configuration constants for each device type
 */
export const LOGO_CONFIG = {
  GLASSES: {
    HEIGHT: 0.35,
    POSITION: new THREE.Vector3(0, 0.2, 0),
    SCALE_FACTOR: 0.4,
    ROTATION_X: -Math.PI / 2,
  },
  PHONE: {
    HEIGHT: 0.2,
    POSITION: new THREE.Vector3(0, 1, 0),
    SCALE_FACTOR: 0.4,
    ROTATION_X: -Math.PI / 2,
  },
  ROBOT: {
    HEIGHT: 0.3,
    POSITION: new THREE.Vector3(0, 1.4, 0),
    SCALE_FACTOR: 0.7,
    ROTATION_X: -Math.PI / 2,
  },
} as const

/**
 * Text label configuration for glasses
 */
export const TEXT_LABEL_CONFIG = {
  CANVAS: {
    WIDTH: 512,
    HEIGHT: 128,
  },
  FONT: {
    SIZE: 20,
    FAMILY: 'Arial',
    WEIGHT: 'bold',
    COLOR: '#00FF00',
  },
  GEOMETRY: {
    WIDTH: 2,
    HEIGHT: 0.5,
  },
  POSITION: new THREE.Vector3(-0.01, 0.037, -0.01),
  ROTATION_Z: Math.PI / 2, // 90 degrees
  SCALE_FACTOR: 0.04,
  TEXT: {
    LINE_1: 'Powered by AugmentOS',
    LINE_2: 'and Auki Network',
    LINE_OFFSET: 15,
  },
} as const

/**
 * Material configuration constants
 */
export const MATERIAL_CONFIG = {
  LOGO: {
    ALPHA_TEST: 0.1,
    TRANSPARENT: true,
    SIDE: THREE.DoubleSide,
    PREMULTIPLIED_ALPHA: false,
    TONE_MAPPED: false,
  },
  TEXT: {
    TRANSPARENT: true,
    DEPTH_WRITE: false,
    SIDE: THREE.DoubleSide,
    TONE_MAPPED: false,
    PREMULTIPLIED_ALPHA: false,
  },
  UNLIT: {
    TRANSPARENT: false,
    OPACITY: 1.0,
    SIDE: THREE.FrontSide,
  },
} as const

/**
 * Threshold constants for change detection
 * These values determine when device position/rotation changes are significant enough
 * to trigger animations, balancing responsiveness with performance.
 */

/**
 * Interface for change detection thresholds
 */
interface ChangeThresholds {
  POSITION: number
  QUATERNION: number
}

/**
 * Change detection precision modes
 */
export const THRESHOLD_MODES = {
  /**
   * NORMAL mode - Balanced performance and responsiveness
   * Good for most AR/VR applications with typical tracking accuracy
   */
  NORMAL: {
    POSITION: 0.01,    // 1cm - Ignores minor tracking jitter
    QUATERNION: 0.01,  // ~1.15 degree rotation threshold
  },
  
  /**
   * STRICT mode - High precision for critical applications
   * Use when precise tracking is essential, may cause more animations
   */
  STRICT: {
    POSITION: 0.005,   // 5mm - More sensitive to position changes
    QUATERNION: 0.005, // ~0.57 degree rotation threshold
  },
  
  /**
   * RELAXED mode - Performance optimized
   * Use for lower-end devices or when battery life is important
   */
  RELAXED: {
    POSITION: 0.02,    // 2cm - Less sensitive, fewer animations
    QUATERNION: 0.02,  // ~2.3 degree rotation threshold
  }
} as const

/**
 * Default change detection thresholds (NORMAL mode)
 * Position threshold: 0.01 = 1cm movement required to trigger animation
 * Quaternion threshold: 0.01 = ~1.15 degree rotation required to trigger animation
 */
export const CHANGE_THRESHOLDS: ChangeThresholds = THRESHOLD_MODES.NORMAL

/**
 * Environment-based threshold selection
 * Can be used to automatically select thresholds based on device capabilities
 */
export function getOptimalThresholds(): ChangeThresholds {
  // Check if we're on a mobile device or low-performance environment
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4
  
  if (isMobile || isLowMemory) {
    console.log('Using RELAXED thresholds for mobile/low-memory device')
    return THRESHOLD_MODES.RELAXED
  }
  
  // Check for high-refresh displays that might benefit from strict mode
  const isHighRefresh = window.screen && (window.screen as any).refreshRate > 90
  if (isHighRefresh) {
    console.log('Using STRICT thresholds for high-refresh display')
    return THRESHOLD_MODES.STRICT
  }
  
  console.log('Using NORMAL thresholds (default)')
  return THRESHOLD_MODES.NORMAL
}

/**
 * Utility to get threshold mode name from threshold values
 */
export function getThresholdModeName(thresholds: ChangeThresholds): string {
  if (thresholds.POSITION === THRESHOLD_MODES.STRICT.POSITION) return 'STRICT'
  if (thresholds.POSITION === THRESHOLD_MODES.RELAXED.POSITION) return 'RELAXED'
  if (thresholds.POSITION === THRESHOLD_MODES.NORMAL.POSITION) return 'NORMAL'
  return 'CUSTOM'
}

/**
 * Performance monitoring for threshold effectiveness
 * Helps determine if current thresholds are causing too many or too few animations
 */
export class ThresholdPerformanceMonitor {
  private static animationsTriggered = 0
  private static animationsSkipped = 0
  private static lastReportTime = Date.now()
  private static readonly REPORT_INTERVAL = 30000 // 30 seconds
  
  static recordAnimationTriggered() {
    this.animationsTriggered++
    this.checkReportInterval()
  }
  
  static recordAnimationSkipped() {
    this.animationsSkipped++
    this.checkReportInterval()
  }
  
  private static checkReportInterval() {
    const now = Date.now()
    if (now - this.lastReportTime > this.REPORT_INTERVAL) {
      this.generateReport()
      this.reset()
      this.lastReportTime = now
    }
  }
  
  private static generateReport() {
    const total = this.animationsTriggered + this.animationsSkipped
    if (total === 0) return
    
    const triggeredPercent = (this.animationsTriggered / total * 100).toFixed(1)
    const skippedPercent = (this.animationsSkipped / total * 100).toFixed(1)
    
    console.log(`[Threshold Performance] Last 30s: ${this.animationsTriggered} triggered (${triggeredPercent}%), ${this.animationsSkipped} skipped (${skippedPercent}%)`)
    
    // Provide recommendations
    if (this.animationsTriggered / total > 0.8) {
      console.log('[Threshold Recommendation] Consider using RELAXED thresholds - high animation rate detected')
    } else if (this.animationsTriggered / total < 0.2) {
      console.log('[Threshold Recommendation] Consider using STRICT thresholds - low animation rate detected')
    }
  }
  
  private static reset() {
    this.animationsTriggered = 0
    this.animationsSkipped = 0
  }
  
  static getStats() {
    return {
      triggered: this.animationsTriggered,
      skipped: this.animationsSkipped,
      total: this.animationsTriggered + this.animationsSkipped
    }
  }
}

/**
 * Debug logging configuration with multiple levels and proper timing
 */

/**
 * Debug logging levels
 */
export enum DebugLevel {
  NONE = 0,     // No debug output
  BASIC = 1,    // Essential information only
  VERBOSE = 2,  // Detailed logging
  FULL = 3      // All debug information including performance metrics
}

/**
 * Debug logging configuration
 */
export const DEBUG_LOGGING = {
  // Current debug level (can be changed dynamically)
  LEVEL: DebugLevel.BASIC,
  
  // Frame-based intervals (more reliable than time-based)
  INTERVALS: {
    LERP_PROGRESS: 30,    // Log lerp progress every 30 frames (~0.5s at 60fps)
    MEMORY_STATUS: 600,   // Log memory status every 600 frames (~10s at 60fps)
    PERFORMANCE: 1800,    // Log performance metrics every 1800 frames (~30s at 60fps)
  },
  
  // Time-based intervals as fallback
  TIME_INTERVALS: {
    LERP_PROGRESS: 500,   // 500ms
    MEMORY_STATUS: 10000, // 10s
    PERFORMANCE: 30000,   // 30s
  },
  
  // Categories for fine-grained control
  CATEGORIES: {
    ANIMATION: true,      // Animation-related logging
    MEMORY: true,         // Memory management logging
    PERFORMANCE: true,    // Performance metrics logging
    LIFECYCLE: true,      // Component lifecycle logging
    THRESHOLD: true,      // Threshold optimization logging
  }
} as const

/**
 * Advanced debug logger with configurable levels and timing
 */
export class AdvancedDebugLogger {
  private static frameCounter = 0
  private static lastLogTimes = new Map<string, number>()
  private static performanceMetrics = {
    totalAnimations: 0,
    completedAnimations: 0,
    averageAnimationDuration: 0,
    maxAnimationDuration: 0,
    frameRate: 60, // Estimated
    lastFrameTime: Date.now()
  }
  
  /**
   * Increment frame counter (call this once per frame)
   */
  static incrementFrame() {
    this.frameCounter++
    
    // Update frame rate estimation
    const now = Date.now()
    const frameDelta = now - this.performanceMetrics.lastFrameTime
    if (frameDelta > 0) {
      this.performanceMetrics.frameRate = Math.round(1000 / frameDelta)
    }
    this.performanceMetrics.lastFrameTime = now
  }
  
  /**
   * Log animation progress with proper timing
   */
  static logAnimationProgress(deviceId: string, t: number, elapsedTime: number, totalDuration: number, position: any, targetPosition: any) {
    if (DEBUG_LOGGING.LEVEL < DebugLevel.VERBOSE || !DEBUG_LOGGING.CATEGORIES.ANIMATION) return
    
    // Use frame-based interval
    if (this.frameCounter % DEBUG_LOGGING.INTERVALS.LERP_PROGRESS !== 0) return
    
    console.log(`[Animation] ${deviceId}: ${(t * 100).toFixed(1)}% (${elapsedTime}ms/${totalDuration}ms)`)
    console.log(`  pos: ${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)} -> ${targetPosition.x.toFixed(2)},${targetPosition.y.toFixed(2)},${targetPosition.z.toFixed(2)}`)
  }
  
  /**
   * Log memory status with proper timing
   */
  static logMemoryStatus(memoryStatus: any) {
    if (DEBUG_LOGGING.LEVEL < DebugLevel.BASIC || !DEBUG_LOGGING.CATEGORIES.MEMORY) return
    
    // Use frame-based interval
    if (this.frameCounter % DEBUG_LOGGING.INTERVALS.MEMORY_STATUS !== 0) return
    
    if (memoryStatus.models > 0 || memoryStatus.animations > 0 || memoryStatus.textures > 0) {
      console.log('[Memory]', memoryStatus)
    }
  }
  
  /**
   * Log animation lifecycle events
   */
  static logAnimationLifecycle(event: string, deviceId: string, details?: any) {
    if (DEBUG_LOGGING.LEVEL < DebugLevel.BASIC || !DEBUG_LOGGING.CATEGORIES.LIFECYCLE) return
    
    console.log(`[Lifecycle] ${event}: ${deviceId}`, details || '')
  }
  
  /**
   * Log performance metrics
   */
  static logPerformanceMetrics(completedAnimations: number, totalAnimations: number) {
    if (DEBUG_LOGGING.LEVEL < DebugLevel.FULL || !DEBUG_LOGGING.CATEGORIES.PERFORMANCE) return
    
    // Use frame-based interval
    if (this.frameCounter % DEBUG_LOGGING.INTERVALS.PERFORMANCE !== 0) return
    
    this.performanceMetrics.totalAnimations += totalAnimations
    this.performanceMetrics.completedAnimations += completedAnimations
    
    const avgDuration = this.performanceMetrics.totalAnimations > 0 
      ? this.performanceMetrics.completedAnimations / this.performanceMetrics.totalAnimations 
      : 0
    
    console.log(`[Performance] Frame: ${this.frameCounter}, FPS: ~${this.performanceMetrics.frameRate}, Animations: ${totalAnimations} active, ${completedAnimations} completed this frame`)
    console.log(`[Performance] Total completed: ${this.performanceMetrics.completedAnimations}, Avg completion rate: ${(avgDuration * 100).toFixed(1)}%`)
  }
  
  /**
   * Log threshold optimization events
   */
  static logThresholdEvent(event: string, details: any) {
    if (DEBUG_LOGGING.LEVEL < DebugLevel.VERBOSE || !DEBUG_LOGGING.CATEGORIES.THRESHOLD) return
    
    console.log(`[Threshold] ${event}:`, details)
  }
  
  /**
   * Set debug level dynamically
   */
  static setDebugLevel(level: DebugLevel) {
    (DEBUG_LOGGING as any).LEVEL = level
    console.log(`[Debug] Debug level set to: ${DebugLevel[level]}`)
  }
  
  /**
   * Toggle debug category
   */
  static toggleCategory(category: keyof typeof DEBUG_LOGGING.CATEGORIES, enabled: boolean) {
    (DEBUG_LOGGING.CATEGORIES as any)[category] = enabled
    console.log(`[Debug] Category ${category} ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  /**
   * Get current performance metrics
   */
  static getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }
  
  /**
   * Reset performance metrics
   */
  static resetPerformanceMetrics() {
    this.performanceMetrics = {
      totalAnimations: 0,
      completedAnimations: 0,
      averageAnimationDuration: 0,
      maxAnimationDuration: 0,
      frameRate: 60,
      lastFrameTime: Date.now()
    }
    console.log('[Debug] Performance metrics reset')
  }
  
  /**
   * Demo function to showcase debug system capabilities
   * Can be called from browser console: AdvancedDebugLogger.runDebugDemo()
   */
  static runDebugDemo() {
    console.log('=== Advanced Debug Logger Demo ===')
    
    // Show current settings
    console.log(`Current debug level: ${DebugLevel[DEBUG_LOGGING.LEVEL]}`)
    console.log('Current categories:', DEBUG_LOGGING.CATEGORIES)
    console.log('Frame intervals:', DEBUG_LOGGING.INTERVALS)
    
    // Test different debug levels
    console.log('\n--- Testing Debug Levels ---')
    this.setDebugLevel(DebugLevel.NONE)
    this.logAnimationLifecycle('Test animation (should not show)', 'demo-device')
    
    this.setDebugLevel(DebugLevel.BASIC)
    this.logAnimationLifecycle('Test animation (basic level)', 'demo-device')
    
    this.setDebugLevel(DebugLevel.VERBOSE)
    this.logThresholdEvent('Demo threshold event', { device: 'demo', threshold: 0.01 })
    
    this.setDebugLevel(DebugLevel.FULL)
    this.logPerformanceMetrics(2, 5)
    
    // Test category toggling
    console.log('\n--- Testing Category Toggle ---')
    this.toggleCategory('ANIMATION', false)
    this.logAnimationLifecycle('Test animation (should not show)', 'demo-device')
    this.toggleCategory('ANIMATION', true)
    this.logAnimationLifecycle('Test animation (should show again)', 'demo-device')
    
    // Show performance metrics
    console.log('\n--- Performance Metrics ---')
    console.log('Current metrics:', this.getPerformanceMetrics())
    
    console.log('\n=== Demo Complete ===')
    
    // Reset to original state
    this.setDebugLevel(DebugLevel.BASIC)
  }
} 