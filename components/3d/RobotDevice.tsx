"use client"

import { useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { matrixFromPose } from "@/utils/three-utils"
import { 
  DeviceComponentProps, 
  createDebugSphere, 
  applyUnlitMaterials 
} from "./DeviceUtils"
import { 
  DEVICE_SCALES, 
  LOGO_CONFIG, 
  MATERIAL_CONFIG,
  CHANGE_THRESHOLDS,
  ThresholdPerformanceMonitor,
  AdvancedDebugLogger
} from "./DeviceConstants"

/**
 * Component for rendering robot devices (padbot-robot-w3)
 */
export function RobotDevice({ 
  deviceData, 
  index, 
  textures, 
  onTargetTransformSet, 
  targetTransforms, 
  modelsRef 
}: DeviceComponentProps) {
  const { scene } = useThree()
  const robotGltf = useGLTF('/padbot-robot-w3.glb')
  
  // Reuse matrix to avoid creating new ones
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  
  // Helper vectors for decomposing matrix
  const tempPosition = useMemo(() => new THREE.Vector3(), [])
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  // Robot-specific scale
  const getRobotScale = () => DEVICE_SCALES.ROBOT.clone()

  // Robot-specific logo configuration
  const createRobotLogoQuad = (parentModel: THREE.Group, appName: string, texture: THREE.Texture, parentScale: THREE.Vector3) => {
    const config = LOGO_CONFIG.ROBOT
    const imageAspectRatio = texture.image.width / texture.image.height
    const logoWidth = config.HEIGHT * imageAspectRatio
    
    const logoGeometry = new THREE.PlaneGeometry(logoWidth, config.HEIGHT)
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: MATERIAL_CONFIG.LOGO.TRANSPARENT,
      side: MATERIAL_CONFIG.LOGO.SIDE,
      alphaTest: MATERIAL_CONFIG.LOGO.ALPHA_TEST,
      premultipliedAlpha: MATERIAL_CONFIG.LOGO.PREMULTIPLIED_ALPHA,
      toneMapped: MATERIAL_CONFIG.LOGO.TONE_MAPPED
    })

    const logoQuad = new THREE.Mesh(logoGeometry, logoMaterial)
    
    // Robot-specific positioning
    logoQuad.position.copy(config.POSITION)
    logoQuad.rotation.x = config.ROTATION_X
    
    // Robot-specific scaling
    logoQuad.scale.set(
      config.SCALE_FACTOR / parentScale.x,
      config.SCALE_FACTOR / parentScale.y,
      config.SCALE_FACTOR / parentScale.z
    )
    
    parentModel.add(logoQuad)
    parentModel.userData.logoQuad = logoQuad
  }

  // Helper function to apply robot-specific rotations
  const applyRobotRotation = (model: THREE.Group) => {
    // Future robot-specific rotations can be added here
    // model.rotateX(-Math.PI / 2)
    // model.rotateZ(Math.PI / 2)
  }

  useEffect(() => {
    const pose = deviceData.pose
    const deviceId = deviceData.device_id || `device_${index}`
    const appName = deviceData.name
    
    if (!pose) {
      console.warn(`RobotDevice: Device ${deviceId} doesn't contain pose information`)
      return
    }

    const robotScene = robotGltf.scene
    if (!robotScene) {
      console.warn("RobotDevice: Missing robot model")
      return
    }

    let model = modelsRef.current.get(deviceId)
    
    // Create new model if it doesn't exist
    if (!model) {
      const scale = getRobotScale()
      model = robotScene.clone()
      model.scale.copy(scale)
      
      // Apply unlit materials
      applyUnlitMaterials(model)
      
      // Position new models directly at their target position - no initial lerp needed
      if (matrixFromPose(pose, matrix)) {
        // For new models, set the position directly - skip lerping for first position
        matrix.decompose(model.position, model.quaternion, model.scale)
        // Override scale with our device-specific scale
        model.scale.copy(scale)
        
        // Apply robot-specific rotation
        applyRobotRotation(model)
      }
      
      scene.add(model)
      modelsRef.current.set(deviceId, model)
      
      // Store device type for later reference
      model.userData.deviceType = 'padbot-robot-w3'
      // Flag this as an initialized model that should lerp in future updates
      model.userData.isInitialized = true;

      // Add debug sphere
      createDebugSphere(model, scale)

      // Create robot-specific logo quad if texture is loaded
      if (appName && textures.has(appName)) {
        createRobotLogoQuad(model, appName, textures.get(appName)!, scale)
      }
    } else if (appName && textures.has(appName) && !model.userData.logoQuad) {
      // For existing models, get scale from current model
      createRobotLogoQuad(model, appName, textures.get(appName)!, model.scale)
    }
    
    // Set target transform for lerping
    if (matrixFromPose(pose, matrix)) {
      // Decompose the matrix into position, quaternion, and scale
      matrix.decompose(tempPosition, tempQuaternion, tempScale)
      
      // Get the scale based on device type (don't use tempScale from the matrix)
      const deviceScale = getRobotScale()
      
      // Store starting values based on current model state
      const startPosition = model.position.clone();
      const startQuaternion = model.quaternion.clone();
      const startScale = model.scale.clone();

      // Use advanced debug logger for transform debugging
      AdvancedDebugLogger.logThresholdEvent('Setting lerp transform', {
        deviceId,
        start: `${startPosition.x.toFixed(2)},${startPosition.y.toFixed(2)},${startPosition.z.toFixed(2)}`,
        end: `${tempPosition.x.toFixed(2)},${tempPosition.y.toFixed(2)},${tempPosition.z.toFixed(2)}`,
        distance: `${startPosition.distanceTo(tempPosition).toFixed(2)} units`
      });
      
      // Only start lerping if there's a significant change in position or rotation
      // AND if the model has been initialized (not first creation)
      const positionChanged = startPosition.distanceTo(tempPosition) > CHANGE_THRESHOLDS.POSITION;
      const quaternionChanged = (1 - Math.abs(startQuaternion.dot(tempQuaternion))) > CHANGE_THRESHOLDS.QUATERNION;
      const scaleChanged = !startScale.equals(deviceScale);
      
      AdvancedDebugLogger.logThresholdEvent('Change detection', {
        deviceId,
        position: positionChanged,
        rotation: quaternionChanged,
        scale: scaleChanged
      });
      
      // Track performance for threshold optimization
      const shouldAnimate = positionChanged || quaternionChanged || scaleChanged;
      if (shouldAnimate) {
        ThresholdPerformanceMonitor.recordAnimationTriggered();
      } else {
        ThresholdPerformanceMonitor.recordAnimationSkipped();
      }
      
      // Always lerp for existing models, they should transition to new positions smoothly
      if (shouldAnimate) {
        AdvancedDebugLogger.logAnimationLifecycle('Starting lerp animation', deviceId);
        
        // Store the current state as starting point for lerping
        // and the target state to lerp toward
        const targetTransform = {
          // Target transform (destination)
          position: tempPosition.clone(),
          quaternion: tempQuaternion.clone(),
          scale: deviceScale.clone(),
          
          // Starting transform (where the animation begins) - use current model state
          startPosition: startPosition,
          startQuaternion: startQuaternion,
          startScale: startScale,
          startTime: Date.now()
        };
        
        onTargetTransformSet(deviceId, targetTransform);
      }
    }
  }, [deviceData, textures, scene, robotGltf, matrix, tempPosition, tempQuaternion, tempScale, index, onTargetTransformSet, modelsRef])

  return null
}

// Preload the robot model
useGLTF.preload('/padbot-robot-w3.glb') 