"use client"

import { useState, useEffect, useRef } from "react"
import Navbar from "@/components/Navbar"
import Viewer3D from "@/components/Viewer3D"
import DomainInfo from "@/components/DomainInfo"
import Image from "next/image"
import { fetchDomainInfo } from "@/app/actions"
import PosemeshClientApi, { Portal } from "@/utils/posemeshClientApi"

export const maxDuration = 60

interface DomainData {
  domainInfo: any
  domainAccessToken: string
  domainServerUrl: string
}

/**
 * Main domain viewer page component that handles loading and displaying domain data.
 * This component manages the state for all domain-related data including point clouds,
 * portals, navigation meshes, and occlusion meshes.
 */
export default function DomainPage({ params }: { params: { id: string } }) {
  const [domainData, setDomainData] = useState<DomainData | null>(null)
  const [pointCloudData, setPointCloudData] = useState<ArrayBuffer | null>(null)
  const [portals, setPortals] = useState<Portal[] | null>(null)
  const [navMeshData, setNavMeshData] = useState<ArrayBuffer | null>(null)
  const [occlusionMeshData, setOcclusionMeshData] = useState<ArrayBuffer | null>(null)
  const [domainDeviceData, setDomainDeviceData] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [portalsVisible, setPortalsVisible] = useState(true)
  const [navMeshVisible, setNavMeshVisible] = useState(true)
  const [occlusionVisible, setOcclusionVisible] = useState(true)
  const [pointCloudVisible, setPointCloudVisible] = useState(true)
  const [scan3DVisible, setScane3DVisible] = useState(true)
  
  // Create a single instance of PosemeshClientApi
  const clientApiRef = useRef<PosemeshClientApi | null>(null)
  // Reference to store the interval ID
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize the API client once
  useEffect(() => {
    if (!clientApiRef.current) {
      clientApiRef.current = new PosemeshClientApi()
    }
    
    // Clean up polling interval on component unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    loadAllDomainData(params.id)
    
    // Component cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null;
      }
    }
  }, [params.id])

  /**
   * Fetches only the domain device data
   */
  const fetchDomainDeviceData = async (apiClient: PosemeshClientApi | null, domainData: any, domainDeviceItemId: string) => {
    console.log(`********* fetchDomainDeviceData called *********`)

    if (!apiClient) {
      console.log("Cannot fetch domain device data: apiClient is null")
      return
    }

    try {
        const domainDeviceBuffer = await apiClient.downloadFile(
          domainData.domainServerUrl,
          domainData.domainInfo.id,
          domainDeviceItemId,
          domainData.domainAccessToken,
        )
        
        const newDomainDeviceData = JSON.parse(new TextDecoder().decode(domainDeviceBuffer))
        
        // Check if the data is recent (less than 5 seconds old)
        const currentTime = Date.now()
        // Convert nanoseconds timestamp to milliseconds for Date constructor
        const dataTime = new Date(Number(newDomainDeviceData.timestamp) / 1000000)
        const timeDiff = currentTime - dataTime.getTime()
        
        if (true) { // 10 seconds in milliseconds
        // if (newDomainDeviceData.device_id === "mentra_posemesh_client_id") { // 10 seconds in milliseconds
          console.log(`[${new Date().toISOString()}] Domain device data refreshed:`, newDomainDeviceData)
          setDomainDeviceData(prevData => {
            // Remove any existing data for this device
            const filteredData = prevData?.filter(d => d.device_id !== newDomainDeviceData.device_id) || []
            // Add the new data
            return [...filteredData, newDomainDeviceData]
          })
        } else {
          console.log(`[${new Date().toISOString()}] Ignoring stale device data (${timeDiff}ms old):`, newDomainDeviceData)
          // Remove this device's data if it exists
          setDomainDeviceData(prevData => {
            if (!prevData) return []
            return prevData.filter(d => d.device_id !== newDomainDeviceData.device_id)
          })
        }
    } catch (error) {
      console.error("Error refreshing domain device data:", error)
    }
  }

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
    setIsLoading(true)
    
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    
    try {
      if (!clientApiRef.current) {
        clientApiRef.current = new PosemeshClientApi()
      }
      
      // First, get domain info
      const result = await fetchDomainInfo(domainId, clientApiRef.current.posemeshClientId)
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch domain info")
      }

      const data = result.data
      setDomainData(data)

      // Get domain portals
      const portals = await clientApiRef.current.fetchDomainPortals(
        data.domainServerUrl,
        data.domainInfo.id,
        data.domainAccessToken
      )
      setPortals(portals)

      // Get domain all domain data info
      const domainData = await clientApiRef.current.fetchDomainData(
        data.domainServerUrl,
        data.domainInfo.id, 
        data.domainAccessToken
      )

      // Load navigation mesh
      const navMeshItem = domainData.find((item: any) => item.data_type === "obj" && item.name === "navmesh_v1")
      if (navMeshItem) {
        const navMeshBuffer = await clientApiRef.current.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          navMeshItem.id,
          data.domainAccessToken,
        )
        setNavMeshData(navMeshBuffer)
      }
      else {
        console.log(`[${new Date().toISOString()}] No navigation mesh data found for this domain`)
      }

      // Load occlusion mesh
      const occlusionMeshItem = domainData.find((item: any) => item.data_type === "obj" && item.name === "occlusionmesh_v1")
      if (occlusionMeshItem) {
        const occlusionMeshBuffer = await clientApiRef.current.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          occlusionMeshItem.id,
          data.domainAccessToken,
        )
        setOcclusionMeshData(occlusionMeshBuffer)
      }
      else {
        console.log(`[${new Date().toISOString()}] No occlusion mesh data found for this domain`)
      }

      // Load domain device data
      const domainDeviceItems = domainData.filter((item: any) => item.data_type === "reported_pose_json")
      console.log(`[${new Date().toISOString()}] Found ${domainDeviceItems.length} domain device items`)
      if (domainDeviceItems.length > 0) {
        const domainDeviceDataArray = await Promise.all(
          domainDeviceItems.map(async (item: { id: string }) => {
            if (!clientApiRef.current) {
              throw new Error("API client not initialized")
            }
            const domainDeviceBuffer = await clientApiRef.current.downloadFile(
              data.domainServerUrl,
              data.domainInfo.id,
              item.id,
              data.domainAccessToken,
            )
            return JSON.parse(new TextDecoder().decode(domainDeviceBuffer))
          })
        )
        
        console.log(`[${new Date().toISOString()}] Domain device data loaded successfully:`, domainDeviceDataArray)
        setDomainDeviceData(domainDeviceDataArray)
        
        // Set up polling for device data updates
        console.log("Setting up device data polling interval")
        pollingIntervalRef.current = setInterval(async () => {
          console.log("Polling interval triggered")
          try {
            if (!clientApiRef.current) {
              console.error("API client not initialized")
              return
            }
            
            // Fetch all domain data to get current list of reported_pose_json items
            const currentDomainData = await clientApiRef.current.fetchDomainData(
              data.domainServerUrl,
              data.domainInfo.id, 
              data.domainAccessToken
            )
            
            // Filter for reported_pose_json items
            const currentDomainDeviceItems = currentDomainData.filter((item: any) => item.data_type === "reported_pose_json")
            
            // Fetch data for each item
            await Promise.all(
              currentDomainDeviceItems.map(async (item: { id: string }) => {
                await fetchDomainDeviceData(clientApiRef.current, data, item.id)
              })
            )
          } catch (error) {
            console.error("Error during polling:", error)
          }
        }, 1000)
      }
      else {
        console.log(`[${new Date().toISOString()}] No domain device data found for this domain`)
      }

      // Load point cloud
      const domainMetadataItem = domainData.find((item: any) => item.name === "domain_metadata")
      if (domainMetadataItem) {
        const domainMetadata = await clientApiRef.current.downloadFile(
          data.domainServerUrl,
          data.domainInfo.id,
          domainMetadataItem.id,
          data.domainAccessToken,
        )
        
        const metadata = JSON.parse(new TextDecoder().decode(domainMetadata))
        if (metadata.canonicalRefinement) {
          const pointCloudItem = domainData.find((item: any) => item.data_type === "refined_pointcloud_ply" && item.name === `refined_pointcloud_${metadata.canonicalRefinement}`)
          if (pointCloudItem) {
            const pointCloudBuffer = await clientApiRef.current.downloadFile(
              data.domainServerUrl,
              data.domainInfo.id,
              pointCloudItem.id,
              data.domainAccessToken,
            )
            setPointCloudData(pointCloudBuffer)
          }
          else {
            console.log(`[${new Date().toISOString()}] No point cloud data found for this domain`)
          }
        }
      } else {
        console.log(`[${new Date().toISOString()}] No domain matedata found for this domain`)
      }
    } catch (error) {
      console.error("Error loading domain data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // This function is now only used for navigation
  const handleDomainInfoLoaded = () => {
    // Intentionally empty as data loading is handled by useEffect
  }

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
        scan3DVisible={scan3DVisible}
        domainDeviceData={domainDeviceData}
      />
      <Navbar onDomainInfoLoaded={handleDomainInfoLoaded} currentDomainId={params.id} isLoading={isLoading} />
      {domainData && (
        <DomainInfo 
          domainInfo={domainData.domainInfo} 
          onTogglePortals={() => setPortalsVisible(!portalsVisible)}
          portalsVisible={portalsVisible}
          onToggleNavMesh={() => setNavMeshVisible(!navMeshVisible)}
          navMeshVisible={navMeshVisible}
          onToggleOcclusion={() => setOcclusionVisible(!occlusionVisible)}
          occlusionVisible={occlusionVisible}
          onTogglePointCloud={() => setPointCloudVisible(!pointCloudVisible)}
          pointCloudVisible={pointCloudVisible}
          onToggleScan3D={() => setScane3DVisible(!scan3DVisible)}
          scan3DVisible={scan3DVisible}
        />
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
  )
}

