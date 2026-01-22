import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Shader material for splat rendering (WebGL2 with integer texture support)
const SplatMaterial = shaderMaterial(
  {
    alphaTest: 0,
    viewport: new THREE.Vector2(1980, 1080),
    focal: 1000.0,
    centerAndScaleTexture: null,
    covAndColorTexture: null,
  },
  // Vertex shader
  /*glsl*/ `
    precision highp sampler2D;
    precision highp usampler2D;
    out vec4 vColor;
    out vec3 vPosition;
    uniform vec2 resolution;
    uniform vec2 viewport;
    uniform float focal;
    attribute uint splatIndex;
    uniform sampler2D centerAndScaleTexture;
    uniform usampler2D covAndColorTexture;    

    vec2 unpackInt16(in uint value) {
      int v = int(value);
      int v0 = v >> 16;
      int v1 = (v & 0xFFFF);
      if((v & 0x8000) != 0)
        v1 |= 0xFFFF0000;
      return vec2(float(v1), float(v0));
    }

    void main () {
      ivec2 texSize = textureSize(centerAndScaleTexture, 0);
      ivec2 texPos = ivec2(splatIndex%uint(texSize.x), splatIndex/uint(texSize.x));
      vec4 centerAndScaleData = texelFetch(centerAndScaleTexture, texPos, 0);
      vec4 center = vec4(centerAndScaleData.xyz, 1);
      vec4 camspace = modelViewMatrix * center;
      vec4 pos2d = projectionMatrix * camspace;

      float bounds = 1.2 * pos2d.w;
      if (pos2d.z < -pos2d.w || pos2d.x < -bounds || pos2d.x > bounds
        || pos2d.y < -bounds || pos2d.y > bounds) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
      }

      uvec4 covAndColorData = texelFetch(covAndColorTexture, texPos, 0);
      vec2 cov3D_M11_M12 = unpackInt16(covAndColorData.x) * centerAndScaleData.w;
      vec2 cov3D_M13_M22 = unpackInt16(covAndColorData.y) * centerAndScaleData.w;
      vec2 cov3D_M23_M33 = unpackInt16(covAndColorData.z) * centerAndScaleData.w;
      mat3 Vrk = mat3(
        cov3D_M11_M12.x, cov3D_M11_M12.y, cov3D_M13_M22.x,
        cov3D_M11_M12.y, cov3D_M13_M22.y, cov3D_M23_M33.x,
        cov3D_M13_M22.x, cov3D_M23_M33.x, cov3D_M23_M33.y
      );

      mat3 J = mat3(
        focal / camspace.z, 0., -(focal * camspace.x) / (camspace.z * camspace.z),
        0., focal / camspace.z, -(focal * camspace.y) / (camspace.z * camspace.z),
        0., 0., 0.
      );

      mat3 W = transpose(mat3(modelViewMatrix));
      mat3 T = W * J;
      mat3 cov = transpose(T) * Vrk * T;
      vec2 vCenter = vec2(pos2d) / pos2d.w;
      float diagonal1 = cov[0][0] + 0.3;
      float offDiagonal = cov[0][1];
      float diagonal2 = cov[1][1] + 0.3;
      float mid = 0.5 * (diagonal1 + diagonal2);
      float radius = length(vec2((diagonal1 - diagonal2) / 2.0, offDiagonal));
      float lambda1 = mid + radius;
      float lambda2 = max(mid - radius, 0.1);
      vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));
      vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
      vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);
      uint colorUint = covAndColorData.w;
      vColor = vec4(
        float(colorUint & uint(0xFF)) / 255.0,
        float((colorUint >> uint(8)) & uint(0xFF)) / 255.0,
        float((colorUint >> uint(16)) & uint(0xFF)) / 255.0,
        float(colorUint >> uint(24)) / 255.0
      );
      vPosition = position;

      gl_Position = vec4(
        vCenter 
          + position.x * v2 / viewport * 2.0 
          + position.y * v1 / viewport * 2.0, pos2d.z / pos2d.w, 1.0);
    }
  `,
  // Fragment shader
  /*glsl*/ `
    in vec4 vColor;
    in vec3 vPosition;
    void main () {
      float A = -dot(vPosition.xy, vPosition.xy);
      if (A < -4.0) discard;
      float B = exp(A) * vColor.a;
      gl_FragColor = vec4(vColor.rgb, B);
    }
  `
);

extend({ SplatMaterial });

