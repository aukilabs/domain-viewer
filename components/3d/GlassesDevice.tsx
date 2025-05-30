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
  TEXT_LABEL_CONFIG, 
  MATERIAL_CONFIG,
  CHANGE_THRESHOLDS,
  DEBUG_LOGGING,
  ThresholdPerformanceMonitor,
  AdvancedDebugLogger
} from "./DeviceConstants"

/**
 * Component for rendering glasses devices with text labels and branding
 */
export function GlassesDevice({ 
  deviceData, 
  index, 
  textures, 
  onTargetTransformSet, 
  targetTransforms, 
  modelsRef 
}: DeviceComponentProps) {
  const { scene } = useThree()
  const glassesGltf = useGLTF('/glasses.glb')
  
  // Reuse matrix to avoid creating new ones
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  
  // Helper vectors for decomposing matrix
  const tempPosition = useMemo(() => new THREE.Vector3(), [])
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  // Glasses-specific scale
  const getGlassesScale = () => DEVICE_SCALES.GLASSES.clone()

  // Glasses-specific logo configuration
  const createGlassesLogoQuad = (parentModel: THREE.Group, appName: string, texture: THREE.Texture, parentScale: THREE.Vector3) => {
    const config = LOGO_CONFIG.GLASSES
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
    
    // Glasses-specific positioning
    logoQuad.position.copy(config.POSITION)
    logoQuad.rotation.x = config.ROTATION_X
    
    // Glasses-specific scaling
    logoQuad.scale.set(
      config.SCALE_FACTOR / parentScale.x,
      config.SCALE_FACTOR / parentScale.y,
      config.SCALE_FACTOR / parentScale.z
    )
    
    parentModel.add(logoQuad)
    parentModel.userData.logoQuad = logoQuad
  }

  // Helper function to add text label to glasses
  const addTextLabel = (parentModel: THREE.Group, parentScale: THREE.Vector3) => {
    const config = TEXT_LABEL_CONFIG
    const textGroup = new THREE.Group();
    
    // Create text material with wider canvas
    const canvas = document.createElement('canvas');
    canvas.width = config.CANVAS.WIDTH
    canvas.height = config.CANVAS.HEIGHT
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = `${config.FONT.WEIGHT} ${config.FONT.SIZE}px ${config.FONT.FAMILY}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = config.FONT.COLOR;
      context.fillText(config.TEXT.LINE_1, canvas.width/2, canvas.height/2 - config.TEXT.LINE_OFFSET);
      context.fillText(config.TEXT.LINE_2, canvas.width/2, canvas.height/2 + config.TEXT.LINE_OFFSET);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    // Set correct color space
    texture.colorSpace = THREE.SRGBColorSpace;
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: MATERIAL_CONFIG.TEXT.TRANSPARENT,
      depthWrite: MATERIAL_CONFIG.TEXT.DEPTH_WRITE,
      side: MATERIAL_CONFIG.TEXT.SIDE,
      toneMapped: MATERIAL_CONFIG.TEXT.TONE_MAPPED,
      premultipliedAlpha: MATERIAL_CONFIG.TEXT.PREMULTIPLIED_ALPHA
    });
    
    // Use geometry from config
    const geometry = new THREE.PlaneGeometry(config.GEOMETRY.WIDTH, config.GEOMETRY.HEIGHT);
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Set the position from config
    textMesh.position.copy(config.POSITION);
    
    // Set rotation from config
    textMesh.rotation.z = config.ROTATION_Z;
    
    // Apply inverse scaling with config scale factor
    textMesh.scale.set(
      config.SCALE_FACTOR / parentScale.x,
      -config.SCALE_FACTOR / parentScale.y,
      config.SCALE_FACTOR / parentScale.z
    );
    
    textGroup.add(textMesh);
    parentModel.add(textGroup);
    parentModel.userData.textLabel = textGroup;
  }

  useEffect(() => {
    const pose = deviceData.pose
    const deviceId = deviceData.device_id || `device_${index}`
    const appName = deviceData.name
    
    if (!pose) {
      console.warn(`GlassesDevice: Device ${deviceId} doesn't contain pose information`)
      return
    }

    const glassesScene = glassesGltf.scene
    if (!glassesScene) {
      console.warn("GlassesDevice: Missing glasses model")
      return
    }

    let model = modelsRef.current.get(deviceId)
    
    // Create new model if it doesn't exist
    if (!model) {
      const scale = getGlassesScale()
      model = glassesScene.clone()
      model.scale.copy(scale)
      
      // Apply unlit materials
      applyUnlitMaterials(model)
      
      // Position new models directly at their target position - no initial lerp needed
      if (matrixFromPose(pose, matrix)) {
        // For new models, set the position directly - skip lerping for first position
        matrix.decompose(model.position, model.quaternion, model.scale)
        // Override scale with our device-specific scale
        model.scale.copy(scale)
        
        // No rotation needed for glasses
      }
      
      scene.add(model)
      modelsRef.current.set(deviceId, model)
      
      // Store device type for later reference
      model.userData.deviceType = 'glasses'
      // Flag this as an initialized model that should lerp in future updates
      model.userData.isInitialized = true;

      // Add debug sphere
      createDebugSphere(model, scale)

      // Create glasses-specific logo quad if texture is loaded
      if (appName && textures.has(appName)) {
        createGlassesLogoQuad(model, appName, textures.get(appName)!, scale)
      }
      
      // Add text label for glasses models
      addTextLabel(model, scale);
    } else if (appName && textures.has(appName) && !model.userData.logoQuad) {
      // For existing models, get scale from current model
      createGlassesLogoQuad(model, appName, textures.get(appName)!, model.scale)
    }
    
    // Set target transform for lerping
    if (matrixFromPose(pose, matrix)) {
      // Decompose the matrix into position, quaternion, and scale
      matrix.decompose(tempPosition, tempQuaternion, tempScale)
      
      // Get the scale based on device type (don't use tempScale from the matrix)
      const deviceScale = getGlassesScale()
      
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
  }, [deviceData, textures, scene, glassesGltf, matrix, tempPosition, tempQuaternion, tempScale, index, onTargetTransformSet, modelsRef])

  return null
}

// Preload the glasses model
useGLTF.preload('/glasses.glb') 