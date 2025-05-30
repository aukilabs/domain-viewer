"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { DeviceData, TargetTransform, LERP_DURATION, disposeModel, AnimationMemoryMonitor, cleanupAnimationResources } from "./DeviceUtils"
import { GlassesDevice } from "./GlassesDevice"
import { PhoneDevice } from "./PhoneDevice"
import { RobotDevice } from "./RobotDevice"
import { DEBUG_LOGGING, getOptimalThresholds, getThresholdModeName, AdvancedDebugLogger } from "./DeviceConstants"

/**
 * Props for the DomainDevices component
 */
interface DomainDevicesProps {
  domainDeviceData: DeviceData[] | null
}

/**
 * Main component for rendering all domain devices using specialized device components
 */
export function DomainDevices({ domainDeviceData }: DomainDevicesProps) {
  // Store references to all device models in the scene
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const [lastUpdate, setLastUpdate] = useState<string>("")
  
  // Store and manage textures for app logos
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(new Map())
  const textureLoader = useRef(new THREE.TextureLoader())
  const loadedAppNames = useRef<Set<string>>(new Set())
  
  // Store the target transforms for lerping
  const targetTransforms = useRef(new Map<string, TargetTransform>())
  
  // Lerping state
  const lerpingActive = useRef(false)
  
  // Initialize optimal thresholds on component mount
  useEffect(() => {
    const optimalThresholds = getOptimalThresholds()
    const modeName = getThresholdModeName(optimalThresholds)
    console.log(`[Threshold Optimization] Using ${modeName} thresholds:`, optimalThresholds)
  }, [])

  // Callback function for device components to set target transforms
  const handleTargetTransformSet = (deviceId: string, transform: TargetTransform) => {
    const isNewAnimation = !targetTransforms.current.has(deviceId);
    targetTransforms.current.set(deviceId, transform)
    lerpingActive.current = true
    setLastUpdate(new Date().toISOString())
    
    // Track new animations for memory monitoring
    if (isNewAnimation) {
      AnimationMemoryMonitor.trackAnimationStarted();
    }
  }

  // Load textures for all unique app names
  useEffect(() => {
    if (!domainDeviceData) return

    // Get unique app names
    const uniqueAppNames = new Set<string>()
    
    domainDeviceData.forEach(device => {
      if (device.name) {
        uniqueAppNames.add(device.name)
      }
    })
    
    // Load textures for each app name
    uniqueAppNames.forEach(appName => {
      if (!loadedAppNames.current.has(appName)) {
        loadedAppNames.current.add(appName)
        textureLoader.current.load(
          `/images/${appName}.png`,
          (texture) => {
            // Set correct color space for the texture
            texture.colorSpace = THREE.SRGBColorSpace
            
            setTextures(prev => {
              const newTextures = new Map(prev)
              newTextures.set(appName, texture)
              return newTextures
            })
            
            // Track texture loading for memory monitoring
            AnimationMemoryMonitor.trackTextureLoaded();
          },
          undefined,
          (error) => {
            console.error(`Error loading texture for app ${appName}:`, error)
            loadedAppNames.current.delete(appName)
          }
        )
      }
    })

    // Cleanup function - only run on component unmount
    return () => {
      loadedAppNames.current.clear()
      textures.forEach(texture => texture.dispose())
    }
  }, [domainDeviceData])

  // Clean up removed devices
  useEffect(() => {
    if (!domainDeviceData) return

    // Clean up removed devices with enhanced animation cancellation
    modelsRef.current.forEach((model, id) => {
      if (!domainDeviceData.find(d => (d.device_id || `device_${domainDeviceData.indexOf(d)}`) === id)) {
        console.log(`Cleaning up removed device: ${id}`);
        
        // Cancel any ongoing animations for this device
        if (targetTransforms.current.has(id)) {
          console.log(`Canceling ongoing animation for removed device: ${id}`);
          const transform = targetTransforms.current.get(id);
          targetTransforms.current.delete(id);
          
          // Track animation completion for memory monitoring
          if (transform) {
            AnimationMemoryMonitor.trackAnimationCompleted();
          }
        }
        
        // Remove from scene and dispose resources with memory tracking
        if (model.parent) {
          model.parent.remove(model);
        }
        cleanupAnimationResources(id, model);
        modelsRef.current.delete(id);
      }
    })

    // Check for orphaned animations (animations without corresponding models)
    const orphanedAnimations: string[] = [];
    targetTransforms.current.forEach((transform, deviceId) => {
      if (!modelsRef.current.has(deviceId)) {
        orphanedAnimations.push(deviceId);
      }
    });
    
    // Clean up orphaned animations
    if (orphanedAnimations.length > 0) {
      console.log(`Cleaning up ${orphanedAnimations.length} orphaned animations:`, orphanedAnimations);
      orphanedAnimations.forEach(deviceId => {
        targetTransforms.current.delete(deviceId);
      });
    }

    return () => {
      // Enhanced cleanup on component unmount
      console.log('DomainDevices component unmounting - cleaning up all resources');
      
      // Cancel all ongoing animations
      if (targetTransforms.current.size > 0) {
        console.log(`Canceling ${targetTransforms.current.size} ongoing animations`);
        targetTransforms.current.clear();
      }
      
      // Dispose all models
      modelsRef.current.forEach((model, id) => {
        console.log(`Disposing model for device: ${id}`);
        if (model.parent) {
          model.parent.remove(model);
        }
        cleanupAnimationResources(id, model);
      });
      modelsRef.current.clear();
      
      // Reset animation state and memory monitor
      lerpingActive.current = false;
      AnimationMemoryMonitor.reset();
    }
  }, [domainDeviceData])

  // Perform lerping in animation frame
  useFrame(({ camera }) => {
    const currentTime = Date.now()
    
    // Increment frame counter for proper debug timing
    AdvancedDebugLogger.incrementFrame()
    
    // Use advanced debug logger for memory status reporting
    const memoryStatus = AnimationMemoryMonitor.getMemoryStatus();
    AdvancedDebugLogger.logMemoryStatus(memoryStatus);
    
    // Check if we have any transforms to lerp
    const hasTransformsToLerp = targetTransforms.current.size > 0;
    
    // Update lerping active state if there are transforms
    if (hasTransformsToLerp) {
      lerpingActive.current = true;
    }
    
    // Perform lerping for all models with target transforms
    if (lerpingActive.current) {
      let stillLerping = false
      let completedAnimations = 0
      let totalAnimations = 0
      
      modelsRef.current.forEach((model, deviceId) => {
        const targetData = targetTransforms.current.get(deviceId)
        
        if (targetData) {
          totalAnimations++
          const deviceType = model.userData.deviceType || 'glasses'
          
          // Calculate how far along the lerp we should be (0 to 1)
          const elapsedTime = currentTime - targetData.startTime
          const t = Math.min(elapsedTime / LERP_DURATION, 1.0)
          
          // Use advanced debug logger for animation progress
          AdvancedDebugLogger.logAnimationProgress(
            deviceId, 
            t, 
            elapsedTime, 
            LERP_DURATION, 
            model.position, 
            targetData.position
          );
          
          if (t < 1.0) {
            // We're still lerping - this is the correct way to detect ongoing animations
            stillLerping = true
            
            // Lerp position 
            model.position.lerpVectors(targetData.startPosition, targetData.position, t)
            
            // Slerp quaternion - this handles orientation
            model.quaternion.slerpQuaternions(targetData.startQuaternion, targetData.quaternion, t)
            
            // Lerp scale
            model.scale.lerpVectors(targetData.startScale, targetData.scale, t)
          } else {
            // Animation completed - count it and set final values
            completedAnimations++
            
            // We've finished lerping, set final values
            model.position.copy(targetData.position)
            model.quaternion.copy(targetData.quaternion)
            model.scale.copy(targetData.scale)
            
            // Log animation completion
            AdvancedDebugLogger.logAnimationLifecycle('Animation completed', deviceId)
            
            // Remove this from target transforms and track completion
            targetTransforms.current.delete(deviceId);
            AnimationMemoryMonitor.trackAnimationCompleted();
          }
          
          // Note: Device-specific rotations are now applied only during model creation
          // This ensures quaternion interpolation is not overwritten during animations
        }
      })
      
      // Update lerping active state based on actual animation progress
      // stillLerping is now correctly set based on whether any animations have t < 1.0
      lerpingActive.current = stillLerping
      
      // Use advanced debug logger for performance metrics
      AdvancedDebugLogger.logPerformanceMetrics(completedAnimations, totalAnimations)
      
      // Debug logging with improved animation state tracking
      if (!stillLerping && hasTransformsToLerp) {
        AdvancedDebugLogger.logAnimationLifecycle('All animations completed', `${completedAnimations}/${totalAnimations}`)
      } else if (stillLerping && totalAnimations > 0) {
        AdvancedDebugLogger.logAnimationLifecycle('Animations in progress', `${totalAnimations - completedAnimations}/${totalAnimations}`)
      }
      
      // Safety check: if we have no target transforms but lerping is still active, deactivate it
      if (targetTransforms.current.size === 0 && lerpingActive.current) {
        AdvancedDebugLogger.logAnimationLifecycle('Safety deactivation', 'No target transforms remaining, stopping lerping')
        lerpingActive.current = false;
      }
    }
    
    // Make all logo quads face the camera (but not text labels)
    modelsRef.current.forEach((model) => {
      if (model.userData.logoQuad) {
        model.userData.logoQuad.lookAt(camera.position)
      }
    })
  })

  // Filter devices by type and render appropriate components
  const glassesDevices = domainDeviceData?.filter(device => 
    !device.device_type || device.device_type === 'glasses'
  ) || []
  
  const phoneDevices = domainDeviceData?.filter(device => 
    device.device_type === 'phone'
  ) || []
  
  const robotDevices = domainDeviceData?.filter(device => 
    device.device_type === 'padbot-robot-w3'
  ) || []

  return (
    <>
      {/* Render glasses devices */}
      {glassesDevices.map((deviceData, index) => (
        <GlassesDevice
          key={deviceData.device_id || `glasses_${index}`}
          deviceData={deviceData}
          index={index}
          textures={textures}
          onTargetTransformSet={handleTargetTransformSet}
          targetTransforms={targetTransforms}
          modelsRef={modelsRef}
        />
      ))}
      
      {/* Render phone devices */}
      {phoneDevices.map((deviceData, index) => (
        <PhoneDevice
          key={deviceData.device_id || `phone_${index}`}
          deviceData={deviceData}
          index={index}
          textures={textures}
          onTargetTransformSet={handleTargetTransformSet}
          targetTransforms={targetTransforms}
          modelsRef={modelsRef}
        />
      ))}
      
      {/* Render robot devices */}
      {robotDevices.map((deviceData, index) => (
        <RobotDevice
          key={deviceData.device_id || `robot_${index}`}
          deviceData={deviceData}
          index={index}
          textures={textures}
          onTargetTransformSet={handleTargetTransformSet}
          targetTransforms={targetTransforms}
          modelsRef={modelsRef}
        />
      ))}
    </>
  )
} 