// Web Worker code for sorting splats by depth
const workerCode = `
  let matrices = null;
  let offset = 0;

  function sortSplats(view, hashed = false) {
    const vertexCount = matrices.length / 16;
    const threshold = -0.0001;
    let maxDepth = -Infinity;
    let minDepth = Infinity;
    const depthList = new Float32Array(vertexCount);
    const sizeList = new Int32Array(depthList.buffer);
    const validIndexList = new Int32Array(vertexCount);
    let validCount = 0;
    
    for (let i = 0; i < vertexCount; i++) {
      const depth = view[0] * matrices[i * 16 + 12] + view[1] * matrices[i * 16 + 13] + view[2] * matrices[i * 16 + 14] + view[3];
      if (hashed || depth < 0 && matrices[i * 16 + 15] > threshold * depth) {
        depthList[validCount] = depth;
        validIndexList[validCount] = i;
        validCount++;
        if (depth > maxDepth) maxDepth = depth;
        if (depth < minDepth) minDepth = depth;
      }
    }

    const depthInv = (256 * 256 - 1) / (maxDepth - minDepth);
    const counts0 = new Uint32Array(256 * 256);
    for (let i = 0; i < validCount; i++) {
      sizeList[i] = (depthList[i] - minDepth) * depthInv | 0;
      counts0[sizeList[i]]++;
    }
    const starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++) starts0[i] = starts0[i - 1] + counts0[i - 1];
    const depthIndex = new Uint32Array(validCount);
    for (let i = 0; i < validCount; i++) depthIndex[starts0[sizeList[i]]++] = validIndexList[i];
    return depthIndex;
  }

  self.onmessage = (e) => {
    if (e.data.method === 'push') {
      if (offset === 0) matrices = new Float32Array(e.data.length);
      const new_matrices = new Float32Array(e.data.matrices);
      matrices.set(new_matrices, offset);
      offset += new_matrices.length;
    } else if (e.data.method === 'sort') {
      if (matrices !== null) {
        const indices = sortSplats(new Float32Array(e.data.view), e.data.hashed);
        self.postMessage({ indices, key: e.data.key }, [indices.buffer]);
      }
    }
  };
`;

interface SplatData {
  centerAndScaleTexture: THREE.DataTexture;
  covAndColorTexture: THREE.DataTexture;
  numVertices: number;
  matrices: Float32Array;
  bufferTextureWidth: number;
  bufferTextureHeight: number;
}

/**
 * Parse raw splat data (ArrayBuffer) into GPU textures
 * 
 * Splat file format (32 bytes per vertex):
 * - Bytes 0-11: Position (x, y, z) as 3 floats
 * - Bytes 12-23: Scale (x, y, z) as 3 floats
 * - Bytes 24-27: Color RGBA as 4 bytes
 * - Bytes 28-31: Quaternion (w, x, y, z) as 4 bytes
 */
