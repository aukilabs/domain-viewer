/**
 * Retry utility with exponential backoff for handling transient failures.
 * Provides configurable retry logic for network operations and other fallible operations.
 */

import { RetryConfig } from '@/types/domain';

/**
 * Default retry configuration.
 * - 3 retry attempts
 * - Exponential backoff starting at 1000ms
 * - Maximum delay of 10 seconds
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: isRetryableError,
};

/**
 * Determines if an error should trigger a retry attempt.
 * Retries on network errors, server errors (5xx), and rate limiting (429).
 * Does not retry on client errors (4xx except 429) or authentication failures.
 * 
 * @param error - The error to evaluate
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(error: Error): boolean {
  // Network errors (no response received)
  if (isNetworkError(error)) {
    return true;
  }

  // Server errors (5xx)
  if (isServerError(error)) {
    return true;
  }

  // Rate limiting (429)
  if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
    return true;
  }

  // Timeout errors
  if (error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  // Do not retry authentication errors (401, 403)
  if (isAuthError(error)) {
    return false;
  }

  // Do not retry other client errors (4xx)
  if (error.message.match(/\b4\d{2}\b/)) {
    return false;
  }

  // Default to not retrying unknown errors
  return false;
}

/**
 * Checks if an error is a network connectivity error.
 * 
 * @param error - The error to check
 * @returns true if the error is a network error
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError' && message.includes('fetch')
  );
}

/**
 * Checks if an error is a server error (5xx status code).
 * 
 * @param error - The error to check
 * @returns true if the error is a server error
 */
export function isServerError(error: Error): boolean {
  return /\b5\d{2}\b/.test(error.message);
}

/**
 * Checks if an error is an authentication error (401, 403).
 * 
 * @param error - The error to check
 * @returns true if the error is an authentication error
 */
export function isAuthError(error: Error): boolean {
  const message = error.message;
  return message.includes('401') || message.includes('403') || 
         message.toLowerCase().includes('unauthorized') ||
         message.toLowerCase().includes('forbidden');
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff.
 * 
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay in milliseconds for the next retry
 */
export function calculateBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, maxDelayMs);
}

/**
 * Executes a function with retry logic and exponential backoff.
 * 
 * @template T - The return type of the function
 * @param fn - The async function to execute with retries
 * @param config - Retry configuration (optional, uses defaults if not provided)
 * @returns Promise resolving to the function result
 * @throws The last error encountered if all retries fail
 * 
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // First attempt or retry
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = finalConfig.shouldRetry(lastError);
      const isLastAttempt = attempt === finalConfig.maxRetries;

      if (!shouldRetry || isLastAttempt) {
        // Don't retry or no more attempts left
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, finalConfig.baseDelayMs, finalConfig.maxDelayMs);
      
      console.log(
        `[${new Date().toISOString()}] Retry attempt ${attempt + 1}/${finalConfig.maxRetries} ` +
        `after ${delay}ms delay. Error: ${lastError.message}`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Wraps a fetch call with retry logic.
 * Convenience wrapper around retryWithBackoff for fetch operations.
 * 
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param config - Retry configuration
 * @returns Promise resolving to the fetch response
 * @throws Error if all retries fail
 * 
 * @example
 * ```typescript
 * const response = await retryFetch('https://api.example.com/data', {
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 * ```
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  config?: Partial<RetryConfig>
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);
    
    // Throw error for non-2xx responses to trigger retry logic
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, config);
}
