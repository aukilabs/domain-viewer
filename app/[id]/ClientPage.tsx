"use client";

import DomainInfo from "@/components/DomainInfo";
import Navbar from "@/components/Navbar";
import Viewer3D from "@/components/Viewer3D";
import { domainService } from "@/services/domainService";
import type { DomainData, Portal } from "@/types/domain";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

export const maxDuration = 60;

/**
 * Main domain viewer page component that handles loading and displaying domain data.
 * This component manages the state for all domain-related data including point clouds,
 * portals, navigation meshes, and occlusion meshes.
 */
export default function DomainPage({ params, hideUI = false }: { params: { id: string }, hideUI?: boolean }) {
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [pointCloudData, setPointCloudData] = useState<ArrayBuffer | null>(
    null
  );
  const [portals, setPortals] = useState<Portal[] | null>(null);
  const [navMeshData, setNavMeshData] = useState<ArrayBuffer | null>(null);
  const [occlusionMeshData, setOcclusionMeshData] =
    useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portalsVisible, setPortalsVisible] = useState(true);
  const [navMeshVisible, setNavMeshVisible] = useState(true);
  const [occlusionVisible, setOcclusionVisible] = useState(true);
  const [pointCloudVisible, setPointCloudVisible] = useState(true);
  const [alignmentMatrix, setAlignmentMatrix] = useState<number[] | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [splatData, setSplatData] = useState<{
    fileId: string;
    alignmentMatrix: number[] | null;
  } | null>(null);
  const [splatVisible, setSplatVisible] = useState(true);
  const [splatArrayBuffer, setSplatArrayBuffer] = useState<ArrayBuffer | null>(null);


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

      if (data.splatData) {
        setSplatData({
          fileId: data.splatData.fileId,
          alignmentMatrix: data.splatData.alignmentMatrix,
        });
      }
    } catch (error) {
      console.error("Error loading domain data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // This function is now only used for navigation
  const handleDomainInfoLoaded = () => {
    // Intentionally empty as data loading is handled by useEffect
  };

  // Memoize toggle callbacks to prevent unnecessary re-renders
  const handleTogglePortals = useCallback(() => setPortalsVisible(prev => !prev), []);
  const handleToggleNavMesh = useCallback(() => setNavMeshVisible(prev => !prev), []);
  const handleToggleOcclusion = useCallback(() => setOcclusionVisible(prev => !prev), []);
  const handleTogglePointCloud = useCallback(() => setPointCloudVisible(prev => !prev), []);
  const handleToggleSplat = useCallback(() => setSplatVisible(prev => !prev), []);
  const handleSplatDataLoaded = useCallback((data: ArrayBuffer) => {
    setSplatArrayBuffer(data);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#282828]">
      <Viewer3D
        pointCloudData={pointCloudData}
        portals={portals}
        occlusionMeshData={occlusionMeshData}
        navMeshData={navMeshData}
        portalsVisible={portalsVisible}
        navMeshVisible={navMeshVisible}
        occlusionVisible={occlusionVisible}
        pointCloudVisible={pointCloudVisible}
        alignmentMatrix={alignmentMatrix}
        isEmbed={isInIframe}
        splatData={splatData}
        splatVisible={splatVisible}
        domainData={domainData}
        onSplatDataLoaded={handleSplatDataLoaded}
      />
      {!hideUI && !isInIframe && (
        <div className="hidden md:block">
          <Navbar
            onDomainInfoLoaded={handleDomainInfoLoaded}
            currentDomainId={params.id}
            isLoading={isLoading}
          />
          {domainData && (
            <DomainInfo
              domainInfo={domainData.domainInfo}
              onTogglePortals={handleTogglePortals}
              portalsVisible={portalsVisible}
              onToggleNavMesh={handleToggleNavMesh}
              navMeshVisible={navMeshVisible}
              onToggleOcclusion={handleToggleOcclusion}
              occlusionVisible={occlusionVisible}
              onTogglePointCloud={handleTogglePointCloud}
              pointCloudVisible={pointCloudVisible}
              onToggleSplat={handleToggleSplat}
              splatVisible={splatVisible}
              hasSplat={!!splatData}
              splatData={splatArrayBuffer}
              domainId={domainData.domainInfo.id}
              splatFileId={splatData?.fileId}
            />
          )}
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
