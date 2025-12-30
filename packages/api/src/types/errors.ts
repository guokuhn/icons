/**
 * Error types and error response interfaces
 * Implements requirement 7.2 - Unified error response format
 */

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: number;
  };
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: Date.now(),
      },
    };
  }
}

/**
 * Client error (4xx) - User/client made a mistake
 */
export class ClientError extends AppError {
  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message, code, statusCode, details, true);
  }
}

/**
 * Server error (5xx) - Server/application error
 */
export class ServerError extends AppError {
  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message, code, statusCode, details, true);
  }
}

/**
 * Specific error types for common scenarios
 */

export class ValidationError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class ConflictError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class PayloadTooLargeError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'PAYLOAD_TOO_LARGE', 413, details);
  }
}

export class UnauthorizedError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

export class TooManyRequestsError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'TOO_MANY_REQUESTS', 429, details);
  }
}

export class InternalServerError extends ServerError {
  constructor(message: string, details?: any) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}

export class BadGatewayError extends ServerError {
  constructor(message: string, details?: any) {
    super(message, 'BAD_GATEWAY', 502, details);
  }
}

export class ServiceUnavailableError extends ServerError {
  constructor(message: string, details?: any) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details);
  }
}

/**
 * SVG parsing specific errors
 */
export class SVGParseError extends ClientError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_SVG', 400, details);
  }
}

/**
 * Storage/file system errors
 */
export class StorageError extends ServerError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', 500, details);
  }
}

/**
 * Figma API errors
 */
export class FigmaAPIError extends ServerError {
  constructor(message: string, details?: any) {
    super(message, 'FIGMA_API_ERROR', 502, details);
  }
}
