"use server"

import { getDomainAccess } from "@/utils/aukiAuthManager"
import { isValidDomainId } from "@/utils/validation"

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
 *
 * Uses @auki/authentication under the hood — the auth client transparently
 * handles network auth → discovery auth → domain access and caches/refreshes
 * tokens in server process memory.
 *
 * @param domainId - Unique identifier for the domain to fetch
 * @param _posemeshClientId - Client identifier (kept for call-site compatibility)
 * @returns Promise containing domain information or error details
 */
export async function fetchDomainInfo(domainId: string, _posemeshClientId: string): Promise<DomainInfoResult> {
  if (!isValidDomainId(domainId)) {
    return {
      success: false,
      error: `Invalid domain ID format: ${domainId}`,
    }
  }

  console.log(`[${new Date().toISOString()}] Starting fetchDomainInfo for domainId: ${domainId}`)

  try {
    const domainAccess = await getDomainAccess(domainId)
    console.log(`[${new Date().toISOString()}] Domain access granted for: ${domainId}`)

    return {
      success: true,
      data: {
        domainInfo: {
          id: domainAccess.id,
          name: domainAccess.name,
          url: domainAccess.domain_server.url,
          ip: domainAccess.domain_server.ip,
        },
        domainAccessToken: domainAccess.access_token,
        domainServerUrl: domainAccess.domain_server.url,
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
