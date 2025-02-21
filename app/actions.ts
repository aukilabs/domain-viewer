"use server"

import PosemeshServerApi from "@/utils/posemeshServerApi"

/**
 * Response type for domain information requests.
 * Contains either successful domain data or error information.
 */
interface DomainInfoResult {
  success: boolean
  data?: {
    domainInfo: any // Domain metadata
    domainAccessToken: string // Authentication token for domain access
    domainServerUrl: string // Base URL for domain server
  }
  error?: string // Error message if request fails
}

/**
 * Server action that fetches domain information and authentication tokens.
 * This function handles the initial authentication flow required to access domain data:
 * 1. Authenticates with Auki Network using app credentials
 * 2. Authenticates with the specific domain
 * 3. Returns domain metadata and access tokens
 * 
 * @param domainId - Unique identifier for the domain to fetch
 * @param posemeshClientId - Client identifier for tracking API requests
 * @returns Promise containing domain information or error details
 * @throws Error if Auki Network credentials are not configured
 */
export async function fetchDomainInfo(domainId: string, posemeshClientId: string): Promise<DomainInfoResult> {
  const apiClient = new PosemeshServerApi(posemeshClientId)
  console.log(`[${new Date().toISOString()}] Starting fetchDomainInfo for domainId: ${domainId}`)

  try {
    // Verify environment variables are configured
    const appKey = process.env.AUKI_APP_KEY
    const appSecret = process.env.AUKI_APP_SECRET

    if (!appKey || !appSecret) {
      throw new Error("Auki Network credentials are not configured")
    }

    // Authenticate with API server
    console.log(`[${new Date().toISOString()}] Authenticating with API server`)
    await apiClient.authenticate(appKey, appSecret)
    console.log(`[${new Date().toISOString()}] Authentication successful`)

    // Authenticate with domain
    console.log(`[${new Date().toISOString()}] Authenticating with domain`)
    const domainAuthData = await apiClient.authenticateDomain(domainId)
    console.log(`[${new Date().toISOString()}] Domain authentication successful`)

    // Return formatted domain information
    return {
      success: true,
      data: {
        domainInfo: {
          id: domainId,
          name: domainAuthData.name,
          createdAt: domainAuthData.created_at,
          updatedAt: domainAuthData.updated_at,
          url: domainAuthData.domain_server.url,
          ip: domainAuthData.domain_server.ip,
        },
        domainAccessToken: domainAuthData.access_token,
        domainServerUrl: domainAuthData.domain_server.url,
      },
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in fetchDomainInfo:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

