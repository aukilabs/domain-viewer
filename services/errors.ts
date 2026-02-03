/**
 * Custom error classes for the service layer.
 * Provides detailed error context for different failure scenarios.
 */

/**
 * Base error class for all domain service errors.
 * Extends the standard Error class with additional context.
 */
export class DomainServiceError extends Error {
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'DomainServiceError';
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainServiceError);
    }
  }
}

/**
 * Authentication error (401, 403).
 * Thrown when authentication or authorization fails.
 */
export class AuthenticationError extends DomainServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Data not found error (404).
 * Thrown when requested data doesn't exist.
 */
export class DataNotFoundError extends DomainServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'DataNotFoundError';
  }
}

/**
 * Network connectivity error.
 * Thrown when network requests fail due to connectivity issues.
 */
export class NetworkError extends DomainServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'NetworkError';
  }
}

/**
 * File download error.
 * Thrown when file download operations fail.
 */
export class FileDownloadError extends DomainServiceError {
  public readonly fileId?: string;
  public readonly statusCode?: number;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'FileDownloadError';
    this.fileId = context?.fileId;
    this.statusCode = context?.statusCode;
  }
}

/**
 * Data parsing error.
 * Thrown when parsing JSON, metadata, or other data formats fails.
 */
export class ParseError extends DomainServiceError {
  public readonly data?: any;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'ParseError';
    this.data = context?.data;
  }
}

/**
 * Timeout error.
 * Thrown when operations exceed the specified timeout duration.
 */
export class TimeoutError extends DomainServiceError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context?: Record<string, any>) {
    super(message, { ...context, timeoutMs });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Creates an appropriate error instance based on HTTP status code.
 * 
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param context - Additional error context
 * @returns Appropriate error instance
 */
export function createHttpError(
  statusCode: number,
  message: string,
  context?: Record<string, any>
): DomainServiceError {
  const enhancedContext = { ...context, statusCode };

  if (statusCode === 401 || statusCode === 403) {
    return new AuthenticationError(message, enhancedContext);
  }

  if (statusCode === 404) {
    return new DataNotFoundError(message, enhancedContext);
  }

  if (statusCode >= 500) {
    return new NetworkError(message, enhancedContext);
  }

  return new DomainServiceError(message, enhancedContext);
}

/**
 * Wraps an unknown error in a DomainServiceError with context.
 * 
 * @param error - The error to wrap
 * @param operation - Name of the operation that failed
 * @param context - Additional context
 * @returns DomainServiceError instance
 */
export function wrapError(
  error: unknown,
  operation: string,
  context?: Record<string, any>
): DomainServiceError {
  if (error instanceof DomainServiceError) {
    // Already a domain service error, just add context
    return new DomainServiceError(
      error.message,
      { ...error.context, ...context, operation, originalError: error }
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return new DomainServiceError(
    `${operation} failed: ${message}`,
    { ...context, operation, originalError: error, stack }
  );
}

/**
 * Formats an error for logging with full context.
 * 
 * @param error - The error to format
 * @returns Formatted error string
 */
export function formatErrorForLogging(error: DomainServiceError): string {
  const parts = [
    `[${error.timestamp}]`,
    `${error.name}:`,
    error.message,
  ];

  if (error.context && Object.keys(error.context).length > 0) {
    parts.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
  }

  if (error.stack) {
    parts.push(`Stack: ${error.stack}`);
  }

  return parts.join('\n');
}
