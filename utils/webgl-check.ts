export function checkWebGL2Support(): {
  supported: boolean;
  message?: string;
} {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    
    if (!gl) {
      return {
        supported: false,
        message: "WebGL2 is not supported in your browser. Gaussian Splat rendering requires WebGL2.",
      };
    }

    // Check for required extensions/features
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log("[WebGL2 Check] Max texture size:", maxTextureSize);

    return { supported: true };
  } catch (e) {
    return {
      supported: false,
      message: "Error checking WebGL2 support: " + (e instanceof Error ? e.message : String(e)),
    };
  }
}
