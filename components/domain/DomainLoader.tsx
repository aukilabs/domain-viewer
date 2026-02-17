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
  domainDataItemsAtom,
  refinementIdAtom,
} from "@/store/domainStore";
import { useDomainData } from "@/hooks";

/**
 * DomainLoader Component
 * 
 * Handles data loading orchestration for domain viewer using the useDomainData hook.
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
  const setIsLoading = useSetAtom(isLoadingAtom);
  const setAlignmentMatrix = useSetAtom(alignmentMatrixAtom);
  const setIsInIframe = useSetAtom(isInIframeAtom);
  const setSplatData = useSetAtom(splatDataAtom);
  const setSplatArrayBuffer = useSetAtom(splatArrayBufferAtom);
  const setDomainDataItems = useSetAtom(domainDataItemsAtom);
  const setRefinementId = useSetAtom(refinementIdAtom);
  const setLoadingError = useSetAtom(loadingErrorAtom);
  const setErrorDetails = useSetAtom(errorDetailsAtom);

  // Use the useDomainData hook for data fetching
  const { data, isLoading, isError, error } = useDomainData({
    domainId,
    enabled: Boolean(domainId),
  });

  // Detect if page is loaded in an iframe (e.g., Twitter embed)
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, [setIsInIframe]);

  // Update loading state
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  // Handle errors
  useEffect(() => {
    if (isError && error) {
      const errorMessage = error.message || "Failed to load domain data";
      console.error("[DomainLoader] Error loading domain data:", error);
      setLoadingError(errorMessage);
      setErrorDetails({
        message: errorMessage,
        timestamp: Date.now(),
        domainId,
      });
    } else if (!isError) {
      // Clear errors when not in error state
      setLoadingError(null);
      setErrorDetails(null);
    }
  }, [isError, error, domainId, setLoadingError, setErrorDetails]);

  // Update atoms when data is loaded successfully
  useEffect(() => {
    if (data) {
      console.log("[DomainLoader] Updating atoms with loaded data");
      
      // Clear splat state before updating to prevent stale data
      setSplatData(null);
      setSplatArrayBuffer(null);

      // Update all domain data atoms
      setDomainData(data.domainData);
      setPortals(data.portals);
      setNavMeshData(data.navMesh);
      setOcclusionMeshData(data.occlusionMesh);
      setPointCloudData(data.pointCloud);
      setAlignmentMatrix(data.alignmentMatrix);

      // Store domain data items list and refinement ID for splat loading
      setDomainDataItems(data.domainDataItems || []);
      setRefinementId(data.refinementId || null);

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
    }
  }, [
    data,
    setDomainData,
    setPortals,
    setNavMeshData,
    setOcclusionMeshData,
    setPointCloudData,
    setAlignmentMatrix,
    setSplatData,
    setSplatArrayBuffer,
    setDomainDataItems,
    setRefinementId,
  ]);

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
