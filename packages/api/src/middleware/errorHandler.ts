import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { AppError, ErrorResponse, InternalServerError } from '../types/errors.js';

/**
 * Global error handling middleware
 * Implements requirement 7.2 and 7.3 - Unified error handling and classification
 */

/**
 * Error handler middleware
 * Catches all errors and formats them into a consistent response
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(err, req);

  // Determine if this is an operational error or a programming error
  if (err instanceof AppError) {
    // Operational error - send appropriate response
    const errorResponse = err.toJSON();
    res.status(err.statusCode).json(errorResponse);
  } else {
    // Programming error or unknown error - send generic 500 response
    const internalError = new InternalServerError(
      process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred'
        : err.message,
      process.env.NODE_ENV === 'production' ? undefined : { stack: err.stack }
    );
    
    const errorResponse = internalError.toJSON();
    res.status(500).json(errorResponse);
  }
}

/**
 * Log error with appropriate level and context
 */
function logError(err: Error | AppError, req: Request): void {
  const errorContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  if (err instanceof AppError) {
    // Operational error
    if (err.statusCode >= 500) {
      // Server error - log as error
      logger.error(`${err.code}: ${err.message}`, {
        ...errorContext,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        stack: err.stack,
      });
    } else if (err.statusCode >= 400) {
      // Client error - log as warning
      logger.warn(`${err.code}: ${err.message}`, {
        ...errorContext,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
      });
    }
  } else {
    // Unknown/programming error - always log as error
    logger.error(`Unhandled error: ${err.message}`, {
      ...errorContext,
      stack: err.stack,
    });
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be placed after all routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const errorResponse: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: Date.now(),
    },
  };
  
  logger.warn(`404 Not Found: ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  
  res.status(404).json(errorResponse);
}
