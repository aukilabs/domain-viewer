"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF, Text } from "@react-three/drei"
import { CustomGrid } from "./CustomGrid"
import { useEffect, useRef, useState, useMemo } from "react"
import * as THREE from "three"
import { plyAsyncParse } from "@/utils/ply-parser.web"
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Portal } from "@/utils/posemeshClientApi"
import { matrixFromPose } from "@/utils/three-utils"
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

/**
 * Device data interface for displaying devices in 3D space
 */
interface DeviceData {
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
 * Props for the main Viewer3D component
 */
interface Viewer3DProps {
  pointCloudData: ArrayBuffer | null
  portals?: Portal[] | null
  occlusionMeshData: ArrayBuffer | null
  navMeshData: ArrayBuffer | null
  portalsVisible?: boolean
  navMeshVisible?: boolean
  occlusionVisible?: boolean
  pointCloudVisible?: boolean
  scan3DVisible?: boolean
  domainDeviceData?: DeviceData[] | null
}

/**
 * Renders a point cloud from PLY file data with vertex colors.
 * 
 * @param data - ArrayBuffer containing the PLY file data
 */
function PointCloud({ data }: { data: ArrayBuffer }) {
  const { scene } = useThree()
  const pointsRef = useRef<THREE.Points | null>(null)

  useEffect(() => {
    if (!data) return

    const cleanupRef = { current: () => {} }

    plyAsyncParse(data, true).then((geometry) => {
      const material = new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: true,
        opacity: 1,
        transparent: true,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)
      pointsRef.current = points
      
      // Define cleanup for this effect
      cleanupRef.current = () => {
        scene.remove(points)
        geometry.dispose()
        material.dispose()
      }
    }).catch(error => {
      console.error("Error parsing PLY data:", error)
    })

    return () => {
      cleanupRef.current()
    }
  }, [data, scene])

  return null
}

/**
 * Renders portal markers (QR codes) at specified positions and orientations.
 * Uses a 3D model loaded from QR.glb.
 * 
 * @param portals - Array of Portal objects containing position and orientation data
 */
function Portals({ portals = [] }: { portals: Portal[] | null | undefined }) {
  const { scene: gltfScene } = useGLTF('/QR.glb')
  const { scene } = useThree()
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const matrix = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    if (!gltfScene || !portals || portals.length === 0) return

    // Create or update models for each portal
    portals.forEach(portal => {
      let model: THREE.Group
      
      if (modelsRef.current.has(portal.id)) {
        model = modelsRef.current.get(portal.id)!
      } else {
        model = gltfScene.clone()
        scene.add(model)
        modelsRef.current.set(portal.id, model)
      }

      // Set portal position and rotation
      if (matrixFromPose(portal, matrix)) {
        matrix.decompose(model.position, model.quaternion, model.scale)
        
        // Apply the reported size if available
        if (portal.reported_size) {
          const size = portal.reported_size * 0.01 // Convert to meters
          model.scale.setScalar(size)
        }
      }
    })

    // Cleanup removed portals
    modelsRef.current.forEach((model, id) => {
      if (!portals.find(p => p.id === id)) {
        scene.remove(model)
        disposeModel(model)
        modelsRef.current.delete(id)
      }
    })

    // Cleanup function
    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model)
        disposeModel(model)
      })
      modelsRef.current.clear()
    }
  }, [gltfScene, scene, portals, matrix])

  return null
}

/**
 * Helper function to dispose of Three.js model resources
 */
function disposeModel(model: THREE.Object3D) {
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose()
      }
      if (object.material instanceof THREE.Material) {
        object.material.dispose()
      } else if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose())
      }
    }
  })
}

/**
 * Controls camera behavior including auto-rotation when idle.
 * 
 * @param pointCloudData - Point cloud data used to determine if content is loaded
 */
