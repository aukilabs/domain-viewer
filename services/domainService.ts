/**
 * Domain service for managing domain data operations.
 * Orchestrates authentication, data fetching, and file downloads for domain viewing.
 */

import { fetchDomainInfo } from '@/app/actions';
import {
  DomainData,
  DomainDataItem,
  DomainDataCollection,
  DomainMetadata,
  Portal,
  ServiceResult,
  NavMeshItem,
  OcclusionMeshItem,
  PointCloudItem,
  SplatItem,
  MetadataItem,
  SplatData,
  AlignmentMatrix,
} from '@/types/domain';
import { fileService, FileService } from './fileService';
import {
  DomainServiceError,
  AuthenticationError,
  ParseError,
  wrapError,
} from './errors';
import { retryWithBackoff } from '@/utils/retry';

/**
 * DomainService class for managing all domain-related operations.
 * Provides high-level methods for loading domain data including authentication,
 * portal fetching, mesh downloads, and point cloud retrieval.
 */
export class DomainService {
  private readonly fileService: FileService;
  private _posemeshClientId?: string;

  constructor(posemeshClientId?: string, fileService?: FileService) {
    this._posemeshClientId = posemeshClientId;
    this.fileService = fileService || new FileService();
  }

  /**
   * Gets the posemesh client ID, lazily creating it if needed.
   * This property ensures client ID is only accessed when needed, not during module initialization.
   */
  private get posemeshClientId(): string {
    if (!this._posemeshClientId) {
      this._posemeshClientId = this.getOrCreateClientId();
    }
    return this._posemeshClientId;
  }

  /**
   * Authenticates with a domain and retrieves domain information.
   * Calls the server action to handle authentication with environment credentials.
   * 
   * @param domainId - Unique identifier of the domain
   * @returns Promise resolving to domain data with authentication tokens
   * @throws {AuthenticationError} If authentication fails
   * 
   * @example
   * ```typescript
   * const domainService = new DomainService();
   * const domainData = await domainService.authenticateDomain('domain-123');
   * console.log('Domain authenticated:', domainData.domainInfo.name);
   * ```
   */
  async authenticateDomain(domainId: string): Promise<DomainData> {
    console.log(`[${new Date().toISOString()}] Authenticating domain: ${domainId}`);

    try {
      const result = await fetchDomainInfo(domainId, this.posemeshClientId);

      if (!result.success || !result.data) {
        throw new AuthenticationError(
          result.error || 'Failed to authenticate domain',
          { domainId }
        );
      }

      console.log(`[${new Date().toISOString()}] Domain authenticated successfully`);
      return result.data;
    } catch (error) {
      throw wrapError(error, 'authenticateDomain', { domainId });
    }
  }