export function parseSplatData(
  buffer: ArrayBuffer,
  gl: THREE.WebGLRenderer
): SplatData {
  const rowLength = 3 * 4 + 3 * 4 + 4 + 4; // 32 bytes per vertex
  const numVertices = Math.floor(buffer.byteLength / rowLength);

  console.log("[parseSplatData] Parsing:", {
    bufferSize: buffer.byteLength,
    numVertices,
  });

  // Get max texture size from WebGL context
  const context = gl.getContext();
  const maxTextureSize = context.getParameter(context.MAX_TEXTURE_SIZE);
  const maxVertexes = maxTextureSize * maxTextureSize;
  const actualVertices = Math.min(numVertices, maxVertexes);

  const bufferTextureWidth = maxTextureSize;
  const bufferTextureHeight =
    Math.floor((actualVertices - 1) / maxTextureSize) + 1;

  // Create texture data arrays
  const centerAndScaleData = new Float32Array(
    bufferTextureWidth * bufferTextureHeight * 4
  );
  const covAndColorData = new Uint32Array(
    bufferTextureWidth * bufferTextureHeight * 4
  );

  const u_buffer = new Uint8Array(buffer);
  const f_buffer = new Float32Array(buffer);
  const matrices = new Float32Array(actualVertices * 16);

  const covAndColorData_uint8 = new Uint8Array(covAndColorData.buffer);
  const covAndColorData_int16 = new Int16Array(covAndColorData.buffer);

  // Parse each vertex
  for (let i = 0; i < actualVertices; i++) {
    // Extract quaternion rotation
    const quat = new THREE.Quaternion(
      -(u_buffer[32 * i + 28 + 1] - 128) / 128.0,
      (u_buffer[32 * i + 28 + 2] - 128) / 128.0,
      (u_buffer[32 * i + 28 + 3] - 128) / 128.0,
      -(u_buffer[32 * i + 28 + 0] - 128) / 128.0
    );
    quat.invert();

    // Extract position
    const center = new THREE.Vector3(
      f_buffer[8 * i + 0],
      f_buffer[8 * i + 1],
      -f_buffer[8 * i + 2]
    );

    // Extract scale
    const scale = new THREE.Vector3(
      f_buffer[8 * i + 3 + 0],
      f_buffer[8 * i + 3 + 1],
      f_buffer[8 * i + 3 + 2]
    );

    // Build covariance matrix
    const mtx = new THREE.Matrix4();
    mtx.makeRotationFromQuaternion(quat);
    mtx.transpose();
    mtx.scale(scale);
    const mtx_t = mtx.clone();
    mtx.transpose();
    mtx.premultiply(mtx_t);
    mtx.setPosition(center);

    // Find max covariance value for normalization
    const cov_indexes = [0, 1, 2, 5, 6, 10];
    let max_value = 0.0;
    for (let j = 0; j < cov_indexes.length; j++) {
      if (Math.abs(mtx.elements[cov_indexes[j]]) > max_value) {
        max_value = Math.abs(mtx.elements[cov_indexes[j]]);
      }
    }

    // Write to center/scale texture
    let destOffset = i * 4;
    centerAndScaleData[destOffset + 0] = center.x;
    centerAndScaleData[destOffset + 1] = -center.y;
    centerAndScaleData[destOffset + 2] = center.z;
    centerAndScaleData[destOffset + 3] = max_value / 32767.0;

    // Write covariance to texture
    destOffset = i * 4 * 2;
    for (let j = 0; j < cov_indexes.length; j++) {
      covAndColorData_int16[destOffset + j] =
        (mtx.elements[cov_indexes[j]] * 32767.0) / max_value;
    }

    // Write RGBA color
    destOffset = (i * 4 + 3) * 4;
    covAndColorData_uint8[destOffset + 0] = u_buffer[32 * i + 24 + 0];
    covAndColorData_uint8[destOffset + 1] = u_buffer[32 * i + 24 + 1];
    covAndColorData_uint8[destOffset + 2] = u_buffer[32 * i + 24 + 2];
    covAndColorData_uint8[destOffset + 3] = u_buffer[32 * i + 24 + 3];

    // Store matrix for sorting
    mtx.elements[15] =
      Math.max(scale.x, scale.y, scale.z) * (u_buffer[32 * i + 24 + 3] / 255.0);
    for (let j = 0; j < 16; j++) {
      matrices[i * 16 + j] = mtx.elements[j];
    }
  }

  // Create GPU textures
  const centerAndScaleTexture = new THREE.DataTexture(
    centerAndScaleData,
    bufferTextureWidth,
    bufferTextureHeight,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  centerAndScaleTexture.needsUpdate = true;

  const covAndColorTexture = new THREE.DataTexture(
    covAndColorData,
    bufferTextureWidth,
    bufferTextureHeight,
    THREE.RGBAIntegerFormat,
    THREE.UnsignedIntType
  );
  // @ts-ignore - internalFormat is valid but not in types
  covAndColorTexture.internalFormat = "RGBA32UI";
  covAndColorTexture.needsUpdate = true;

  return {
    centerAndScaleTexture,
    covAndColorTexture,
    numVertices: actualVertices,
    matrices,
    bufferTextureWidth,
    bufferTextureHeight,
  };
}

interface CustomSplatProps {
  /** Pre-loaded splat data as ArrayBuffer */
  data: ArrayBuffer;
  /** Whether to use alpha hashing (default: false) */
  alphaHash?: boolean;
  /** Alpha test threshold (default: 0) */
  alphaTest?: number;
  /** Whether to apply tone mapping (default: false) */
  toneMapped?: boolean;
  /** Alignment matrix to transform the splat */
  alignment?: THREE.Matrix4 | number[];
  /** Position in 3D space */
  position?: [number, number, number];
  /** Rotation in radians [x, y, z] */
  rotation?: [number, number, number];
  /** Scale factor */
  scale?: number;
}

/**
 * CustomSplat Component
 * 
 * Renders gaussian splat data using WebGL2 and Web Workers.
 * Automatically handles depth sorting each frame for proper transparency.
 */
export function CustomSplat({
  data,
  alphaHash = false,
  alphaTest = 0,
  toneMapped = false,
  alignment,
  ...props
}: CustomSplatProps & JSX.IntrinsicElements["mesh"]) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.InstancedBufferGeometry | null>(null);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const sortingRef = useRef(false);
  const viewportRef = useRef(new THREE.Vector4());

  // Parse the splat data
  const splatData = useMemo(() => {
    console.log("[CustomSplat] Parsing data:", data.byteLength, "bytes");
    return parseSplatData(data, gl);
  }, [data, gl]);

  // Set up geometry and worker
  useEffect(() => {
    if (!meshRef.current || !splatData) return;

    const mesh = meshRef.current;

    // Create worker for sorting
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    // Send matrices to worker
    const matricesCopy = splatData.matrices.slice();
    worker.postMessage(
      {
        method: "push",
        length: splatData.numVertices * 16,
        matrices: matricesCopy.buffer,
      },
      [matricesCopy.buffer]
    );

    // Set up geometry
    const splatIndexArray = new Uint32Array(
      splatData.bufferTextureWidth * splatData.bufferTextureHeight
    );
    const splatIndexes = new THREE.InstancedBufferAttribute(
      splatIndexArray,
      1,
      false
    );
    splatIndexes.setUsage(THREE.DynamicDrawUsage);

    const geometry = new THREE.InstancedBufferGeometry();
    const positionsArray = new Float32Array(6 * 3);
    const positions = new THREE.BufferAttribute(positionsArray, 3);
    geometry.setAttribute("position", positions);
    
    // Two triangles forming a quad
    positions.setXYZ(2, -2.0, 2.0, 0.0);
    positions.setXYZ(1, 2.0, 2.0, 0.0);
    positions.setXYZ(0, -2.0, -2.0, 0.0);
    positions.setXYZ(5, -2.0, -2.0, 0.0);
    positions.setXYZ(4, 2.0, 2.0, 0.0);
    positions.setXYZ(3, 2.0, -2.0, 0.0);
    
    positions.needsUpdate = true;
    geometry.setAttribute("splatIndex", splatIndexes);
    geometry.instanceCount = 1;

    mesh.geometry = geometry;
    geometryRef.current = geometry;

    // Handle worker messages
    const handleMessage = (e: MessageEvent) => {
      if (mesh && e.data.key === mesh.uuid && geometryRef.current) {
        const indexes = new Uint32Array(e.data.indices);
        // @ts-ignore
        geometryRef.current.attributes.splatIndex.set(indexes);
        geometryRef.current.attributes.splatIndex.needsUpdate = true;
        geometryRef.current.instanceCount = indexes.length;
        readyRef.current = true;
        sortingRef.current = false;
      }
    };

    worker.addEventListener("message", handleMessage);

    // Wait for textures to be uploaded to GPU
    const checkReady = async () => {
      while (true) {
        const centerProps = gl.properties.get(splatData.centerAndScaleTexture);
        const covProps = gl.properties.get(splatData.covAndColorTexture);
        if (centerProps?.__webglTexture && covProps?.__webglTexture) {
          readyRef.current = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    checkReady();

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      geometry.dispose();
    };
  }, [splatData, gl]);

  // Update sorting each frame
  useFrame(() => {
    if (
      !meshRef.current ||
      !workerRef.current ||
      !splatData ||
      !geometryRef.current
    )
      return;

    const mesh = meshRef.current;
    camera.updateMatrixWorld();
    gl.getCurrentViewport(viewportRef.current);

    const material = mesh.material as THREE.ShaderMaterial & {
      viewport: THREE.Vector2;
      focal: number;
    };
    
    // Update viewport and focal length
    if (material.viewport) {
      material.viewport.x = viewportRef.current.z;
      material.viewport.y = viewportRef.current.w;
    }
    if (material.focal !== undefined) {
      material.focal =
        (viewportRef.current.w / 2.0) *
        Math.abs(camera.projectionMatrix.elements[5]);
    }

    // Trigger sorting if ready
    if (readyRef.current && !sortingRef.current) {
      readyRef.current = false;
      sortingRef.current = true;
      mesh.updateMatrixWorld();
      const view = new Float32Array([
        mesh.modelViewMatrix.elements[2],
        -mesh.modelViewMatrix.elements[6],
        mesh.modelViewMatrix.elements[10],
        mesh.modelViewMatrix.elements[14],
      ]);
      workerRef.current.postMessage(
        {
          method: "sort",
          key: mesh.uuid,
          view: view.buffer,
          hashed: alphaHash,
        },
        [view.buffer]
      );
    }
  });

  // Convert alignment to Matrix4 if it's an array
  const alignmentMatrix = useMemo(() => {
    if (!alignment) return undefined;
    if (alignment instanceof THREE.Matrix4) return alignment;
    const matrix = new THREE.Matrix4();
    matrix.fromArray(alignment);
    return matrix;
  }, [alignment]);

  if (!splatData) return null;

  return (
    <group
      matrix={alignmentMatrix}
      matrixAutoUpdate={alignmentMatrix ? false : true}
    >
      <mesh ref={meshRef} frustumCulled={false} {...props}>
        <splatMaterial
          key={`splat-${alphaTest}-${alphaHash}`}
          transparent={!alphaHash}
          depthTest={true}
          alphaTest={alphaHash ? 0 : alphaTest}
          centerAndScaleTexture={splatData.centerAndScaleTexture}
          covAndColorTexture={splatData.covAndColorTexture}
          depthWrite={alphaHash ? true : alphaTest > 0}
          blending={alphaHash ? THREE.NormalBlending : THREE.CustomBlending}
          blendSrcAlpha={THREE.OneFactor}
          // @ts-ignore
          alphaHash={!!alphaHash}
          toneMapped={toneMapped}
        />
      </mesh>
    </group>
  );
}

export default CustomSplat;