function CameraController({ pointCloudData }: { pointCloudData: ArrayBuffer | null }) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [isIdle, setIsIdle] = useState(false)
  const lastInteractionTime = useRef(Date.now())
  const animationRef = useRef<number | null>(null)
  
  // Time before starting auto-rotation (ms)
  const IDLE_TIMEOUT = 500000

  const resetIdleTimer = () => {
    lastInteractionTime.current = Date.now()
    if (isIdle) {
      setIsIdle(false)
    }
  }

  const startOrbitAnimation = () => {
    if (controlsRef.current && !animationRef.current) {
      const animate = () => {
        if (controlsRef.current) {
          controlsRef.current.autoRotate = true
          controlsRef.current.update()
        }
        animationRef.current = requestAnimationFrame(animate)
      }
      animate()
    }
  }

  const stopOrbitAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false
    }
  }

  // Check for idle state in animation frame
  useFrame(() => {
    if (pointCloudData && !isIdle && 
        Date.now() - lastInteractionTime.current > IDLE_TIMEOUT) {
      setIsIdle(true)
      startOrbitAnimation()
    }
  })

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const handleStart = () => {
    resetIdleTimer()
    stopOrbitAnimation()
  }

  const handleEnd = () => {
    resetIdleTimer()
  }

  return (
    <OrbitControls
      ref={controlsRef}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      makeDefault
      autoRotateSpeed={0.5}
      enableDamping={true}
      dampingFactor={0.05}
      onStart={handleStart}
      onEnd={handleEnd}
      onChange={resetIdleTimer}
    />
  )
}

/**
 * Renders the occlusion mesh that represents physical barriers in the space.
 * 
 * @param occlusionMeshData - ArrayBuffer containing the OBJ file data
 */
function OcclusionMesh({ occlusionMeshData }: { occlusionMeshData: ArrayBuffer | null }) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!occlusionMeshData) return

    const loader = new OBJLoader()
    const objString = new TextDecoder().decode(occlusionMeshData)
    const obj = loader.parse(objString)
    
    // Create a group to hold all meshes
    const group = new THREE.Group()
    
    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create wireframe geometry
        const wireframe = new THREE.WireframeGeometry(child.geometry)
        const edges = new THREE.LineSegments(
          wireframe,
          new THREE.LineBasicMaterial({ color: 0x303030 })
        )

        // Create mesh with transparent faces
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({ 
            color: 0x808080,
            transparent: true,
            opacity: 0.8
          })
        )

        group.add(mesh)
        group.add(edges)
      }
    })

    scene.add(group)
    groupRef.current = group

    return () => {
      if (groupRef.current) {
        scene.remove(group)
        disposeModel(group)
      }
    }
  }, [occlusionMeshData, scene])

  return null
}

/**
 * Renders the navigation mesh that represents walkable areas in the space.
 * 
 * @param navMeshData - ArrayBuffer containing the OBJ file data
 */
function NavMesh({ navMeshData }: { navMeshData: ArrayBuffer | null }) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!navMeshData) return

    const loader = new OBJLoader()
    const objString = new TextDecoder().decode(navMeshData)
    const obj = loader.parse(objString)
    
    // Create a group to hold all meshes
    const group = new THREE.Group()
    
    // Process all children in the OBJ
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = new THREE.Mesh(
          child.geometry,
          new THREE.MeshBasicMaterial({ 
            color: 0x2B4D2B,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          })
        )
        group.add(mesh)
      }
    })

    scene.add(group)
    groupRef.current = group

    return () => {
      if (groupRef.current) {
        scene.remove(group)
        disposeModel(group)
      }
    }
  }, [navMeshData, scene])

  return null
}

/**
 * Renders a 3D scan model from a GLB file.
 */
function Scan3D() {
  const { scene } = useThree()
  // const { scene: gltfScene } = useGLTF('/L10CommonSpace.glb')
  const { scene: gltfScene } = useGLTF('/lounge.glb')
  const modelRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!gltfScene) return

    // Clone the model to avoid modifying the cached original
    const model = gltfScene.clone()
    
    // Apply offset along Z axis
    model.position.set(1, 0, 2)
    
    // Add the model to the scene
    scene.add(model)
    modelRef.current = model

    return () => {
      if (modelRef.current) {
        scene.remove(model)
        disposeModel(model)
      }
    }
  }, [gltfScene, scene])

  return null
}

