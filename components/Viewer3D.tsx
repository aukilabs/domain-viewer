"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF } from "@react-three/drei"
import { CustomGrid } from "./CustomGrid"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { plyAsyncParse } from "@/utils/ply-parser.web"
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Portal } from "@/utils/posemeshClientApi"
import { matrixFromPose } from "@/utils/three-utils"
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

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
  domainDeviceData?: any
}

function parseASCIIPLY(data: ArrayBuffer): THREE.BufferGeometry {
  const text = new TextDecoder().decode(data)
  const lines = text.split("\n")

  let vertexCount = 0
  let headerEnd = 0

  // Parse header
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("element vertex")) {
      vertexCount = Number.parseInt(lines[i].split(" ")[2])
    }
    if (lines[i].trim() === "end_header") {
      headerEnd = i + 1
      break
    }
  }

  // Parse vertex data
  const positions = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 3)

  for (let i = 0; i < vertexCount; i++) {
    const parts = lines[i + headerEnd].trim().split(" ")
    positions[i * 3] = Number.parseFloat(parts[0])
    positions[i * 3 + 1] = Number.parseFloat(parts[1])
    positions[i * 3 + 2] = Number.parseFloat(parts[2])
    colors[i * 3] = Number.parseInt(parts[3]) / 255.0
    colors[i * 3 + 1] = Number.parseInt(parts[4]) / 255.0
    colors[i * 3 + 2] = Number.parseInt(parts[5]) / 255.0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

  return geometry
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

    plyAsyncParse(data, true).then((geometry) => {
      console.log("completed parse ply")
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
    })

    // const geometry = parseASCIIPLY(data)

    return () => {
      if (pointsRef.current) {
        scene.remove(pointsRef.current)
        // geometry.dispose() //This line might cause error if geometry is not defined.  Consider removing or adding error handling.
        // material.dispose() //This line might cause error if material is not defined. Consider removing or adding error handling.
      }
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
  const matrix = new THREE.Matrix4()

  useEffect(() => {
    if (!gltfScene) return

    portals?.forEach(portal => {
      let model: THREE.Group
      
      if (modelsRef.current.has(portal.id)) {
        model = modelsRef.current.get(portal.id)!
      } else {
        model = gltfScene.clone()
        scene.add(model)
        modelsRef.current.set(portal.id, model)
      }

      // Use matrixFromPose to set the transform
      if (matrixFromPose(portal, matrix)) {
        matrix.decompose(model.position, model.quaternion, model.scale)
        // Apply the reported size
        if (portal.reported_size) {
          const size = portal.reported_size * 0.01 // Convert to meters
          model.scale.setScalar(size)
        }
      }
    })

    // Cleanup removed portals
    modelsRef.current.forEach((model, id) => {
      if (!portals?.find(p => p.id === id)) {
        scene.remove(model)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose()
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            }
          }
        })
        modelsRef.current.delete(id)
      }
    })

    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose()
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            }
          }
        })
      })
      modelsRef.current.clear()
    }
  }, [gltfScene, scene, portals])

  return null
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

  useFrame(() => {
    if (pointCloudData && !isIdle && Date.now() - lastInteractionTime.current > 5000) {
      setIsIdle(true)
      startOrbitAnimation()
    }
  })

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
        group.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
            child.geometry.dispose()
            child.material.dispose()
          }
        })
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
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            child.material.dispose()
          }
        })
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
  const { scene: gltfScene } = useGLTF('/L10CommonSpace.glb')
  const modelRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!gltfScene) return

    // Clone the model to avoid modifying the cached original
    const model = gltfScene.clone()
    
    // Apply position offset
    model.position.set(0, 0, 0)  // Offset in x, y, z directions
    
    // Optional: You can also apply rotation if needed
    // model.rotation.set(0, Math.PI / 4, 0)  // Rotate 45 degrees around Y axis
    
    // Add the model to the scene
    scene.add(model)
    modelRef.current = model

    return () => {
      if (modelRef.current) {
        scene.remove(model)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose()
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            }
          }
        })
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
function DomainDevices3D({ domainDeviceData }: { domainDeviceData: any[] | null }) {
  const { scene } = useThree()
  const { scene: glassesScene } = useGLTF('/glasses.glb')
  const { scene: phoneScene } = useGLTF('/smartphone.glb')
  const { scene: robotScene } = useGLTF('/padbot-robot-w3.glb')
  const modelsRef = useRef<Map<string, THREE.Group>>(new Map())
  const matrix = new THREE.Matrix4()
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(new Map())
  const textureLoader = useRef(new THREE.TextureLoader())
  const loadedAppNames = useRef<Set<string>>(new Set())

  // Load textures for all unique app names
  useEffect(() => {
    if (!domainDeviceData) return

    // Get unique app names
    const uniqueAppNames = new Set(
      domainDeviceData
        .map(device => device.name)
        .filter(Boolean)
    )
    
    // Load textures for each app name
    uniqueAppNames.forEach(appName => {
      if (!loadedAppNames.current.has(appName)) {
        loadedAppNames.current.add(appName)
        textureLoader.current.load(
          `/images/${appName}.png`,
          (texture) => {
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

  useEffect(() => {
    if (!glassesScene || !phoneScene || !robotScene || !domainDeviceData) {
      console.log("DomainDevices3D: Missing device scenes or domainDeviceData")
      return
    }

    // Process each device data item
    domainDeviceData.forEach((deviceData, index) => {
      const pose = deviceData.pose
      const deviceId = deviceData.device_id || `device_${index}`
      const deviceType = deviceData.device_type || 'glasses'
      const appName = deviceData.name
      
      if (!pose) {
        console.log(`DomainDevices3D: Device ${deviceId} doesn't contain pose information`, deviceData)
        return
      }

      console.log(`DomainDevices3D: Updating device position for ${deviceId} (${deviceType})`, pose)
      setLastUpdate(new Date().toISOString())
      
      let model = modelsRef.current.get(deviceId)
      
      // Create new model if it doesn't exist
      if (!model) {
        // Choose the appropriate model based on device type
        let sourceScene
        let scale = new THREE.Vector3(0.5, 0.5, 0.5)
        
        switch (deviceType) {
          case 'phone':
            sourceScene = phoneScene
            scale.set(0.5, 0.5, 0.5)
            break
          case 'padbot-robot-w3':
            sourceScene = robotScene
            scale.set(1, 1, 1) // Robot model is larger, so we scale it down more
            break
          default:
            sourceScene = glassesScene
            scale.set(0.5, 0.5, 0.5)
        }
        
        model = sourceScene.clone()
        model.scale.copy(scale)
        scene.add(model)
        modelsRef.current.set(deviceId, model)

        // Add a debug sphere
        const debugSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        )
        debugSphere.userData.isDebugSphere = true
        model.add(debugSphere)

        // Create logo quad if texture is loaded
        if (appName && textures.has(appName)) {
          createLogoQuad(model, deviceId, textures.get(appName)!)
        }
      } else if (appName && textures.has(appName) && !model.userData.logoQuad) {
        createLogoQuad(model, deviceId, textures.get(appName)!)
      }
      
      // Update pose
      if (matrixFromPose(pose, matrix)) {
        matrix.decompose(model.position, model.quaternion, model.scale)
        
        // Re-apply scale based on device type
        switch (deviceType) {
          case 'phone':
            model.scale.set(0.5, 0.5, 0.5)
            break
          case 'padbot-robot-w3':
            model.scale.set(1, 1, 1)
            break
          default:
            model.scale.set(0.5, 0.5, 0.5)
        }
        
        // Only rotate glasses model
        if (deviceType === 'glasses') {
          model.rotateY(-Math.PI / 2)
        }
        else if (deviceType === 'padbot-robot-w3') {
          model.rotateX(-Math.PI / 2)
          model.rotateZ(Math.PI / 2)
        }
        
        console.log(`Device position updated for ${deviceId}: ${model.position.x.toFixed(2)}, ${model.position.y.toFixed(2)}, ${model.position.z.toFixed(2)}`)
      }
    })

    // Clean up removed devices
    modelsRef.current.forEach((model, id) => {
      if (!domainDeviceData.find(d => (d.device_id || `device_${domainDeviceData.indexOf(d)}`) === id)) {
        scene.remove(model)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose()
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            }
          }
        })
        modelsRef.current.delete(id)
      }
    })

    return () => {
      modelsRef.current.forEach((model) => {
        scene.remove(model)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose()
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            }
          }
        })
      })
      modelsRef.current.clear()
    }
  }, [glassesScene, phoneScene, robotScene, scene, domainDeviceData, textures])

  // Helper function to create the logo quad
  const createLogoQuad = (parentModel: THREE.Group, deviceId: string, texture: THREE.Texture) => {
    const imageAspectRatio = texture.image.width / texture.image.height
    const logoHeight = 0.25
    const logoWidth = logoHeight * imageAspectRatio
    
    const logoGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight)
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1
    })

    const logoQuad = new THREE.Mesh(logoGeometry, logoMaterial)
    logoQuad.position.set(0, 0.75, 0)
    logoQuad.rotation.x = -Math.PI / 2
    
    parentModel.add(logoQuad)
    parentModel.userData.logoQuad = logoQuad
  }

  // Display update indicator
  useFrame(({ camera }) => {
    if (lastUpdate) {
      const timeSinceUpdate = Date.now() - new Date(lastUpdate).getTime()
      if (timeSinceUpdate < 1000) {
        // More subtle flash effect using opacity
        const flash = 0.5 + 0.5 * Math.sin(timeSinceUpdate / 200)
        modelsRef.current.forEach((model) => {
          model.traverse((object) => {
            if (object instanceof THREE.Mesh && 
                object.material instanceof THREE.MeshBasicMaterial && 
                !object.userData.isLogo && 
                !object.userData.isDebugSphere) {
              object.material.opacity = flash
              object.material.transparent = true
            }
          })
        })
      }
      
      // Make all logo quads face the camera
      modelsRef.current.forEach((model) => {
        if (model.userData.logoQuad) {
          model.userData.logoQuad.lookAt(camera.position)
        }
      })
    }
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
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <color attach="background" args={["#131313"]} />
        <ambientLight intensity={0.5} />
        <directionalLight intensity={0.5} position={[10, 100, 10]} />
        <CustomGrid />
        {pointCloudVisible && pointCloudData && <PointCloud data={pointCloudData} />}
        {portalsVisible && <Portals portals={portals} />}
        {occlusionVisible && <OcclusionMesh occlusionMeshData={occlusionMeshData} />}
        {navMeshVisible && <NavMesh navMeshData={navMeshData} />}
        {scan3DVisible && <Scan3D />}
        {domainDeviceData && <DomainDevices3D domainDeviceData={domainDeviceData} />}
        <CameraController pointCloudData={pointCloudData} />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/QR.glb')
useGLTF.preload('/L10CommonSpace.glb')
useGLTF.preload('/glasses.glb')
useGLTF.preload('/smartphone.glb')
useGLTF.preload('/padbot-robot-w3.glb')

