/**
 * Mock domain data for testing purposes.
 * Contains sample responses from domain API endpoints.
 */

import {
  DomainData,
  DomainDataItem,
  DomainMetadata,
  Portal,
  DomainDataCollection,
} from '@/types/domain';

/**
 * Sample domain information.
 */
export const mockDomainData: DomainData = {
  domainInfo: {
    id: 'test-domain-123',
    name: 'Test Domain',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    url: 'https://domain.example.com',
    ip: '192.168.1.1',
  },
  domainAccessToken: 'mock-access-token-abc123',
  domainServerUrl: 'https://domain.example.com',
};

/**
 * Sample portal data.
 */
export const mockPortals: Portal[] = [
  {
    altitude: 100.5,
    domain_id: 'test-domain-123',
    gps_timestamp: 1704067200000,
    horizontal_accuracy: 5.0,
    id: 'portal-1',
    latitude: 37.7749,
    longitude: -122.4194,
    placed_at: '2024-01-01T12:00:00Z',
    px: 0,
    py: 0,
    pz: 0,
    reported_size: 0.1,
    rw: 1,
    rx: 0,
    ry: 0,
    rz: 0,
    scanner_device_id: 'device-123',
    scanner_device_model: 'iPhone 14 Pro',
    scanner_device_name: 'Test iPhone',
    short_id: 'p1',
    vertical_accuracy: 10.0,
  },
  {
    altitude: 101.0,
    domain_id: 'test-domain-123',
    gps_timestamp: 1704067260000,
    horizontal_accuracy: 4.5,
    id: 'portal-2',
    latitude: 37.7750,
    longitude: -122.4195,
    placed_at: '2024-01-01T12:01:00Z',
    px: 5,
    py: 0,
    pz: 5,
    reported_size: 0.1,
    rw: 0.707,
    rx: 0,
    ry: 0.707,
    rz: 0,
    scanner_device_id: 'device-456',
    scanner_device_model: 'iPhone 15 Pro',
    scanner_device_name: 'Test iPhone 2',
    short_id: 'p2',
    vertical_accuracy: 9.5,
  },
];

/**
 * Sample domain data items list.
 */
export const mockDomainDataItems: DomainDataItem[] = [
  {
    id: 'navmesh-item-1',
    name: 'navmesh_v1',
    data_type: 'obj',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    size: 1024000,
  },
  {
    id: 'occlusionmesh-item-1',
    name: 'occlusionmesh_v1',
    data_type: 'obj',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    size: 512000,
  },
  {
    id: 'metadata-item-1',
    name: 'domain_metadata',
    data_type: 'json',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    size: 1024,
  },
  {
    id: 'pointcloud-item-1',
    name: 'refined_pointcloud_refinement-123',
    data_type: 'refined_pointcloud_ply',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    size: 5120000,
  },
  {
    id: 'splat-item-1',
    name: 'refined_splat_refinement-123',
    data_type: 'refined_splat',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    size: 10240000,
  },
];

/**
 * Sample domain metadata.
 */
export const mockDomainMetadata: DomainMetadata = {
  canonicalRefinement: 'refinement-123',
  canonicalRefinementAlignmentMatrix: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ],
};

/**
 * Sample complete domain data collection.
 */
export const mockDomainDataCollection: DomainDataCollection = {
  domainData: mockDomainData,
  portals: mockPortals,
  navMesh: new ArrayBuffer(1024000),
  occlusionMesh: new ArrayBuffer(512000),
  pointCloud: new ArrayBuffer(5120000),
  splatData: {
    fileId: 'splat-item-1',
    data: new ArrayBuffer(10240000),
    alignmentMatrix: mockDomainMetadata.canonicalRefinementAlignmentMatrix || null,
  },
  alignmentMatrix: mockDomainMetadata.canonicalRefinementAlignmentMatrix || null,
  domainDataItems: mockDomainDataItems,
  refinementId: mockDomainMetadata.canonicalRefinement || null,
};

/**
 * Mock API responses for testing.
 */
export const mockApiResponses = {
  portals: {
    poses: mockPortals,
  },
  domainDataList: {
    data: mockDomainDataItems,
  },
  metadata: mockDomainMetadata,
};

/**
 * Helper function to create a mock ArrayBuffer with specific size.
 * 
 * @param size - Size in bytes
 * @returns ArrayBuffer filled with random data
 */
export function createMockArrayBuffer(size: number): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Helper function to create mock domain data items with custom properties.
 * 
 * @param overrides - Properties to override
 * @returns Domain data item
 */
export function createMockDomainDataItem(
  overrides: Partial<DomainDataItem> = {}
): DomainDataItem {
  return {
    id: 'mock-item-' + Math.random().toString(36).substr(2, 9),
    name: 'mock_item',
    data_type: 'mock_type',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper function to create mock portal with custom properties.
 * 
 * @param overrides - Properties to override
 * @returns Portal
 */
export function createMockPortal(overrides: Partial<Portal> = {}): Portal {
  return {
    altitude: 100,
    domain_id: 'test-domain',
    gps_timestamp: Date.now(),
    horizontal_accuracy: 5,
    id: 'portal-' + Math.random().toString(36).substr(2, 9),
    latitude: 37.7749,
    longitude: -122.4194,
    placed_at: new Date().toISOString(),
    px: 0,
    py: 0,
    pz: 0,
    reported_size: 0.1,
    rw: 1,
    rx: 0,
    ry: 0,
    rz: 0,
    scanner_device_id: 'device-123',
    scanner_device_model: 'Test Device',
    scanner_device_name: 'Test',
    short_id: 'p' + Math.random().toString(36).substr(2, 4),
    vertical_accuracy: 10,
    ...overrides,
  };
}
