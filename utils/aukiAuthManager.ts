import { Client, type ClientConfig, type DomainAccess } from "@auki/authentication";

const API_SERVER = process.env.AUKI_API_SERVER;
const DDS_SERVER = process.env.AUKI_DDS_SERVER;
const APP_KEY = process.env.AUKI_APP_KEY;
const APP_SECRET = process.env.AUKI_APP_SECRET;

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

let clientInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;

/**
 * Lazily initializes and returns a singleton @auki/authentication Client
 * configured with app-key credentials from environment variables.
 * The client and its tokens live in server process memory only.
 */
async function getClient(): Promise<Client> {
  if (clientInstance) return clientInstance;
  if (initPromise) return initPromise;

  if (!API_SERVER || !DDS_SERVER) {
    throw new Error(
      "AUKI_API_SERVER and AUKI_DDS_SERVER environment variables must be set"
    );
  }
  if (!APP_KEY || !APP_SECRET) {
    throw new Error("AUKI_APP_KEY and AUKI_APP_SECRET environment variables must be set");
  }

  const config: ClientConfig = {
    apiUrl: API_SERVER,
    refreshUrl: `${API_SERVER}/user/refresh`,
    ddsUrl: DDS_SERVER,
    clientId: "domain-viewer",
    refreshThresholdMs: REFRESH_THRESHOLD_MS,
  };

  initPromise = Client.create(config).then((client) => {
    client.setCredentials({
      type: "appKey",
      appKey: APP_KEY!,
      appSecret: APP_SECRET!,
    });

    client.onRefreshFailed((info) => {
      console.warn(
        `[AukiAuthManager] ${info.tokenType} token refresh failed: ${info.reason}` +
          (info.requiresReauth ? " — full re-auth required" : "")
      );
    });

    clientInstance = client;
    return client;
  });

  return initPromise;
}

/**
 * Obtain domain access for the given domainId.
 * The auth client transparently handles the full chain:
 *   network auth → discovery auth → domain access
 * and caches/refreshes tokens in memory.
 */
export async function getDomainAccess(domainId: string): Promise<DomainAccess> {
  const client = await getClient();
  return client.getDomainAccess(domainId);
}

/**
 * Force-invalidate all cached tokens so the next request triggers
 * a full re-authentication. Useful if credentials are rotated at runtime.
 */
export async function forceReauth(): Promise<void> {
  const client = await getClient();
  client.forceReauth();
}
