/**
 * File service for downloading domain files with retry logic and error handling.
 * Handles binary file downloads from domain servers with robust error recovery.
 */

import { DownloadOptions } from '@/types/domain';
import { FileDownloadError, NetworkError, AuthenticationError, TimeoutError, wrapError } from './errors';
import { retryWithBackoff, isRetryableError } from '@/utils/retry';

/**
 * Default timeout for file downloads (60 seconds).
 * Large files like point clouds and splats may take time to download.
 */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Default number of retry attempts for failed downloads.
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * FileService class for handling file download operations.
 * Provides methods for downloading files from domain servers with
 * automatic retries, timeout handling, and progress tracking.
 */
export class FileService {
  /**
   * Downloads a file from a URL with retry logic and error handling.
   * 
   * @param url - The URL to download from
   * @param options - Download options (retries, timeout, progress callback, etc.)
   * @returns Promise resolving to the file data as ArrayBuffer
   * @throws {FileDownloadError} If download fails after all retries
   * @throws {TimeoutError} If download exceeds timeout duration
   * @throws {AuthenticationError} If authentication fails (401, 403)
   * 
   * @example
   * ```typescript
   * const fileService = new FileService();
   * const data = await fileService.downloadFile('https://example.com/file.bin', {
   *   maxRetries: 3,
   *   timeout: 30000,
   *   onProgress: (loaded, total) => console.log(`${loaded}/${total} bytes`)
   * });
   * ```
   */
  async downloadFile(url: string, options: DownloadOptions = {}): Promise<ArrayBuffer> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      timeout = DEFAULT_TIMEOUT_MS,
      signal,
      onProgress,
    } = options;

    console.log(`[${new Date().toISOString()}] Downloading file from ${url}`);

    try {
      return await retryWithBackoff(
        async () => {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Combine user signal with timeout signal
          const combinedSignal = signal
            ? this.combineAbortSignals(signal, controller.signal)
            : controller.signal;

          try {
            const response = await fetch(url, { signal: combinedSignal });

            clearTimeout(timeoutId);

            // Check response status
            if (!response.ok) {
              throw this.createHttpError(response.status, url);
            }

            // Download with progress tracking if callback provided
            if (onProgress && response.body) {
              return await this.downloadWithProgress(response, onProgress);
            }

            // Simple download without progress
            const data = await response.arrayBuffer();
            const sizeKB = (data.byteLength / 1024).toFixed(2);
            console.log(`[${new Date().toISOString()}] File downloaded successfully (${sizeKB} KB)`);
            
            return data;
          } catch (error) {
            clearTimeout(timeoutId);

            // Handle abort/timeout
            if (error instanceof Error && error.name === 'AbortError') {
              if (signal?.aborted) {
                throw new FileDownloadError('Download cancelled by user', { url });
              }
              throw new TimeoutError(`Download timed out after ${timeout}ms`, timeout, { url });
            }

            throw error;
          }
        },
        {
          maxRetries,
          shouldRetry: isRetryableError,
        }
      );
    } catch (error) {
      throw wrapError(error, 'downloadFile', { url });
    }
  }

  /**
   * Downloads a specific file from a domain server.
   * Convenience method that constructs the proper URL and headers for domain file access.
   * 
   * @param domainServerUrl - Base URL of the domain server
   * @param domainId - Unique identifier of the domain
   * @param fileId - Unique identifier of the file to download
   * @param accessToken - Authentication token for the domain
   * @param posemeshClientId - Client identifier for API tracking
   * @param options - Download options
   * @returns Promise resolving to the file data as ArrayBuffer
   * @throws {FileDownloadError} If download fails
   * @throws {AuthenticationError} If authentication fails
   * 
   * @example
   * ```typescript
   * const fileService = new FileService();
   * const navMesh = await fileService.downloadDomainFile(
   *   'https://domain.example.com',
   *   'domain-123',
   *   'file-456',
   *   'access-token',
   *   'client-id'
   * );
   * ```
   */
  async downloadDomainFile(
    domainServerUrl: string,
    domainId: string,
    fileId: string,
    accessToken: string,
    posemeshClientId: string,
    options: DownloadOptions = {}
  ): Promise<ArrayBuffer> {
    const raw = options.raw !== undefined ? (options.raw ? 1 : 0) : 1;
    const url = this.buildFileUrl(domainServerUrl, domainId, fileId, raw);
    const headers = this.createHeaders(accessToken, posemeshClientId);

    console.log(`[${new Date().toISOString()}] Downloading domain file: ${fileId}`);

    try {
      return await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

          const combinedSignal = options.signal
            ? this.combineAbortSignals(options.signal, controller.signal)
            : controller.signal;

          try {
            const response = await fetch(url, {
              headers,
              signal: combinedSignal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw this.createHttpError(response.status, url, fileId, domainId);
            }

            // Download with progress tracking if callback provided
            if (options.onProgress && response.body) {
              return await this.downloadWithProgress(response, options.onProgress);
            }

            const data = await response.arrayBuffer();
            const sizeKB = (data.byteLength / 1024).toFixed(2);
            console.log(
              `[${new Date().toISOString()}] Domain file downloaded successfully: ${fileId} (${sizeKB} KB)`
            );

            return data;
          } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
              if (options.signal?.aborted) {
                throw new FileDownloadError('Download cancelled by user', { url, fileId, domainId });
              }
              throw new TimeoutError(
                `Download timed out after ${options.timeout || DEFAULT_TIMEOUT_MS}ms`,
                options.timeout || DEFAULT_TIMEOUT_MS,
                { url, fileId, domainId }
              );
            }

            throw error;
          }
        },
        {
          maxRetries: options.maxRetries || DEFAULT_MAX_RETRIES,
          shouldRetry: isRetryableError,
        }
      );
    } catch (error) {
      throw wrapError(error, 'downloadDomainFile', { domainId, fileId });
    }
  }

  /**
   * Builds the URL for downloading a domain file.
   * 
   * @param domainServerUrl - Base URL of the domain server
   * @param domainId - Domain identifier
   * @param fileId - File identifier
   * @param raw - Whether to return raw binary data (1) or JSON (0)
   * @returns Complete file download URL
   */
  private buildFileUrl(domainServerUrl: string, domainId: string, fileId: string, raw: number): string {
    return `${domainServerUrl}/api/v1/domains/${domainId}/data/${fileId}?raw=${raw}`;
  }

  /**
   * Creates headers for domain file requests.
   * 
   * @param accessToken - Authentication token
   * @param posemeshClientId - Client identifier
   * @returns Headers object for fetch request
   */
  private createHeaders(accessToken: string, posemeshClientId: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'domain-viewer',
      'posemesh-client-id': posemeshClientId,
    };
  }

  /**
   * Creates an appropriate error based on HTTP status code.
   * 
   * @param statusCode - HTTP status code
   * @param url - Request URL
   * @param fileId - File identifier (optional)
   * @param domainId - Domain identifier (optional)
   * @returns Appropriate error instance
   */
  private createHttpError(
    statusCode: number,
    url: string,
    fileId?: string,
    domainId?: string
  ): Error {
    const context = { statusCode, url, fileId, domainId };

    if (statusCode === 401 || statusCode === 403) {
      return new AuthenticationError(
        `Authentication failed (${statusCode}) when downloading file`,
        context
      );
    }

    if (statusCode === 404) {
      return new FileDownloadError(
        `File not found (404): ${fileId || url}`,
        context
      );
    }

    if (statusCode >= 500) {
      return new NetworkError(
        `Server error (${statusCode}) when downloading file`,
        context
      );
    }

    return new FileDownloadError(
      `HTTP ${statusCode} error when downloading file`,
      context
    );
  }

  /**
   * Downloads a file with progress tracking.
   * 
   * @param response - Fetch response with body stream
   * @param onProgress - Progress callback
   * @returns Promise resolving to ArrayBuffer
   */
  private async downloadWithProgress(
    response: Response,
    onProgress: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total > 0) {
        onProgress(loaded, total);
      }
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  /**
   * Combines multiple AbortSignals into one.
   * The combined signal aborts when any of the input signals abort.
   * 
   * @param signals - Array of abort signals to combine
   * @returns Combined abort signal
   */
  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }

      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }
}

/**
 * Singleton instance of FileService for convenience.
 * Can be imported and used directly without instantiation.
 */
export const fileService = new FileService();