/**
 * Renders 3D device models at the poses specified in domainDeviceData.
 * Supports different device types like glasses and phones.
 * 
 * @param domainDeviceData - Array of device data containing pose and type information
 */
function DomainDevices3D({ domainDeviceData }: { domainDeviceData: DeviceData[] | null }) {
  const { scene } = useThree()
  const glassesGltf = useGLTF('/glasses.glb')
  const phoneGltf = useGLTF('/smartphone.glb')
  const robotGltf = useGLTF('/padbot-robot-w3.glb')
  
  // Store references to all device models in the scene
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const [lastUpdate, setLastUpdate] = useState<string>("")
  
  // Store and manage textures for app logos
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(new Map())
  const textureLoader = useRef(new THREE.TextureLoader())
  const loadedAppNames = useRef<Set<string>>(new Set())
  
  // Reuse matrix to avoid creating new ones
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  
  // Store the target transforms for lerping
  const targetTransforms = useRef(new Map<string, {
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    scale: THREE.Vector3,
    startPosition: THREE.Vector3,
    startQuaternion: THREE.Quaternion,
    startScale: THREE.Vector3,
    startTime: number
  }>())
  
  // Lerping configuration
  const LERP_DURATION = 2000 // 2 seconds in milliseconds (reduced from 10 seconds)
  const lerpingActive = useRef(false)
  
  // Helper vectors for decomposing matrix
  const tempPosition = useMemo(() => new THREE.Vector3(), [])
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])

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
  }, [domainDeviceData]) // Remove textures from dependencies

  // Update device models when device data or textures change
  useEffect(() => {
    if (!domainDeviceData) return
    
    // Extract required scenes from loaded GLTF
    const glassesScene = glassesGltf.scene
    const phoneScene = phoneGltf.scene
    const robotScene = robotGltf.scene

    if (!glassesScene || !phoneScene || !robotScene) {
      console.warn("DomainDevices3D: Missing one or more device models")
      return
    }

    // Process each device data item
    domainDeviceData.forEach((deviceData, index) => {
      const pose = deviceData.pose
      const deviceId = deviceData.device_id || `device_${index}`
      const deviceType = deviceData.device_type || 'glasses'
      const appName = deviceData.name
      
      if (!pose) {
        console.warn(`DomainDevices3D: Device ${deviceId} doesn't contain pose information`)
        return
      }
      
      let model = modelsRef.current.get(deviceId)
      
      // Create new model if it doesn't exist
      if (!model) {
        // Choose the appropriate model based on device type
        let sourceScene: THREE.Group
        let scale = new THREE.Vector3(0.5, 0.5, 0.5)
        
        switch (deviceType) {
          case 'phone':
            sourceScene = phoneScene
            scale.set(0.5, 0.5, 0.5)
            break
          case 'padbot-robot-w3':
            sourceScene = robotScene
            scale.set(1, 1, 1)
            break
          default:
            sourceScene = glassesScene
            scale.set(1.5, 1.5, 1.5)  // Increased from 0.5 to 1.5 (3x larger)
        }
        
        model = sourceScene.clone()
        model.scale.copy(scale)
        
        // Apply unlit materials to all device models, not just glasses
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
              transparent: originalMaterial.transparent || false,
              opacity: originalMaterial.opacity || 1.0,
              side: originalMaterial.side || THREE.FrontSide
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
        
        // Position new models directly at their target position - no initial lerp needed
        if (matrixFromPose(pose, matrix)) {
          // For new models, set the position directly - skip lerping for first position
          matrix.decompose(model.position, model.quaternion, model.scale)
          // Override scale with our device-specific scale
          model.scale.copy(scale)
          
          // Apply device-specific rotation
          applyDeviceRotation(model, deviceType)
        }
        
        scene.add(model)
        modelsRef.current.set(deviceId, model)
        
        // Store device type for later reference
        model.userData.deviceType = deviceType
        // Flag this as an initialized model that should lerp in future updates
        model.userData.isInitialized = true;

        // Add a debug sphere
        const debugSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        )
        debugSphere.userData.isDebugSphere = true
        
        // Apply inverse scaling to the debug sphere to maintain consistent size
        const inverseScale = new THREE.Vector3(
          0.2 / scale.x,
          0.2 / scale.y,
          0.2 / scale.z
        )
        debugSphere.scale.copy(inverseScale)
        
        // Hide the debug sphere
        debugSphere.visible = false
        
        model.add(debugSphere)

        // Create logo quad if texture is loaded
        if (appName && textures.has(appName)) {
          createLogoQuad(model, appName, textures.get(appName)!, scale)
        }
        
        // Add text label for glasses models
        if (deviceType === 'glasses') {
          addTextLabel(model, scale);
        }
      } else if (appName && textures.has(appName) && !model.userData.logoQuad) {
        // For existing models, get scale from current model
        createLogoQuad(model, appName, textures.get(appName)!, model.scale)
      }
      
      // Set target transform for lerping
      if (matrixFromPose(pose, matrix)) {
        // Decompose the matrix into position, quaternion, and scale
        matrix.decompose(tempPosition, tempQuaternion, tempScale)
        
        // Get the scale based on device type (don't use tempScale from the matrix)
        const deviceScale = getScaleForDeviceType(deviceType)
        
        // Store starting values based on current model state
        const startPosition = model.position.clone();
        const startQuaternion = model.quaternion.clone();
        const startScale = model.scale.clone();

        // For debugging
        console.log(`Setting lerp for ${deviceId}:`);
        console.log(`  Start: ${startPosition.x.toFixed(2)},${startPosition.y.toFixed(2)},${startPosition.z.toFixed(2)}`);
        console.log(`  End:   ${tempPosition.x.toFixed(2)},${tempPosition.y.toFixed(2)},${tempPosition.z.toFixed(2)}`);
        console.log(`  Distance: ${startPosition.distanceTo(tempPosition).toFixed(2)} units`);
        
        // Only start lerping if there's a significant change in position or rotation
        // AND if the model has been initialized (not first creation)
        const positionChanged = startPosition.distanceTo(tempPosition) > 0.001;
        const quaternionChanged = (1 - Math.abs(startQuaternion.dot(tempQuaternion))) > 0.001;
        const scaleChanged = !startScale.equals(deviceScale);
        
        console.log(`Changes detected - position: ${positionChanged}, rotation: ${quaternionChanged}, scale: ${scaleChanged}`);
        
        // Always lerp for existing models, they should transition to new positions smoothly
        if (positionChanged || quaternionChanged || scaleChanged) {
          console.log(`Starting lerp animation for ${deviceId}`);
          
          // Store the current state as starting point for lerping
          // and the target state to lerp toward
          targetTransforms.current.set(deviceId, {
            // Target transform (destination)
            position: tempPosition.clone(),
            quaternion: tempQuaternion.clone(),
            scale: deviceScale.clone(),
            
            // Starting transform (where the animation begins) - use current model state
            startPosition: startPosition,
            startQuaternion: startQuaternion,
            startScale: startScale,
            startTime: Date.now()
          });
          
          // Indicate that we need to lerp in the animation frame
          lerpingActive.current = true;
          setLastUpdate(new Date().toISOString());
        }
      }
    });

    // Clean up removed devices
    modelsRef.current.forEach((model, id) => {
      if (!domainDeviceData.find(d => (d.device_id || `device_${domainDeviceData.indexOf(d)}`) === id)) {
        scene.remove(model)
        disposeModel(model)
        modelsRef.current.delete(id)
        targetTransforms.current.delete(id)
      }
    });

    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model)
        disposeModel(model)
      })
      modelsRef.current.clear()
      targetTransforms.current.clear()
    }
  }, [domainDeviceData, textures, scene, glassesGltf, phoneGltf, robotGltf, matrix, tempPosition, tempQuaternion, tempScale])

  // Helper function to get scale based on device type
  const getScaleForDeviceType = (deviceType: string): THREE.Vector3 => {
    switch (deviceType) {
      case 'phone':
        return new THREE.Vector3(0.5, 0.5, 0.5)
      case 'padbot-robot-w3':
        return new THREE.Vector3(1, 1, 1)
      default:
        return new THREE.Vector3(1.5, 1.5, 1.5)  // Increased from 0.5 to 1.5 (3x larger)
    }
  }
  
  // Helper function to apply device-specific rotations
  const applyDeviceRotation = (model: THREE.Group, deviceType: string) => {
    // Apply device-specific rotations
    if (deviceType === 'glasses') {
      // No rotation for glasses
    }
    else if (deviceType === 'padbot-robot-w3') {
      // model.rotateX(-Math.PI / 2)
      // model.rotateZ(Math.PI / 2)
    }
  }

  // Helper function to create the logo quad
  const createLogoQuad = (parentModel: THREE.Group, appName: string, texture: THREE.Texture, parentScale: THREE.Vector3) => {
    const imageAspectRatio = texture.image.width / texture.image.height
    const logoHeight = 0.25
    const logoWidth = logoHeight * imageAspectRatio
    
    const logoGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight)
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
      // Don't premultiply alpha to preserve color integrity
      premultipliedAlpha: false,
      // Use correct color management
      toneMapped: false
    })

    const logoQuad = new THREE.Mesh(logoGeometry, logoMaterial)
    logoQuad.position.set(0.1, 1.3, 0)
    logoQuad.rotation.x = -Math.PI / 2
    
    // Apply inverse scaling to the logo to maintain consistent size
    logoQuad.scale.set(
      0.6 / parentScale.x,
      0.6 / parentScale.y,
      0.6 / parentScale.z
    )
    
    parentModel.add(logoQuad)
    parentModel.userData.logoQuad = logoQuad
  }

  // Helper function to add text label to glasses
  const addTextLabel = (parentModel: THREE.Group, parentScale: THREE.Vector3) => {
    // Create text mesh using drei's Text component
    const textGroup = new THREE.Group();
    
    // Create text material with wider canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;  // Increased from 256 to 512 for more space
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = 'bold 20px Arial';  // Reduced font size slightly
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#00FF00';
      context.fillText('Powered by AugmentOS', canvas.width/2, canvas.height/2 - 15);
      context.fillText('and Auki Network', canvas.width/2, canvas.height/2 + 15);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    // Set correct color space
    texture.colorSpace = THREE.SRGBColorSpace;
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      // Add color management settings
      toneMapped: false,
      premultipliedAlpha: false
    });
    
    // Use a wider geometry to match the new canvas aspect ratio
    const geometry = new THREE.PlaneGeometry(2, 0.5);  // Made wider
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Set the fixed position offset relative to the glasses model
    textMesh.position.set(-0.01, 0.037, -0.01);
    
    // Rotate the text 90 degrees around the Y axis
    textMesh.rotation.z = Math.PI / 2; // 90 degrees in radians
    
    // Apply inverse scaling to maintain consistent size, but scale down
    textMesh.scale.set(
      0.04 / parentScale.x,  // Adjusted scale
      -0.04 / parentScale.y,
      0.04 / parentScale.z
    );
    
    textGroup.add(textMesh);
    parentModel.add(textGroup);
    parentModel.userData.textLabel = textGroup;
  }

  // Perform lerping in animation frame
  useFrame(({ camera }) => {
    const currentTime = Date.now()
    
    // Check if we have any transforms to lerp
    const hasTransformsToLerp = targetTransforms.current.size > 0;
    
    // Update lerping active state if there are transforms
    if (hasTransformsToLerp) {
      lerpingActive.current = true;
    }
    
    // Perform lerping for all models with target transforms
    if (lerpingActive.current) {
      let stillLerping = false
      
      modelsRef.current.forEach((model, deviceId) => {
        const targetData = targetTransforms.current.get(deviceId)
        
        if (targetData) {
          const deviceType = model.userData.deviceType || 'glasses'
          
          // Calculate how far along the lerp we should be (0 to 1)
          const elapsedTime = currentTime - targetData.startTime
          const t = Math.min(elapsedTime / LERP_DURATION, 1.0)
          
          // For debugging, log progress occasionally
          if (elapsedTime % 500 < 16) { // Log every half second
            console.log(`Lerping ${deviceId}: t=${t.toFixed(2)}, elapsed=${elapsedTime}ms of ${LERP_DURATION}ms`);
            console.log(`  pos: ${model.position.x.toFixed(2)},${model.position.y.toFixed(2)},${model.position.z.toFixed(2)} -> ${targetData.position.x.toFixed(2)},${targetData.position.y.toFixed(2)},${targetData.position.z.toFixed(2)}`);
          }
          
          if (t < 1.0) {
            // We're still lerping
            stillLerping = true
            
            // Lerp position 
            model.position.lerpVectors(targetData.startPosition, targetData.position, t)
            
            // Slerp quaternion - this handles orientation
            model.quaternion.slerpQuaternions(targetData.startQuaternion, targetData.quaternion, t)
            
            // Lerp scale
            model.scale.lerpVectors(targetData.startScale, targetData.scale, t)
          } else {
            // We've finished lerping, set final values
            model.position.copy(targetData.position)
            model.quaternion.copy(targetData.quaternion)
            model.scale.copy(targetData.scale)
            
            // Remove this from target transforms
            targetTransforms.current.delete(deviceId);
          }
          
          // Apply device-specific rotations after lerping the base transformation
          // But first, reset rotation to avoid accumulation
          model.rotation.set(0, 0, 0);
          applyDeviceRotation(model, deviceType);
        }
      })
      
      // Only set to false if there are no remaining transforms to lerp
      stillLerping = targetTransforms.current.size > 0;
      lerpingActive.current = stillLerping
      
      // Debug logging when lerping stops
      if (!stillLerping && hasTransformsToLerp) {
        console.log('All lerping animations completed');
      }
    }
    
    // Make all logo quads face the camera (but not text labels)
    modelsRef.current.forEach((model) => {
      if (model.userData.logoQuad) {
        model.userData.logoQuad.lookAt(camera.position)
      }
    })
  })

  return null
}

