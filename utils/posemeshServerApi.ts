const API_SERVER = process.env.AUKI_API_SERVER
const DDS_SERVER = process.env.AUKI_DDS_SERVER

// Remove the throw statement and add a console warning
if (!API_SERVER || !DDS_SERVER) {
  console.warn(
    "AUKI_API_SERVER and/or AUKI_DDS_SERVER environment variables are not set. Some functionality may be limited.",
  )
}

const AXIOS_TIMEOUT = 240000 // 4 minutes

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
        }
      });
      const response = await request.json();
      this.accessToken = response.access_token;
      console.log("Authentication response:", JSON.stringify(response, null, 2))
    } catch (error) {
      console.error("Authentication failed:", error)
      throw new Error("Authentication failed")
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
        }
      });
      const response = await request.json();
      this.domainAccessToken = response.access_token;
      this.domainServerUrl = response.domain_server.url;
      console.log("Domain authentication response:", JSON.stringify(response, null, 2))
      return response;
    } catch (error) {
      console.error("Domain authentication failed:", error)
      throw new Error("Domain authentication failed")
    }
  }
}

export default PosemeshServerApi 