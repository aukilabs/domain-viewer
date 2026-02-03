/**
 * Shared GLSL shader utilities for Gaussian Splat visual effects.
 * Extracted from SplatViewer and LocalSplatViewer to reduce code duplication.
 */

import { SplatMesh, dyno } from "@sparkjsdev/spark";
import type { MutableRefObject } from "react";
import type { SplatEffect } from "@/types/splat";

/**
 * GLSL utility functions used by all splat effects
 */
export const SPLAT_SHADER_GLOBALS = dyno.unindent(`
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
`);

/**
 * Effect type enum mapping for shader integer constants
 */
export enum SplatEffectType {
  Magic = 1,
  Spread = 2,
  Unroll = 3,
  Twister = 4,
  Rain = 5,
}

/**
 * Maps effect name to shader integer constant
 */
export function getEffectTypeFromName(effectName: SplatEffect): number {
  switch (effectName) {
    case "Magic":
      return SplatEffectType.Magic;
    case "Spread":
      return SplatEffectType.Spread;
    case "Unroll":
      return SplatEffectType.Unroll;
    case "Twister":
      return SplatEffectType.Twister;
    case "Rain":
      return SplatEffectType.Rain;
    default:
      return SplatEffectType.Spread;
  }
}

/**
 * Generates the main effect shader logic based on inputs/outputs
 */
export function getSplatShaderStatements(
  inputs: { gsplat: string; t: string; effectType: string },
  outputs: { gsplat: string }
): string {
  return dyno.unindentLines(`
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
  `);
}

/**
 * Creates and applies a visual effect modifier to a splat mesh
 * 
 * @param splatMesh - The SplatMesh to modify
 * @param animateT - Ref containing current animation time
 * @param effectName - Name of the effect to apply
 */
export function createSplatModifier(
  splatMesh: SplatMesh,
  animateT: MutableRefObject<number>,
  effectName: SplatEffect
): void {
  splatMesh.objectModifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
      const d = new dyno.Dyno({
        inTypes: { gsplat: dyno.Gsplat, t: "float", effectType: "int" },
        outTypes: { gsplat: dyno.Gsplat },
        globals: () => [SPLAT_SHADER_GLOBALS],
        statements: ({ inputs, outputs }) =>
          getSplatShaderStatements(inputs, outputs),
      });

      const effectType = getEffectTypeFromName(effectName);

      gsplat = d.apply({
        gsplat,
        t: dyno.dynoFloat(animateT.current),
        effectType: dyno.dynoInt(effectType),
      }).gsplat;

      return { gsplat };
    }
  );

  // Apply shader modifications to splat mesh
  splatMesh.updateGenerator();
}
