/**
 * Type definitions for domain data structures and service responses.
 * This file centralizes all domain-related types to ensure type safety
 * across the application and eliminate the use of 'any' types.
 */

/**
 * Portal (lighthouse) represents a QR code marker in physical space.
 * Contains position, rotation, GPS coordinates, and device metadata.
 */
export interface Portal {
  /** Altitude in meters */
  altitude: number;
  /** Domain identifier this portal belongs to */
  domain_id: string;
  /** GPS timestamp in milliseconds */
  gps_timestamp: number;
  /** Horizontal GPS accuracy in meters */
  horizontal_accuracy: number;
  /** Unique portal identifier */
  id: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** ISO timestamp when portal was placed */
  placed_at: string;
  /** Position X coordinate in domain space */
  px: number;
  /** Position Y coordinate in domain space */
  py: number;
  /** Position Z coordinate in domain space */
  pz: number;
  /** Reported size of the portal marker */
  reported_size: number;
  /** Rotation quaternion W component */
  rw: number;
  /** Rotation quaternion X component */
  rx: number;
  /** Rotation quaternion Y component */
  ry: number;
  /** Rotation quaternion Z component */
  rz: number;
  /** Device ID that scanned/placed this portal */
  scanner_device_id: string;
  /** Device model that scanned/placed this portal */
  scanner_device_model: string;
  /** Device name that scanned/placed this portal */
  scanner_device_name: string;
  /** Short identifier for the portal */
  short_id: string;
  /** Vertical GPS accuracy in meters */
  vertical_accuracy: number;
}

/**
 * Domain information metadata.
 * Contains basic domain properties and server details.
 */
export interface DomainInfo {
  /** Unique domain identifier */
  id: string;
  /** Human-readable domain name */
  name: string;
  /** ISO timestamp when domain was created */
  createdAt: string;
  /** ISO timestamp when domain was last updated */
  updatedAt: string;
  /** Domain server URL */
  url: string;
  /** Domain server IP address */
  ip: string;
}

/**
 * Authentication response from domain server.
 * Contains access token and server connection details.
 */
