import { PLYLoader } from "three/addons/loaders/PLYLoader.js"
import * as THREE from "three"

const plyLoader = new PLYLoader()
const _color = new THREE.Color()

function postProcess(buffer) {
  let geometry = new THREE.BufferGeometry()

  // mandatory buffer data

  if (buffer.indices.length > 0) {
    geometry.setIndex(buffer.indices)
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(buffer.vertices, 3))

  // optional buffer data

  if (buffer.normals.length > 0) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(buffer.normals, 3))
  }

  if (buffer.uvs.length > 0) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(buffer.uvs, 2))
  }

  if (buffer.colors.length > 0) {
  console.log("***************** COLORS")
    for (var i = 0; i < buffer.colors.length; i += 3) {
      _color.setRGB(buffer.colors[i], buffer.colors[i + 1], buffer.colors[i + 2], THREE.SRGBColorSpace)

      buffer.colors[i] = _color.r
      buffer.colors[i + 1] = _color.g
      buffer.colors[i + 2] = _color.b
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(buffer.colors, 3))
  }

  if (buffer.faceVertexUvs.length > 0 || buffer.faceVertexColors.length > 0) {
    geometry = geometry.toNonIndexed()

    if (buffer.faceVertexUvs.length > 0)
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(buffer.faceVertexUvs, 2))
    if (buffer.faceVertexColors.length > 0)
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(buffer.faceVertexColors, 3))
  }

  // custom buffer data

  // for ( const customProperty of Object.keys( scope.customPropertyMapping ) ) {

  // 	if ( buffer[ customProperty ].length > 0 ) {

  // 	  	geometry.setAttribute(
  // 			customProperty,
  // 			new Float32BufferAttribute(
  // 		  		buffer[ customProperty ],
  // 		  		scope.customPropertyMapping[ customProperty ].length
  // 			)
  // 	  	);

  // 	}

  // }

  geometry.computeBoundingSphere()

  return geometry
}

export async function plyAsyncParse(data: ArrayBuffer | string, threaded?: boolean): Promise<THREE.BufferGeometry> {
  if (!window.Worker || !threaded) return plyLoader.parse(data)

  let promiseResolve, promiseReject

  console.log("hello worker")

  const w = new Worker("/workers/parse-ply-worker.js", {
    type: "module",
  })
  w.onmessage = (ev) => {
    console.log("message received", ev)
    const geometry = postProcess(ev.data.parsed)
    console.log(geometry)
    promiseResolve(geometry)
    console.log("resolved")
    w.terminate()
  }
  w.onerror = (ev) => {
    console.log("worker error", ev)
    promiseReject()
    w.terminate()
  }

  w.onmessageerror = (ev) => {
    console.log("message error", ev)
    promiseReject()
    w.terminate()
  }

  w.postMessage({ data })

  var promise = new Promise<THREE.BufferGeometry>((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })

  return promise
}

