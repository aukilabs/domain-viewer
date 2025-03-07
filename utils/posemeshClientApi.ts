export interface Portal {
  altitude: number;
  domain_id: string;
  gps_timestamp: number;
  horizontal_accuracy: number;
  id: string;
  latitude: number;
  longitude: number;
  placed_at: string;
  px: number,
  py: number,
  pz: number,
  reported_size: number,
  rw: number,
  rx: number,
  ry: number,
  rz: number,
  scanner_device_id: string,
  scanner_device_model: string,
  scanner_device_name: string,
  short_id: string,
  vertical_accuracy: number,
}

/**
 * Client-side API wrapper for interacting with the Posemesh domain services.
 * Handles authentication and data fetching for domain-related operations.
 */
class PosemeshClientApi {
  public readonly posemeshClientId: string

  constructor(posemeshClientId?: string) {
    this.posemeshClientId = posemeshClientId || this.getOrCreateClientId()
  }

  /**
   * Fetches portal (lighthouse) data for a specific domain.
   * Portals represent QR code markers in the physical space.
   * 
   * @param domainServerUrl - Base URL of the domain server
   * @param domainId - Unique identifier of the domain
   * @param accessToken - Authentication token for the domain
   * @returns Array of Portal objects containing position and orientation data
   */
  async fetchDomainPortals(domainServerUrl: string, domainId: string, accessToken: string): Promise<Portal[]> {
    console.log(`[${new Date().toISOString()}] Fetching domain poses`)
    try {
      const response = await fetch(`${domainServerUrl}/api/v1/domains/${domainId}/lighthouses`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "domain-viewer",
        },
      })
      const data = await response.json()
      console.log(`[${new Date().toISOString()}] Domain portals fetched successfully`)
      return data.poses
    } catch (error) {
      console.error("Failed to fetch domain portals:", error)
      throw new Error("Failed to fetch domain portals") 
    }
  }

  /**
   * Fetches all available data for a domain including point clouds, meshes, and metadata.
   * 
   * @param domainServerUrl - Base URL of the domain server
   * @param domainId - Unique identifier of the domain
   * @param accessToken - Authentication token for the domain
   * @returns Array of domain data objects
   */
  async fetchDomainData(domainServerUrl: string, domainId: string, accessToken: string) {
    console.log(`[${new Date().toISOString()}] Fetching domain data`)
    try {
      const response = await fetch(`${domainServerUrl}/api/v1/domains/${domainId}/data`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "domain-viewer",
        },
      })
      const data = await response.json()
      console.log(`[${new Date().toISOString()}] Domain data fetched successfully`)
      return data.data
    } catch (error) {
      console.error("Failed to fetch domain data:", error)
      throw new Error("Failed to fetch domain data")
    }
  }

  /**
   * Downloads a specific file from the domain server.
   * Used for retrieving point clouds, navigation meshes, and other binary data.
   * 
   * @param domainServerUrl - Base URL of the domain server
   * @param domainId - Unique identifier of the domain
   * @param fileId - Unique identifier of the file to download
   * @param accessToken - Authentication token for the domain
   * @param raw - Whether to return raw binary data (default: 1)
   * @returns ArrayBuffer containing the file data
   */
  async downloadFile(domainServerUrl: string, domainId: string, fileId: string, accessToken: string, raw: number = 1) {
    console.log(`[${new Date().toISOString()}] Downloading domain data`)
    try {
      const response = await fetch(`${domainServerUrl}/api/v1/domains/${domainId}/data/${fileId}?raw=${raw}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "domain-viewer",
        },
      })
      const data = await response.arrayBuffer()
      console.log(`[${new Date().toISOString()}] Domain data downloaded successfully`)
      return data
    } catch (error) {
      console.error("Failed to download file:", error)
      throw new Error("Failed to download file")
    }
  }

  /**
   * Gets an existing posemesh client ID from storage or creates a new one.
   * Checks multiple storage locations (localStorage, sessionStorage, cookies)
   * for maximum persistence across browser sessions.
   * 
   * @returns string - The posemesh client ID, either retrieved or newly generated
   */
  private getOrCreateClientId(): string {
    // Get or create posemesh_client_id from multiple storage options
    let posemeshClientId = localStorage.getItem('posemesh_client_id') || 
                          sessionStorage.getItem('posemesh_client_id') ||
                          document.cookie
                            .split('; ')
                            .find(row => row.startsWith('posemesh_client_id='))
                            ?.split('=')[1];

    if (!posemeshClientId) {
      posemeshClientId = crypto.randomUUID();
      // Store in multiple places for persistence
      localStorage.setItem('posemesh_client_id', posemeshClientId);
      sessionStorage.setItem('posemesh_client_id', posemeshClientId);
      document.cookie = `posemesh_client_id=${posemeshClientId}; path=/; max-age=31536000`; // 1 year expiry
    }

    return posemeshClientId;
  }
}

export default PosemeshClientApi