export interface DomainAuthData {
  /** Access token for authenticated requests */
  access_token: string;
  /** Domain server connection details */
  domain_server: {
    /** Server URL */
    url: string;
    /** Server IP address */
    ip: string;
  };
  /** Domain name */
  name: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Complete domain data including authentication and metadata.
 * This is the primary data structure used throughout the application.
 */
export interface DomainData {
  /** Domain metadata */
  domainInfo: DomainInfo;
  /** Authentication token for domain access */
  domainAccessToken: string;
  /** Base URL for domain server API calls */
  domainServerUrl: string;
}

/**
 * Individual data item from domain data list.
 * Represents various types of domain assets (meshes, point clouds, metadata, etc.).
 */
export interface DomainDataItem {
  /** Unique identifier for this data item */
  id: string;
  /** Human-readable name of the data item */
  name: string;
  /** Type of data (e.g., 'obj', 'refined_pointcloud_ply', 'splat', 'domain_metadata') */
  data_type: string;
  /** ISO timestamp when data was created */
  created_at: string;
  /** ISO timestamp when data was last updated */
  updated_at: string;
  /** File size in bytes (optional) */
  size?: number;
  /** Additional metadata (optional) */
  metadata?: Record<string, any>;
}

/**
 * Navigation mesh data item.
 * Contains collision/navigation geometry for the domain.
 */
export interface NavMeshItem extends DomainDataItem {
  data_type: 'obj';
  name: 'navmesh_v1';
}

/**
 * Occlusion mesh data item.
 * Contains geometry for occlusion culling optimization.
 */
export interface OcclusionMeshItem extends DomainDataItem {
  data_type: 'obj';
  name: 'occlusionmesh_v1';
}

/**
 * Point cloud data item.
 * Contains refined 3D point cloud data for the domain.
 */
export interface PointCloudItem extends DomainDataItem {
  data_type: 'refined_pointcloud_ply';
  /** Name follows pattern: refined_pointcloud_{refinement_id} */
  name: string;
}

/**
 * Gaussian splat data item.
 * Contains 3D Gaussian splatting data for photorealistic rendering.
 *
 * Supported data_type values:
 * - `splat_data`          — Standard single-file Gaussian splat (.splat)
 * - `splat_data_sog`      — Single-file compressed SOG format (.sogs.zip)
 * - `splat_partition`      — One partition tile of a partitioned splat (.splat)
 * - `splat_partition_sog`  — One partition tile in SOG format (.sogs.zip)
 * - `refined_splat`        — Legacy name for single-file splat
 * - `splat` / `gaussian_splat` — Older name variants
 */
export interface SplatItem extends DomainDataItem {
  /** Various splat data type names used in the system */
  data_type:
    | 'refined_splat'
    | 'splat_data'
    | 'splat_data_sog'
    | 'splat_partition'
    | 'splat_partition_sog'
    | 'splat'
    | 'gaussian_splat';
  /** Name follows pattern: refined_splat_{id}, splat_{id}, splat_partition_{lod}_{size}_{x}_{z}_{id}, etc. */
  name: string;
}

/**
 * Domain metadata item.
 * Contains metadata about canonical refinements and alignment matrices.
 */
export interface MetadataItem extends DomainDataItem {
  name: 'domain_metadata';
}

/**
 * Domain metadata structure.
 * Contains information about the canonical refinement and alignment matrix.
 */
export interface DomainMetadata {
  /** ID of the canonical (primary) refinement to use */
  canonicalRefinement?: string;
  /** 4x4 transformation matrix (16 elements) for aligning refined data to domain space */
  canonicalRefinementAlignmentMatrix?: AlignmentMatrix;
  /** Additional metadata fields */
  [key: string]: any;
}

/**
 * 4x4 transformation matrix represented as a flat array of 16 numbers.
 * Used for transforming point clouds and splats into domain coordinate space.
 */
export type AlignmentMatrix = number[];

/**
 * Splat data with associated metadata.
 * Contains the file ID and optional alignment matrix for rendering.
 */
export interface SplatData {
  /** File ID for downloading the splat data */
  fileId: string;
  /** Downloaded splat data as ArrayBuffer */
  data: ArrayBuffer;
  /** Alignment matrix for transforming splat to domain space */
  alignmentMatrix: AlignmentMatrix | null;
}

/**
 * Complete collection of all domain data loaded by the service layer.
 * This is returned by the orchestration method that loads all data.
 */
export interface DomainDataCollection {
  /** Domain authentication and metadata */
  domainData: DomainData;
  /** Array of portal/lighthouse markers */
  portals: Portal[];
  /** Navigation mesh binary data (OBJ format) */
  navMesh: ArrayBuffer | null;
  /** Occlusion mesh binary data (OBJ format) */
  occlusionMesh: ArrayBuffer | null;
  /** Point cloud binary data (PLY format) */
  pointCloud: ArrayBuffer | null;
  /** Gaussian splat data with metadata (legacy single-file) */
  splatData: SplatData | null;
  /** Alignment matrix for point cloud/splat transformation */
  alignmentMatrix: AlignmentMatrix | null;
  /** Raw domain data items list from the server (used for partition discovery) */
  domainDataItems: DomainDataItem[];
  /** Canonical refinement ID from domain metadata */
  refinementId: string | null;
}

/**
 * Generic service result wrapper for operations that may fail.
 * Provides a consistent interface for handling success/error states.
 * 
 * @template T - The type of data returned on success
 */
export interface ServiceResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Data returned on success */
  data?: T;
  /** Error message on failure */
  error?: string;
  /** Original error object for debugging */
  originalError?: Error;
}

/**
 * Options for file download operations.
 */
export interface DownloadOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Progress callback for large files */
  onProgress?: (loaded: number, total: number) => void;
  /** Whether to return raw binary data (default: true) */
  raw?: boolean;
}

/**
 * Configuration for retry logic.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Function to determine if error should trigger retry */
  shouldRetry: (error: Error) => boolean;
}
