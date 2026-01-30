"use client";

import { fetchDomainInfo } from "@/app/actions";
import DomainInfo from "@/components/DomainInfo";
import Navbar from "@/components/Navbar";
import Viewer3D from "@/components/Viewer3D";
import PosemeshClientApi, { Portal } from "@/utils/posemeshClientApi";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

export const maxDuration = 60;

interface DomainData {
  domainInfo: any;
  domainAccessToken: string;
  domainServerUrl: string;
}

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

  console.log("alignmentMatrix111", alignmentMatrix);

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
   *
   * @param domainId - The unique identifier for the domain to load
   */
  const loadAllDomainData = async (domainId: string) => {
    setIsLoading(true);
    try {
      const clientApi = new PosemeshClientApi();

      // First, get domain info
      const result = await fetchDomainInfo(
        domainId,
        clientApi.posemeshClientId
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch domain info");
      }

      const data = result.data;
      setDomainData(data);

      // Get domain portals
      const portals = await clientApi.fetchDomainPortals(
        data.domainServerUrl,
        data.domainInfo.id,
        data.domainAccessToken
      );
      setPortals(portals);

      // Get domain all domain data info
      const domainData = await clientApi.fetchDomainData(
        data.domainServerUrl,
        data.domainInfo.id,
        data.domainAccessToken
      );

      // Load navigation mesh
      const navMeshItem = domainData.find(
        (item: any) => item.data_type === "obj" && item.name === "navmesh_v1"
      );
      if (navMeshItem) {
        const navMeshBuffer = await clientApi.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          navMeshItem.id,
          data.domainAccessToken
        );
        setNavMeshData(navMeshBuffer);
      } else {
        console.log(
          `[${new Date().toISOString()}] No navigation mesh data found for this domain`
        );
      }

      // Load occlusion mesh
      const occlusionMeshItem = domainData.find(
        (item: any) =>
          item.data_type === "obj" && item.name === "occlusionmesh_v1"
      );
      if (occlusionMeshItem) {
        const occlusionMeshBuffer = await clientApi.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          occlusionMeshItem.id,
          data.domainAccessToken
        );
        setOcclusionMeshData(occlusionMeshBuffer);
      } else {
        console.log(
          `[${new Date().toISOString()}] No occlusion mesh data found for this domain`
        );
      }

      // Load point cloud
      const domainMetadataItem = domainData.find(
        (item: any) => item.name === "domain_metadata"
      );
      if (domainMetadataItem) {
        const domainMetadata = await clientApi.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          domainMetadataItem.id,
          data.domainAccessToken
        );

        const metadata = JSON.parse(new TextDecoder().decode(domainMetadata));
        console.log("metadata", metadata);
        setAlignmentMatrix(metadata.canonicalRefinementAlignmentMatrix);
        if (metadata.canonicalRefinement) {
          const pointCloudItem = domainData.find(
            (item: any) =>
              item.data_type === "refined_pointcloud_ply" &&
              item.name === `refined_pointcloud_${metadata.canonicalRefinement}`
          );
          if (pointCloudItem) {
            const pointCloudBuffer = await clientApi.downloadFile(
              data.domainServerUrl,
              data.domainInfo.id,
              pointCloudItem.id,
              data.domainAccessToken
            );
            setPointCloudData(pointCloudBuffer);
          } else {
            console.log(
              `[${new Date().toISOString()}] No point cloud data found for this domain`
            );
          }


          console.log("metadata.canonicalRefinement", metadata.canonicalRefinement);
          console.log("domainData count", domainData.length);

          // Load gaussian splat (if available)
          const splatItem = domainData.find(
            (item: any) =>
              (item.name === `refined_splat_${metadata.canonicalRefinement}` ||
                item.name === `splat_${metadata.canonicalRefinement}` ||
                item.name === `gaussian_splat_${metadata.canonicalRefinement}`) &&
              (item.data_type === "refined_splat" ||
                item.data_type === "splat_data" ||
                item.data_type === "splat" ||
                item.data_type === "gaussian_splat")
          );
          if (splatItem) {
            console.log("[loadAllDomainData] Found gaussian splat:", splatItem);
            setSplatData({
              fileId: splatItem.id,
              alignmentMatrix: metadata.canonicalRefinementAlignmentMatrix || null,
            });
          } else {
            console.log(
              `[${new Date().toISOString()}] No gaussian splat data found for this domain`
            );
          }
        }
      } else {
        console.log(
          `[${new Date().toISOString()}] No domain matedata found for this domain`
        );
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
