import * as THREE from "three"
import { ANIMATION, DEBUG, MATERIAL_CONFIG } from "./DeviceConstants"

/**
 * Device data interface for displaying devices in 3D space
 */
export interface DeviceData {
  device_id: string
  device_type: string
  name?: string
  pose: {
    px: number
    py: number
    pz: number
    rx: number
    ry: number
    rz: number
    rw: number
  }
}

/**
 * Transform data for lerping animations
 */
export interface TargetTransform {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
  startPosition: THREE.Vector3
  startQuaternion: THREE.Quaternion
  startScale: THREE.Vector3
  startTime: number
}

/**
 * Props for individual device components
 */
export interface DeviceComponentProps {
  deviceData: DeviceData
  index: number
  textures: Map<string, THREE.Texture>
  onTargetTransformSet: (deviceId: string, transform: TargetTransform) => void
  targetTransforms: React.MutableRefObject<Map<string, TargetTransform>>
  modelsRef: React.MutableRefObject<Map<string, THREE.Group>>
}

/**
 * Lerping configuration constants
 */
export const LERP_DURATION = ANIMATION.LERP_DURATION

/**
 * Helper function to dispose of Three.js model resources with enhanced cleanup
 */
export function disposeModel(model: THREE.Object3D) {
  let disposedObjects = 0;
  let disposedMaterials = 0;
  let disposedTextures = 0;
  
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      disposedObjects++;
      
      // Dispose geometry
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      // Dispose materials
      if (object.material instanceof THREE.Material) {
        // Dispose any textures in the material (cast to access texture properties)
        const material = object.material as any;
        if (material.map) {
          material.map.dispose();
          disposedTextures++;
        }
        if (material.normalMap) {
          material.normalMap.dispose();
          disposedTextures++;
        }
        if (material.roughnessMap) {
          material.roughnessMap.dispose();
          disposedTextures++;
        }
        if (material.metalnessMap) {
          material.metalnessMap.dispose();
          disposedTextures++;
        }
        
        object.material.dispose();
        disposedMaterials++;
      } else if (Array.isArray(object.material)) {
        object.material.forEach(material => {
          // Dispose any textures in the material (cast to access texture properties)
          const mat = material as any;
          if (mat.map) {
            mat.map.dispose();
            disposedTextures++;
          }
          if (mat.normalMap) {
            mat.normalMap.dispose();
            disposedTextures++;
          }
          if (mat.roughnessMap) {
            mat.roughnessMap.dispose();
            disposedTextures++;
          }
          if (mat.metalnessMap) {
            mat.metalnessMap.dispose();
            disposedTextures++;
          }
          
          material.dispose();
          disposedMaterials++;
        });
      }
    }
  });
  
  console.log(`Model disposal complete: ${disposedObjects} objects, ${disposedMaterials} materials, ${disposedTextures} textures`);
}

/**
 * Memory monitoring utility for animation system
 */
export class AnimationMemoryMonitor {
  private static totalModels = 0;
  private static totalAnimations = 0;
  private static totalTextures = 0;
  
  static trackModelCreated() {
    this.totalModels++;
    this.logMemoryStatus('Model created');
  }
  
  static trackModelDisposed() {
    this.totalModels--;
    this.logMemoryStatus('Model disposed');
  }
  
  static trackAnimationStarted() {
    this.totalAnimations++;
    this.logMemoryStatus('Animation started');
  }
  
  static trackAnimationCompleted() {
    this.totalAnimations--;
    this.logMemoryStatus('Animation completed');
  }
  
  static trackTextureLoaded() {
    this.totalTextures++;
    this.logMemoryStatus('Texture loaded');
  }
  
  static trackTextureDisposed() {
    this.totalTextures--;
    this.logMemoryStatus('Texture disposed');
  }
  
  static getMemoryStatus() {
    return {
      models: this.totalModels,
      animations: this.totalAnimations,
      textures: this.totalTextures
    };
  }
  
  private static logMemoryStatus(action: string) {
    console.log(`[Memory Monitor] ${action} - Models: ${this.totalModels}, Animations: ${this.totalAnimations}, Textures: ${this.totalTextures}`);
  }
  
  static reset() {
    this.totalModels = 0;
    this.totalAnimations = 0;
    this.totalTextures = 0;
    console.log('[Memory Monitor] Reset - All counters cleared');
  }
}

/**
 * Enhanced cleanup function for animation-related objects
 */
export function cleanupAnimationResources(
  deviceId: string, 
  model?: THREE.Group, 
  targetTransform?: TargetTransform
) {
  console.log(`Cleaning up animation resources for device: ${deviceId}`);
  
  if (model) {
    // Dispose model resources
    disposeModel(model);
    AnimationMemoryMonitor.trackModelDisposed();
  }
  
  if (targetTransform) {
    // Clean up any Vector3/Quaternion references
    // These are typically handled by garbage collection, but we can null them for clarity
    console.log(`Cleaning up transform data for device: ${deviceId}`);
    AnimationMemoryMonitor.trackAnimationCompleted();
  }
}

/**
 * Helper function to create a debug sphere
 */
export function createDebugSphere(parentModel: THREE.Group, scale: THREE.Vector3) {
  const debugSphere = new THREE.Mesh(
    new THREE.SphereGeometry(DEBUG.SPHERE_RADIUS, DEBUG.SPHERE_SEGMENTS, DEBUG.SPHERE_RINGS),
    new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
  )
  debugSphere.userData.isDebugSphere = true
  
  // Apply inverse scaling to the debug sphere to maintain consistent size
  const inverseScale = new THREE.Vector3(
    DEBUG.SPHERE_RADIUS / scale.x,
    DEBUG.SPHERE_RADIUS / scale.y,
    DEBUG.SPHERE_RADIUS / scale.z
  )
  debugSphere.scale.copy(inverseScale)
  
  // Hide the debug sphere
  debugSphere.visible = false
  
  parentModel.add(debugSphere)
}

/**
 * Helper function to apply unlit materials to device models
 */
export function applyUnlitMaterials(model: THREE.Group) {
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material) {
      // Get the original material's color and texture
      const originalMaterial = object.material instanceof THREE.Material 
        ? object.material 
        : object.material[0]
      
      const color = originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xFFFFFF)
      const map = originalMaterial.map || null
      
      // Create and apply unlit material
      const unlitMaterial = new THREE.MeshBasicMaterial({
        color: color,
        map: map,
        transparent: originalMaterial.transparent || MATERIAL_CONFIG.UNLIT.TRANSPARENT,
        opacity: originalMaterial.opacity || MATERIAL_CONFIG.UNLIT.OPACITY,
        side: originalMaterial.side || MATERIAL_CONFIG.UNLIT.SIDE
      })
      
      if (Array.isArray(object.material)) {
        const materials = []
        for (let i = 0; i < object.material.length; i++) {
          materials.push(unlitMaterial.clone())
        }
        object.material = materials
      } else {
        object.material = unlitMaterial
      }
    }
  })
} 