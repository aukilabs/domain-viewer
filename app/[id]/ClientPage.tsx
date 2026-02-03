"use client";

import DomainInfo from "@/components/DomainInfo";
import Navbar from "@/components/Navbar";
import Viewer3D from "@/components/Viewer3D";
import { domainService } from "@/services/domainService";
import Image from "next/image";
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
import {
  portalsVisibleAtom,
  navMeshVisibleAtom,
  occlusionVisibleAtom,
  pointCloudVisibleAtom,
  splatVisibleAtom,
} from "@/store/visualizationStore";

export const maxDuration = 60;

/**
 * Main domain viewer page component that handles loading and displaying domain data.
 * This component manages the state for all domain-related data including point clouds,
 * portals, navigation meshes, and occlusion meshes using Jotai atoms.
 */
export default function DomainPage({ params, hideUI = false }: { params: { id: string }, hideUI?: boolean }) {
  // Domain data atoms
  const [domainData, setDomainData] = useAtom(domainDataAtom);
  const setPointCloudData = useSetAtom(pointCloudDataAtom);
  const setPortals = useSetAtom(portalsAtom);
  const setNavMeshData = useSetAtom(navMeshDataAtom);
  const setOcclusionMeshData = useSetAtom(occlusionMeshDataAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const setAlignmentMatrix = useSetAtom(alignmentMatrixAtom);
  const [isInIframe, setIsInIframe] = useAtom(isInIframeAtom);
  const setSplatData = useSetAtom(splatDataAtom);
  const setSplatArrayBuffer = useSetAtom(splatArrayBufferAtom);
  const setLoadingError = useSetAtom(loadingErrorAtom);
  const setErrorDetails = useSetAtom(errorDetailsAtom);


  useEffect(() => {
    // Detect if page is loaded in an iframe (e.g., Twitter embed)
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    loadAllDomainData(params.id);
  }, [params.id]);

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

  // This function is now only used for navigation
  const handleDomainInfoLoaded = () => {
    // Intentionally empty as data loading is handled by useEffect
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#282828]">
      <Viewer3D isEmbed={isInIframe} />
      {!hideUI && !isInIframe && (
        <div className="hidden md:block">
          <Navbar
            onDomainInfoLoaded={handleDomainInfoLoaded}
            currentDomainId={params.id}
            isLoading={isLoading}
          />
          <DomainInfo />
        </div>
      )}
      <div className="absolute bottom-4 right-4">
        <Image
          src="/images/logo.svg"
          alt="Auki Logo"
          width={48}
          height={76}
          priority
          className="w-[48px] h-[76px] opacity-60"
        />
      </div>
    </div>
  );
}
