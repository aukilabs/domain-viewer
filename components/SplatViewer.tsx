import { CustomSplat } from "./CustomSplat.web";
import { useSplatData } from "@/hooks/useSplatData";
import * as THREE from "three";
import { useEffect, useState } from "react";
import { checkWebGL2Support } from "@/utils/webgl-check";

interface SplatViewerProps {
  domainServerUrl: string;
  domainId: string;
  fileId: string;
  accessToken: string;
  alignmentMatrix?: number[] | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * High-level Gaussian Splat viewer component.
 * Handles data fetching, loading states, and rendering.
 */
export default function SplatViewer({
  domainServerUrl,
  domainId,
  fileId,
  accessToken,
  alignmentMatrix,
  ...splatProps
}: SplatViewerProps) {
  const [webgl2Supported, setWebgl2Supported] = useState(true);

  useEffect(() => {
    const check = checkWebGL2Support();
    if (!check.supported) {
      console.warn("[SplatViewer]", check.message);
      setWebgl2Supported(false);
    }
  }, []);

  const { data, isLoading, error } = useSplatData({
    domainServerUrl,
    domainId,
    fileId,
    accessToken,
    enabled: Boolean(fileId && webgl2Supported),
  });

  if (!webgl2Supported) {
    console.warn("[SplatViewer] WebGL2 not supported, skipping splat rendering");
    return null;
  }

  if (error) {
    console.error("[SplatViewer] Error loading splat:", error);
    return null; // Silent failure - splat is optional
  }

  if (isLoading || !data) {
    return null; // Could add a loading indicator here if desired
  }

  // Convert alignment matrix if provided
  const alignment = alignmentMatrix
    ? new THREE.Matrix4().fromArray(alignmentMatrix)
    : undefined;

  return <CustomSplat data={data} alignment={alignment} {...splatProps} />;
}
