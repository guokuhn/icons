import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate API requests using API key
 * Checks for API key in Authorization header or x-api-key header
 * Implements requirement 2.1, 2.5 - Protect write endpoints
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  // Get API key from environment
  const validApiKey = process.env.API_KEY;

  // If no API key is configured, skip authentication (development mode)
  if (!validApiKey) {
    logger.warn('API_KEY not configured - authentication disabled');
    next();
    return;
  }

  // Get API key from request headers
  // Support both Authorization: Bearer <key> and x-api-key: <key>
  let providedApiKey: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedApiKey = authHeader.substring(7);
  } else if (req.headers['x-api-key']) {
    providedApiKey = req.headers['x-api-key'] as string;
  }

  // Check if API key was provided
  if (!providedApiKey) {
    logger.warn('API request without authentication', {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    throw new UnauthorizedError('API key is required. Provide it in Authorization header (Bearer token) or x-api-key header');
  }

  // Validate API key
  if (providedApiKey !== validApiKey) {
    logger.warn('API request with invalid API key', {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    throw new UnauthorizedError('Invalid API key');
  }

  // API key is valid, proceed
  logger.debug('API request authenticated successfully', {
    method: req.method,
    url: req.url,
  });
  next();
}
