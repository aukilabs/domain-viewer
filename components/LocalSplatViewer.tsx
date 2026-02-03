import * as THREE from "three";
import { useEffect, useState, useRef } from "react";
import { checkWebGL2Support } from "@/utils/webgl-check";
import { useThree, useFrame } from "@react-three/fiber";
import { SplatMesh, SparkRenderer, SplatFileType, dyno } from "@sparkjsdev/spark";
import { useQuery } from "@tanstack/react-query";

interface LocalSplatViewerProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * Loads and renders a local gaussian splat file from the public directory.
 */
export default function LocalSplatViewer({
  url,
  position = [0, 0, 0],
  rotation = [-Math.PI, -Math.PI, 0],
  scale = 1,
}: LocalSplatViewerProps) {
  const [webgl2Supported, setWebgl2Supported] = useState(true);
  const { gl, scene } = useThree();
  const sparkRendererRef = useRef<SparkRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animateT = useRef(0);
  const animationComplete = useRef(false);
  const ANIMATION_DURATION = 10; // seconds
  
  // Available effects: Magic, Spread, Unroll, Twister, Rain
  const availableEffects = ["Magic", "Spread", "Unroll"];
  
  // Choose a random effect on mount
  const [currentEffect] = useState(() => {
    const randomEffect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
    console.log("[LocalSplatViewer] Selected random effect:", randomEffect);
    return randomEffect;
  });
  
  const effectParams = useRef({ effect: currentEffect });

  // Reset animation on mount to replay when toggled
  useEffect(() => {
    console.log("[LocalSplatViewer] Component mounted - resetting animation with effect:", currentEffect);
    animateT.current = 0;
    animationComplete.current = false;
    effectParams.current.effect = currentEffect;
  }, [currentEffect]);

  useEffect(() => {
    const check = checkWebGL2Support();
    if (!check.supported) {
      console.warn("[LocalSplatViewer]", check.message);
      setWebgl2Supported(false);
    }
  }, []);

  // Fetch the local splat file
  const { data, isLoading, error } = useQuery({
    queryKey: ["local-splat", url],
    queryFn: async () => {
      console.log("[LocalSplatViewer] Fetching local splat:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch local splat: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      console.log("[LocalSplatViewer] Local splat loaded:", {
        url,
        size: arrayBuffer.byteLength,
        sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      });

      return arrayBuffer;
    },
    enabled: Boolean(url && webgl2Supported),
    staleTime: Infinity, // Cache forever for local files
  });

  // Initialize SparkRenderer
  useEffect(() => {
    console.log("[LocalSplatViewer] Initializing SparkRenderer");
    const sparkRenderer = new SparkRenderer({
      renderer: gl,
      autoUpdate: true,
    });

    // Add SparkRenderer to the scene
    scene.add(sparkRenderer);
    sparkRendererRef.current = sparkRenderer;

    return () => {
      console.log("[LocalSplatViewer] Cleaning up SparkRenderer");
      if (sparkRendererRef.current) {
        // First remove any splat meshes
        if (splatMeshRef.current) {
          console.log("[LocalSplatViewer] Removing SplatMesh from cleanup");
          scene.remove(splatMeshRef.current);
          splatMeshRef.current.dispose();
          splatMeshRef.current = null;
        }
        // Then remove the renderer
        scene.remove(sparkRendererRef.current);
        sparkRendererRef.current = null;
      }
    };
  }, [gl, scene]);

  // Animation loop for reveal effect - only runs during animation
  useFrame((state, delta) => {
    if (splatMeshRef.current && !animationComplete.current) {
      animateT.current += delta;
      splatMeshRef.current.updateGenerator();
      
      // Stop updating once animation is complete
      if (animateT.current >= ANIMATION_DURATION) {
        animationComplete.current = true;
        console.log("[LocalSplatViewer] Reveal animation complete, stopping updates");
      }
    }
  });

  // Load and render splat data
  useEffect(() => {
    if (!data || !sparkRendererRef.current) return;

    console.log("[LocalSplatViewer] Loading splat data:", data.byteLength, "bytes");

    const loadSplat = async () => {
      try {
        // Determine file type from URL extension
        let fileType = SplatFileType.SPLAT;
        if (url.endsWith(".ply")) {
          fileType = SplatFileType.PLY;
        } else if (url.endsWith(".spz")) {
          fileType = SplatFileType.SPZ;
        }

        // Clone the ArrayBuffer to prevent detached buffer errors
        // This is necessary because the buffer may be transferred to a worker
        const clonedData = data.slice(0);

        // Create SplatMesh from the ArrayBuffer
        const splatMesh = new SplatMesh({
          fileBytes: clonedData,
          fileType: fileType,
        });

        // Wait for initialization
        await splatMesh.initialized;

        console.log("[LocalSplatViewer] SplatMesh initialized");

        // Apply 180-degree rotation correction for SparkJS coordinate system
        splatMesh.rotation.y = Math.PI;

        // Apply transformations
        if (position) {
          splatMesh.position.set(...position);
        }

        if (rotation) {
          // Add rotation on top of the 180-degree correction
          splatMesh.rotation.x += rotation[0];
          splatMesh.rotation.y += rotation[1];
          splatMesh.rotation.z += rotation[2];
        }

        if (scale !== undefined) {
          splatMesh.scale.setScalar(scale);
        }

        // Add to scene
        scene.add(splatMesh);
        splatMeshRef.current = splatMesh;

        // Setup reveal effect
        setupSplatModifier(splatMesh);

        console.log("[LocalSplatViewer] SplatMesh added to scene at position:", position, "with reveal effect");
      } catch (err) {
        console.error("[LocalSplatViewer] Error loading splat mesh:", err);
      }
    };

    /**
     * Configures visual effects shader for the current splat mesh
     */
    function setupSplatModifier(splatMesh: SplatMesh) {
      splatMesh.objectModifier = dyno.dynoBlock(
        { gsplat: dyno.Gsplat },
        { gsplat: dyno.Gsplat },
        ({ gsplat }) => {
          const d = new dyno.Dyno({
            inTypes: { gsplat: dyno.Gsplat, t: "float", effectType: "int" },
            outTypes: { gsplat: dyno.Gsplat },
            // GLSL utility functions for effects
            globals: () => [
              dyno.unindent(`
                // Pseudo-random hash function
                vec3 hash(vec3 p) {
                  p = fract(p * 0.3183099 + 0.1);
                  p *= 17.0;
                  return fract(vec3(p.x * p.y * p.z, p.x + p.y * p.z, p.x * p.y + p.z));
                }

                // 3D Perlin-style noise function
                vec3 noise(vec3 p) {
                  vec3 i = floor(p);
                  vec3 f = fract(p);
                  f = f * f * (3.0 - 2.0 * f);
                  
                  vec3 n000 = hash(i + vec3(0,0,0));
                  vec3 n100 = hash(i + vec3(1,0,0));
                  vec3 n010 = hash(i + vec3(0,1,0));
                  vec3 n110 = hash(i + vec3(1,1,0));
                  vec3 n001 = hash(i + vec3(0,0,1));
                  vec3 n101 = hash(i + vec3(1,0,1));
                  vec3 n011 = hash(i + vec3(0,1,1));
                  vec3 n111 = hash(i + vec3(1,1,1));
                  
                  vec3 x0 = mix(n000, n100, f.x);
                  vec3 x1 = mix(n010, n110, f.x);
                  vec3 x2 = mix(n001, n101, f.x);
                  vec3 x3 = mix(n011, n111, f.x);
                  
                  vec3 y0 = mix(x0, x1, f.y);
                  vec3 y1 = mix(x2, x3, f.y);
                  
                  return mix(y0, y1, f.z);
                }

                // 2D rotation matrix
                mat2 rot(float a) {
                  float s=sin(a),c=cos(a);
                  return mat2(c,-s,s,c);
                }
                // Twister weather effect
                vec4 twister(vec3 pos, vec3 scale, float t) {
                  vec3 h = hash(pos);
                  float s = smoothstep(0., 8., t*t*.1 - length(pos.xz)*2.+2.);
                  if (length(scale) < .05) pos.y = mix(-10., pos.y, pow(s, 2.*h.x));
                  pos.xz = mix(pos.xz*.5, pos.xz, pow(s, 2.*h.x));
                  float rotationTime = t * (1.0 - s) * 0.2;
                  pos.xz *= rot(rotationTime + pos.y*20.*(1.-s)*exp(-1.*length(pos.xz)));
                  return vec4(pos, s*s*s*s);
                }

                // Rain weather effect
                vec4 rain(vec3 pos, vec3 scale, float t) {
                  vec3 h = hash(pos);
                  float s = pow(smoothstep(0., 5., t*t*.1 - length(pos.xz)*2. + 1.), .5 + h.x);
                  float y = pos.y;
                  pos.y = min(-10. + s*15., pos.y);
                  pos.xz = mix(pos.xz*.3, pos.xz, s);
                  pos.xz *= rot(t*.3);
                  return vec4(pos, smoothstep(-10., y, pos.y));
                }
              `)
            ],
            // Main effect shader logic
            statements: ({ inputs, outputs }) => dyno.unindentLines(`
              ${outputs.gsplat} = ${inputs.gsplat};
              float t = ${inputs.t};
              float s = smoothstep(0.,10.,t-4.5)*10.;
              vec3 scales = ${inputs.gsplat}.scales;
              vec3 localPos = ${inputs.gsplat}.center;
              float l = length(localPos.xz);
              
              if (${inputs.effectType} == 1) {
                // Magic Effect: Complex twister with noise and radial reveal
                float border = abs(s-l-.5);
                localPos *= 1.-.2*exp(-20.*border);
                vec3 finalScales = mix(scales,vec3(0.002),smoothstep(s-.5,s,l+.5));
                ${outputs.gsplat}.center = localPos + .1*noise(localPos.xyz*2.+t*.5)*smoothstep(s-.5,s,l+.5);
                ${outputs.gsplat}.scales = finalScales;
                float at = atan(localPos.x,localPos.z)/3.1416;
                ${outputs.gsplat}.rgba *= step(at,t-3.1416);
                ${outputs.gsplat}.rgba += exp(-20.*border) + exp(-50.*abs(t-at-3.1416))*.5;
                
              } else if (${inputs.effectType} == 2) {
                // Spread Effect: Gentle radial emergence with scaling
                float tt = t*t*.4+.5;
                localPos.xz *= min(1.,.3+max(0.,tt*.05));
                ${outputs.gsplat}.center = localPos;
                ${outputs.gsplat}.scales = max(mix(vec3(0.0),scales,min(tt-7.-l*2.5,1.)),mix(vec3(0.0),scales*.2,min(tt-1.-l*2.,1.)));
                ${outputs.gsplat}.rgba = mix(vec4(.3),${inputs.gsplat}.rgba,clamp(tt-l*2.5-3.,0.,1.));
                
              } else if (${inputs.effectType} == 3) {
                // Unroll Effect: Rotating helix with vertical reveal
                localPos.xz *= rot((localPos.y*50.-20.)*exp(-t));
                ${outputs.gsplat}.center = localPos * (1.-exp(-t)*2.);
                ${outputs.gsplat}.scales = mix(vec3(0.002),scales,smoothstep(.3,.7,t+localPos.y-2.));
                ${outputs.gsplat}.rgba = ${inputs.gsplat}.rgba*step(0.,t*.5+localPos.y-.5);
              } else if (${inputs.effectType} == 4) {
                // Twister Effect: swirling weather reveal
                vec4 effectResult = twister(localPos, scales, t);
                ${outputs.gsplat}.center = effectResult.xyz;
                ${outputs.gsplat}.scales = mix(vec3(.002), scales, pow(effectResult.w, 12.));
                float s = effectResult.w;
                // Also apply a spin (self-rotation) so each splat rotates about its own center.
                float spin = -t * 0.3 * (1.0 - s);
                vec4 spinQ = vec4(0.0, sin(spin*0.5), 0.0, cos(spin*0.5));
                ${outputs.gsplat}.quaternion = quatQuat(spinQ, ${inputs.gsplat}.quaternion);
              } else if (${inputs.effectType} == 5) {
                // Rain Effect: falling streaks
                vec4 effectResult = rain(localPos, scales, t);
                ${outputs.gsplat}.center = effectResult.xyz;
                ${outputs.gsplat}.scales = mix(vec3(.005), scales, pow(effectResult.w, 30.));
                // Also apply a spin (self-rotation) so each splat rotates about its own center.
                float spin = -t*.3;
                vec4 spinQ = vec4(0.0, sin(spin*0.5), 0.0, cos(spin*0.5));
                ${outputs.gsplat}.quaternion = quatQuat(spinQ, ${inputs.gsplat}.quaternion);
              }
            `),
          });

          // Map effect names to shader integer constants
          const effectType = effectParams.current.effect === "Magic" ? 1 : 
                            effectParams.current.effect === "Spread" ? 2 : 
                            effectParams.current.effect === "Unroll" ? 3 : 
                            effectParams.current.effect === "Twister" ? 4 : 5;
          
          gsplat = d.apply({ 
            gsplat, 
            t: dyno.dynoFloat(animateT.current),
            effectType: dyno.dynoInt(effectType)
          }).gsplat;
          
          return { gsplat };
        }
      );

      // Apply shader modifications to splat mesh
      splatMesh.updateGenerator();
    }

    loadSplat();

    return () => {
      if (splatMeshRef.current) {
        console.log("[LocalSplatViewer] Cleanup: Removing and disposing SplatMesh");
        try {
          scene.remove(splatMeshRef.current);
          splatMeshRef.current.dispose();
        } catch (err) {
          console.error("[LocalSplatViewer] Error during cleanup:", err);
        } finally {
          splatMeshRef.current = null;
        }
      }
    };
  }, [data, scene, position, rotation, scale, url]);

  if (!webgl2Supported) {
    console.warn("[LocalSplatViewer] WebGL2 not supported, skipping splat rendering");
    return null;
  }

  if (error) {
    console.error("[LocalSplatViewer] Error loading local splat:", error);
    return null;
  }

  if (isLoading || !data) {
    return null;
  }

  return null;
}