  /**
   * Fetches portal (lighthouse) data for a domain.
   * Portals represent QR code markers in the physical space.
   * 
   * @param domainData - Authenticated domain data
   * @returns Promise resolving to array of portals
   * @throws {DomainServiceError} If fetching fails
   * 
   * @example
   * ```typescript
   * const portals = await domainService.fetchDomainPortals(domainData);
   * console.log(`Found ${portals.length} portals`);
   * ```
   */
  async fetchDomainPortals(domainData: DomainData): Promise<Portal[]> {
    console.log(`[${new Date().toISOString()}] Fetching domain portals`);

    try {
      return await retryWithBackoff(async () => {
        const response = await fetch(
          `${domainData.domainServerUrl}/api/v1/domains/${domainData.domainInfo.id}/lighthouses`,
          {
            headers: this.createHeaders(domainData.domainAccessToken),
          }
        );

        if (!response.ok) {
          throw new DomainServiceError(
            `Failed to fetch portals: HTTP ${response.status}`,
            { statusCode: response.status, domainId: domainData.domainInfo.id }
          );
        }

        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Domain portals fetched successfully`);
        return data.poses as Portal[];
      });
    } catch (error) {
      throw wrapError(error, 'fetchDomainPortals', {
        domainId: domainData.domainInfo.id,
      });
    }
  }

  /**
   * Fetches the list of all available data for a domain.
   * Returns metadata about available meshes, point clouds, splats, etc.
   * 
   * @param domainData - Authenticated domain data
   * @returns Promise resolving to array of domain data items
   * @throws {DomainServiceError} If fetching fails
   * 
   * @example
   * ```typescript
   * const dataList = await domainService.fetchDomainDataList(domainData);
   * console.log(`Found ${dataList.length} data items`);
   * ```
   */
  async fetchDomainDataList(domainData: DomainData): Promise<DomainDataItem[]> {
    console.log(`[${new Date().toISOString()}] Fetching domain data list`);

    try {
      return await retryWithBackoff(async () => {
        const response = await fetch(
          `${domainData.domainServerUrl}/api/v1/domains/${domainData.domainInfo.id}/data`,
          {
            headers: this.createHeaders(domainData.domainAccessToken),
          }
        );

        if (!response.ok) {
          throw new DomainServiceError(
            `Failed to fetch domain data list: HTTP ${response.status}`,
            { statusCode: response.status, domainId: domainData.domainInfo.id }
          );
        }

        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Domain data list fetched successfully`);
        console.log('Domain data items:', data.data);
        return data.data as DomainDataItem[];
      });
    } catch (error) {
      throw wrapError(error, 'fetchDomainDataList', {
        domainId: domainData.domainInfo.id,
      });
    }
  }

  /**
   * Fetches and parses domain metadata.
   * Metadata contains information about canonical refinements and alignment matrices.
   * 
   * @param domainData - Authenticated domain data
   * @param dataList - List of available domain data items
   * @returns Promise resolving to domain metadata or null if not found
   * @throws {ParseError} If metadata parsing fails
   * 
   * @example
   * ```typescript
   * const metadata = await domainService.fetchDomainMetadata(domainData, dataList);
   * if (metadata?.canonicalRefinement) {
   *   console.log('Canonical refinement:', metadata.canonicalRefinement);
   * }
   * ```
   */
  async fetchDomainMetadata(
    domainData: DomainData,
    dataList: DomainDataItem[]
  ): Promise<DomainMetadata | null> {
    const metadataItem = this.findMetadataItem(dataList);

    if (!metadataItem) {
      console.log(`[${new Date().toISOString()}] No domain metadata found for this domain`);
      return null;
    }

    try {
      console.log(`[${new Date().toISOString()}] Downloading domain metadata`);
      const metadataBuffer = await this.fileService.downloadDomainFile(
        domainData.domainServerUrl,
        domainData.domainInfo.id,
        metadataItem.id,
        domainData.domainAccessToken,
        this.posemeshClientId
      );

      const metadataText = new TextDecoder().decode(metadataBuffer);
      const metadata = JSON.parse(metadataText) as DomainMetadata;

      console.log('Domain metadata:', metadata);
      return metadata;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ParseError('Failed to parse domain metadata JSON', {
          domainId: domainData.domainInfo.id,
          metadataItemId: metadataItem.id,
        });
      }
      throw wrapError(error, 'fetchDomainMetadata', {
        domainId: domainData.domainInfo.id,
      });
    }
  }

  /**
   * Fetches navigation mesh data for a domain.
   * Navigation mesh is used for collision detection and pathfinding.
   * 
   * @param domainData - Authenticated domain data
   * @param dataList - List of available domain data items
   * @returns Promise resolving to navigation mesh ArrayBuffer or null if not found
   * 
   * @example
   * ```typescript
   * const navMesh = await domainService.fetchNavMesh(domainData, dataList);
   * if (navMesh) {
   *   console.log('Navigation mesh size:', navMesh.byteLength);
   * }
   * ```
   */
  async fetchNavMesh(
    domainData: DomainData,
    dataList: DomainDataItem[]
  ): Promise<ArrayBuffer | null> {
    const navMeshItem = this.findNavMeshItem(dataList);

    if (!navMeshItem) {
      console.log(`[${new Date().toISOString()}] No navigation mesh data found for this domain`);
      return null;
    }

    try {
      console.log(`[${new Date().toISOString()}] Downloading navigation mesh`);
      const navMeshBuffer = await this.fileService.downloadDomainFile(
        domainData.domainServerUrl,
        domainData.domainInfo.id,
        navMeshItem.id,
        domainData.domainAccessToken,
        this.posemeshClientId
      );

      return navMeshBuffer;
    } catch (error) {
      // Log error but don't throw - navigation mesh is optional
      console.error(`[${new Date().toISOString()}] Failed to download navigation mesh:`, error);
      return null;
    }
  }

  /**
   * Fetches occlusion mesh data for a domain.
   * Occlusion mesh is used for rendering optimization.
   * 
   * @param domainData - Authenticated domain data
   * @param dataList - List of available domain data items
   * @returns Promise resolving to occlusion mesh ArrayBuffer or null if not found
   * 
   * @example
   * ```typescript
   * const occlusionMesh = await domainService.fetchOcclusionMesh(domainData, dataList);
   * if (occlusionMesh) {
   *   console.log('Occlusion mesh size:', occlusionMesh.byteLength);
   * }
   * ```
   */
  async fetchOcclusionMesh(
    domainData: DomainData,
    dataList: DomainDataItem[]
  ): Promise<ArrayBuffer | null> {
    const occlusionMeshItem = this.findOcclusionMeshItem(dataList);

    if (!occlusionMeshItem) {
      console.log(`[${new Date().toISOString()}] No occlusion mesh data found for this domain`);
      return null;
    }

    try {
      console.log(`[${new Date().toISOString()}] Downloading occlusion mesh`);
      const occlusionMeshBuffer = await this.fileService.downloadDomainFile(
        domainData.domainServerUrl,
        domainData.domainInfo.id,
        occlusionMeshItem.id,
        domainData.domainAccessToken,
        this.posemeshClientId
      );

      return occlusionMeshBuffer;
    } catch (error) {
      // Log error but don't throw - occlusion mesh is optional
      console.error(`[${new Date().toISOString()}] Failed to download occlusion mesh:`, error);
      return null;
    }
  }

  /**
   * Fetches point cloud data for a domain.
   * Uses the canonical refinement from metadata to find the correct point cloud.
   * 
   * @param domainData - Authenticated domain data
   * @param dataList - List of available domain data items
   * @param metadata - Domain metadata containing canonical refinement info
   * @returns Promise resolving to point cloud ArrayBuffer or null if not found
   * 
   * @example
   * ```typescript
   * const pointCloud = await domainService.fetchPointCloud(domainData, dataList, metadata);
   * if (pointCloud) {
   *   console.log('Point cloud size:', pointCloud.byteLength);
   * }
   * ```
   */
  async fetchPointCloud(
    domainData: DomainData,
    dataList: DomainDataItem[],
    metadata: DomainMetadata | null
  ): Promise<ArrayBuffer | null> {
    if (!metadata?.canonicalRefinement) {
      console.log(`[${new Date().toISOString()}] No canonical refinement found in metadata`);
      return null;
    }

    const pointCloudItem = this.findPointCloudItem(dataList, metadata.canonicalRefinement);

    if (!pointCloudItem) {
      console.log(`[${new Date().toISOString()}] No point cloud data found for this domain`);
      return null;
    }

    try {
      console.log(`[${new Date().toISOString()}] Downloading point cloud`);
      const pointCloudBuffer = await this.fileService.downloadDomainFile(
        domainData.domainServerUrl,
        domainData.domainInfo.id,
        pointCloudItem.id,
        domainData.domainAccessToken,
        this.posemeshClientId
      );

      return pointCloudBuffer;
    } catch (error) {
      // Log error but don't throw - point cloud is optional
      console.error(`[${new Date().toISOString()}] Failed to download point cloud:`, error);
      return null;
    }
  }

  /**
   * Fetches Gaussian splat data for a domain.
   * Uses the canonical refinement from metadata to find the correct splat.
   * 
   * @param domainData - Authenticated domain data
   * @param dataList - List of available domain data items
   * @param metadata - Domain metadata containing canonical refinement and alignment matrix
   * @returns Promise resolving to splat data with metadata or null if not found
   * 
   * @example
   * ```typescript
   * const splatData = await domainService.fetchSplatData(domainData, dataList, metadata);
   * if (splatData) {
   *   console.log('Splat file ID:', splatData.fileId);
   *   console.log('Splat data size:', splatData.data.byteLength);
   * }
   * ```
   */
  async fetchSplatData(
    domainData: DomainData,
    dataList: DomainDataItem[],
    metadata: DomainMetadata | null
  ): Promise<SplatData | null> {
    if (!metadata?.canonicalRefinement) {
      console.log(`[${new Date().toISOString()}] No canonical refinement found in metadata`);
      return null;
    }

    console.log('Canonical refinement:', metadata.canonicalRefinement);
    console.log('Domain data count:', dataList.length);

    const splatItem = this.findSplatItem(dataList, metadata.canonicalRefinement);

    if (!splatItem) {
      console.log(`[${new Date().toISOString()}] No gaussian splat data found for this domain`);
      return null;
    }

    try {
      console.log('[loadAllDomainData] Found gaussian splat:', splatItem);
      console.log(`[${new Date().toISOString()}] Downloading gaussian splat`);

      const splatBuffer = await this.fileService.downloadDomainFile(
        domainData.domainServerUrl,
        domainData.domainInfo.id,
        splatItem.id,
        domainData.domainAccessToken,
        this.posemeshClientId
      );

      return {
        fileId: splatItem.id,
        data: splatBuffer,
        alignmentMatrix: metadata.canonicalRefinementAlignmentMatrix || null,
      };
    } catch (error) {
      // Log error but don't throw - splat is optional
      console.error(`[${new Date().toISOString()}] Failed to download gaussian splat:`, error);
      return null;
    }
  }

  /**
   * Loads all available data for a domain in a single orchestrated operation.
   * This is the main entry point for loading domain data.
   * 
   * Performs the following operations in sequence:
   * 1. Authenticate with domain
   * 2. Fetch portals
   * 3. Fetch data list
   * 4. Fetch metadata
   * 5. Fetch navigation mesh (optional)
   * 6. Fetch occlusion mesh (optional)
   * 7. Fetch point cloud (optional, requires metadata)
   * 8. Fetch splat data (optional, requires metadata)
   * 
   * @param domainId - Unique identifier of the domain to load
   * @param posemeshClientId - Client identifier for API tracking (optional, uses stored ID if not provided)
   * @returns Promise resolving to service result with complete domain data collection
   * 
   * @example
   * ```typescript
   * const result = await domainService.loadAllDomainData('domain-123');
   * if (result.success) {
   *   const { domainData, portals, navMesh, pointCloud } = result.data!;
   *   console.log(`Loaded ${portals.length} portals`);
   * } else {
   *   console.error('Failed to load domain:', result.error);
   * }
   * ```
   */
  async loadAllDomainData(
    domainId: string,
    posemeshClientId?: string
  ): Promise<ServiceResult<DomainDataCollection>> {
    console.log(`[${new Date().toISOString()}] Starting loadAllDomainData for domain: ${domainId}`);

    try {
      // Update posemeshClientId if provided
      if (posemeshClientId) {
        (this as any).posemeshClientId = posemeshClientId;
      }

      // 1. Authenticate with domain
      const domainData = await this.authenticateDomain(domainId);

      // 2. Fetch portals
      const portals = await this.fetchDomainPortals(domainData);

      // 3. Fetch data list
      const dataList = await this.fetchDomainDataList(domainData);

      // 4. Fetch metadata
      const metadata = await this.fetchDomainMetadata(domainData, dataList);

      // 5-8. Fetch optional data (these methods handle their own errors)
      const [navMesh, occlusionMesh, pointCloud, splatData] = await Promise.all([
        this.fetchNavMesh(domainData, dataList),
        this.fetchOcclusionMesh(domainData, dataList),
        this.fetchPointCloud(domainData, dataList, metadata),
        this.fetchSplatData(domainData, dataList, metadata),
      ]);

      const result: DomainDataCollection = {
        domainData,
        portals,
        navMesh,
        occlusionMesh,
        pointCloud,
        splatData,
        alignmentMatrix: metadata?.canonicalRefinementAlignmentMatrix || null,
        domainDataItems: dataList,
        refinementId: metadata?.canonicalRefinement || null,
      };

      console.log(`[${new Date().toISOString()}] Successfully loaded all domain data`);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const wrappedError = wrapError(error, 'loadAllDomainData', { domainId });
      console.error(`[${new Date().toISOString()}] Error loading domain data:`, wrappedError);

      return {
        success: false,
        error: wrappedError.message,
        originalError: wrappedError,
      };
    }
  }

  /**
   * Finds a specific data item in the data list using a predicate function.
   * 
   * @param dataList - List of domain data items
   * @param predicate - Function to test each item
   * @returns Matching data item or null if not found
   */
  private findDataItem(
    dataList: DomainDataItem[],
    predicate: (item: DomainDataItem) => boolean
  ): DomainDataItem | null {
    return dataList.find(predicate) || null;
  }

  /**
   * Finds the navigation mesh item in the data list.
   * 
   * @param dataList - List of domain data items
   * @returns Navigation mesh item or null if not found
   */
  private findNavMeshItem(dataList: DomainDataItem[]): NavMeshItem | null {
    return this.findDataItem(
      dataList,
      (item) => item.data_type === 'obj' && item.name === 'navmesh_v1'
    ) as NavMeshItem | null;
  }

  /**
   * Finds the occlusion mesh item in the data list.
   * 
   * @param dataList - List of domain data items
   * @returns Occlusion mesh item or null if not found
   */
  private findOcclusionMeshItem(dataList: DomainDataItem[]): OcclusionMeshItem | null {
    return this.findDataItem(
      dataList,
      (item) => item.data_type === 'obj' && item.name === 'occlusionmesh_v1'
    ) as OcclusionMeshItem | null;
  }

  /**
   * Finds the domain metadata item in the data list.
   * 
   * @param dataList - List of domain data items
   * @returns Metadata item or null if not found
   */
  private findMetadataItem(dataList: DomainDataItem[]): MetadataItem | null {
    return this.findDataItem(
      dataList,
      (item) => item.name === 'domain_metadata'
    ) as MetadataItem | null;
  }

  /**
   * Finds the point cloud item for a specific refinement.
   * 
   * @param dataList - List of domain data items
   * @param canonicalRefinement - Refinement identifier
   * @returns Point cloud item or null if not found
   */
  private findPointCloudItem(
    dataList: DomainDataItem[],
    canonicalRefinement: string
  ): PointCloudItem | null {
    return this.findDataItem(
      dataList,
      (item) =>
        item.data_type === 'refined_pointcloud_ply' &&
        item.name === `refined_pointcloud_${canonicalRefinement}`
    ) as PointCloudItem | null;
  }

  /**
   * Finds the splat item for a specific refinement.
   * Checks multiple name and type variations, including SOG compressed formats.
   * 
   * @param dataList - List of domain data items
   * @param canonicalRefinement - Refinement identifier
   * @returns Splat item or null if not found
   */
  private findSplatItem(
    dataList: DomainDataItem[],
    canonicalRefinement: string
  ): SplatItem | null {
    const singleSplatDataTypes = [
      'refined_splat', 'splat_data', 'splat_data_sog',
      'splat', 'gaussian_splat',
    ];
    const splatNamePrefixes = ['refined_splat_', 'splat_', 'gaussian_splat_'];

    return this.findDataItem(dataList, (item) => {
      const matchesType = singleSplatDataTypes.includes(item.data_type);
      const matchesName = splatNamePrefixes.some(
        (prefix) => item.name === `${prefix}${canonicalRefinement}`
      );
      return matchesType && matchesName;
    }) as SplatItem | null;
  }

  /**
   * Checks whether any splat data (single-file or partitioned) exists for a refinement.
   *
   * @param dataList - List of domain data items
   * @param refinementId - Refinement identifier to check
   * @returns true if at least one matching splat item exists
   */
  hasSplatForRefinement(
    dataList: DomainDataItem[],
    refinementId: string
  ): boolean {
    if (!dataList || !refinementId) return false;

    // Check single-file splats
    const singleSplatDataTypes = ['splat_data', 'splat_data_sog', 'refined_splat', 'splat', 'gaussian_splat'];
    const hasSingle = dataList.some(
      (item) =>
        item.name === `refined_splat_${refinementId}` &&
        item.data_type &&
        singleSplatDataTypes.includes(item.data_type)
    );
    if (hasSingle) return true;

    // Check partitioned splats
    const partitionSplatDataTypes = ['splat_partition', 'splat_partition_sog'];
    const partitionNameRegex = new RegExp(
      `^splat_partition_(full|coarse|fine)_(\\d+)_(-?\\d+)_(-?\\d+)_${refinementId}$`
    );
    return dataList.some(
      (item) =>
        item.name &&
        item.data_type &&
        partitionSplatDataTypes.includes(item.data_type) &&
        partitionNameRegex.test(item.name)
    );
  }

  /**
   * Creates headers for domain API requests.
   * 
   * @param accessToken - Authentication token
   * @returns Headers object for fetch requests
   */
  private createHeaders(accessToken: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'domain-viewer',
      'posemesh-client-id': this.posemeshClientId,
    };
  }

  /**
   * Gets an existing posemesh client ID from storage or creates a new one.
   * Checks multiple storage locations (localStorage, sessionStorage, cookies)
   * for maximum persistence across browser sessions.
   * 
   * Only works in browser environment - returns a temporary UUID on server.
   * 
   * @returns The posemesh client ID, either retrieved or newly generated
   */
  private getOrCreateClientId(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side: return a temporary UUID
      // This will be replaced with the actual client ID when used in the browser
      return crypto.randomUUID();
    }

    // Get or create posemesh_client_id from multiple storage options
    let posemeshClientId =
      localStorage.getItem('posemesh_client_id') ||
      sessionStorage.getItem('posemesh_client_id') ||
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('posemesh_client_id='))
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

/**
 * Singleton instance of DomainService for convenience.
 * Can be imported and used directly without instantiation.
 */
export const domainService = new DomainService();
