const API_SERVER = process.env.AUKI_API_SERVER
const DDS_SERVER = process.env.AUKI_DDS_SERVER

// Remove the throw statement and add a console warning
if (!API_SERVER || !DDS_SERVER) {
  console.warn(
    "AUKI_API_SERVER and/or AUKI_DDS_SERVER environment variables are not set. Some functionality may be limited.",
  )
}

/**
 * Summarises a JWT for logging: subject and expiry only. Never log the token
 * itself, since anyone who can read the logs could use it until it expires.
 * This only decodes the payload for display; it does not verify anything.
 */
function describeToken(token: unknown): { sub?: string; expires?: string } {
  if (typeof token !== "string") return {}
  try {
    const payload = token.split(".")[1]
    if (!payload) return {}
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return {
      sub: typeof claims.sub === "string" ? claims.sub : undefined,
      expires: typeof claims.exp === "number" ? new Date(claims.exp * 1000).toISOString() : undefined,
    }
  } catch {
    return {}
  }
}

class PosemeshServerApi {
  private accessToken: string | null = null
  private domainAccessToken: string | null = null
  private domainServerUrl: string | null = null

  private posemeshClientId: string

  constructor(posemeshClientId: string) {
    this.posemeshClientId = posemeshClientId
  }

  async authenticate(appKey: string, appSecret: string): Promise<void> {
    if (!API_SERVER) {
      throw new Error("AUKI_API_SERVER environment variable is not set")
    }
    try {
      const basic = btoa(`${appKey}:${appSecret}`);
      const request = await fetch(`${API_SERVER}/service/domains-access-token`, {
        method: 'POST',
        headers: {
          "Authorization": `Basic ${basic}`,
          "User-Agent": "domain-viewer",
          "posemesh-client-id": this.posemeshClientId,
          "Accept": "application/json",
        }
      });

      if (!request.ok) {
        const raw = await request.text().catch(() => "");
        let message = raw;
        try {
          const json = JSON.parse(raw);
          message = json.message || raw;
        } catch {}
        throw new Error(`Auth failed (${request.status}): ${message || request.statusText}`)
      }

      const response = await request.json();
      this.accessToken = response.access_token;
      console.log("Authenticated app with API server:", describeToken(response.access_token))
    } catch (error) {
      console.error("Authentication failed:", error)
      throw new Error(error instanceof Error ? error.message : "Authentication failed")
    }
  }

  async authenticateDomain(domainId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.")
    }
    if (!DDS_SERVER) {
      throw new Error("AUKI_DDS_SERVER environment variable is not set")
    }
    try {
      const request = await fetch(`${DDS_SERVER}/api/v1/domains/${domainId}/auth`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "domain-viewer",
          "posemesh-client-id": this.posemeshClientId,
          "Accept": "application/json",
        }
      });

      if (!request.ok) {
        const raw = await request.text().catch(() => "");
        let message = raw;
        try {
          const json = JSON.parse(raw);
          message = json.message || raw;
        } catch {}
        throw new Error(`Domain auth failed (${request.status}): ${message || request.statusText}`)
      }

      const response = await request.json();
      this.domainAccessToken = response.access_token;
      this.domainServerUrl = response.domain_server.url;
      console.log("Authenticated domain:", {
        domainId,
        name: response.name,
        domainServer: response.domain_server.url,
        token: describeToken(response.access_token),
      })
      return response;
    } catch (error) {
      console.error("Domain authentication failed:", error)
      throw new Error(error instanceof Error ? error.message : "Domain authentication failed")
    }
  }
}

export default PosemeshServerApi 