/**
 * Main 3D visualization component that renders the domain data using Three.js.
 * Handles rendering of point clouds, portals, navigation meshes, and occlusion meshes.
 */
export default function Viewer3D({ 
  pointCloudData, 
  portals = [], 
  occlusionMeshData, 
  navMeshData, 
  portalsVisible = true,
  navMeshVisible = true,
  occlusionVisible = true,
  pointCloudVisible = true,
  scan3DVisible = true,
  domainDeviceData = null
}: Viewer3DProps) {
  return (
    <div className="w-full h-full bg-[#131313]">
      <Canvas 
        camera={{ position: [15, 15, 15], fov: 50 }}
        gl={{ 
          // Enable proper color rendering
          outputColorSpace: THREE.SRGBColorSpace,
          // Enable proper alpha blending for textures
          premultipliedAlpha: false
        }}
      >
        <color attach="background" args={["#131313"]} />
        <ambientLight intensity={0.5} />
        <directionalLight intensity={0.5} position={[10, 100, 10]} />
        
        {/* Static elements */}
        <CustomGrid />
        
        {/* Conditional rendering based on visibility flags */}
        {pointCloudVisible && pointCloudData && (
          <PointCloud data={pointCloudData} />
        )}
        
        {portalsVisible && portals && (
          <Portals portals={portals} />
        )}
        
        {occlusionVisible && occlusionMeshData && (
          <OcclusionMesh occlusionMeshData={occlusionMeshData} />
        )}
        
        {navMeshVisible && navMeshData && (
          <NavMesh navMeshData={navMeshData} />
        )}
        
        {/* {scan3DVisible && (
          <Scan3D />
        )} */}
        
        {domainDeviceData && (
          <DomainDevices3D domainDeviceData={domainDeviceData} />
        )}
        
        <CameraController pointCloudData={pointCloudData} />
      </Canvas>
    </div>
  )
}

// Preload all GLTF models
useGLTF.preload('/QR.glb')
// useGLTF.preload('/L10CommonSpace.glb')
// useGLTF.preload('/lounge.glb')
useGLTF.preload('/glasses.glb')
useGLTF.preload('/smartphone.glb')
useGLTF.preload('/padbot-robot-w3.glb')

