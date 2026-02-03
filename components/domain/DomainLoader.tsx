"use client";

import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  domainDataAtom,
  pointCloudDataAtom,
  portalsAtom,
  navMeshDataAtom,
  occlusionMeshDataAtom,
  isLoadingAtom,
  alignmentMatrixAtom,
  isInIframeAtom,
  splatDataAtom,
  splatArrayBufferAtom,
  loadingErrorAtom,
  errorDetailsAtom,
} from "@/store/domainStore";
import { domainService } from "@/services/domainService";

/**
 * DomainLoader Component
 * 
 * Handles data loading orchestration for domain viewer.
 * This component manages all side effects related to fetching domain data
 * and updating Jotai atoms. It has no visual output.
 * 
 * @example
 * ```tsx
 * <DomainLoader domainId="abc-123" />
 * ```
 * 
 * @param props - Component props
 * @param props.domainId - The unique identifier for the domain to load
 */
export default function DomainLoader({ domainId }: DomainLoaderProps) {
  // Domain data atom setters
  const setDomainData = useSetAtom(domainDataAtom);
  const setPointCloudData = useSetAtom(pointCloudDataAtom);
  const setPortals = useSetAtom(portalsAtom);
  const setNavMeshData = useSetAtom(navMeshDataAtom);
  const setOcclusionMeshData = useSetAtom(occlusionMeshDataAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const setAlignmentMatrix = useSetAtom(alignmentMatrixAtom);
  const setIsInIframe = useSetAtom(isInIframeAtom);
  const setSplatData = useSetAtom(splatDataAtom);
  const setSplatArrayBuffer = useSetAtom(splatArrayBufferAtom);
  const setLoadingError = useSetAtom(loadingErrorAtom);
  const setErrorDetails = useSetAtom(errorDetailsAtom);

  // Detect if page is loaded in an iframe (e.g., Twitter embed)
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, [setIsInIframe]);

  // Load domain data when domain ID changes
  useEffect(() => {
    loadAllDomainData(domainId);
  }, [domainId]);

  /**
   * Loads all domain data for a given domain ID including:
   * - Domain information and access tokens
   * - Portal locations
   * - Navigation mesh
   * - Occlusion mesh
   * - Point cloud data
   * - Gaussian splat data
   *
   * @param domainId - The unique identifier for the domain to load
   */
  const loadAllDomainData = async (domainId: string) => {
    setIsLoading(true);
    setLoadingError(null);
    setErrorDetails(null);
    
    // Clear splat state before fetching to prevent stale data from previous domain
    setSplatData(null);
    setSplatArrayBuffer(null);
    
    try {
      const result = await domainService.loadAllDomainData(domainId);

      if (!result.success) {
        throw new Error(result.error || "Failed to load domain data");
      }

      const data = result.data!;
      setDomainData(data.domainData);
      setPortals(data.portals);
      setNavMeshData(data.navMesh);
      setOcclusionMeshData(data.occlusionMesh);
      setPointCloudData(data.pointCloud);
      setAlignmentMatrix(data.alignmentMatrix);

      // Only set splat data if present, otherwise explicitly clear it
      if (data.splatData) {
        setSplatData({
          fileId: data.splatData.fileId,
          alignmentMatrix: data.splatData.alignmentMatrix,
        });
      } else {
        setSplatData(null);
        setSplatArrayBuffer(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load domain data";
      console.error("Error loading domain data:", error);
      setLoadingError(errorMessage);
      setErrorDetails({
        message: errorMessage,
        timestamp: Date.now(),
        domainId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return null;
}

/**
 * Props interface for DomainLoader component
 * 
 * @interface DomainLoaderProps
 * @property {string} domainId - The unique identifier for the domain to load
 */
interface DomainLoaderProps {
  domainId: string;
}
