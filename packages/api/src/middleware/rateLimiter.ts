import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * Rate limiter for read endpoints (GET requests)
 * Default: 1000 requests per minute per IP
 * Implements requirement 2.1 - Rate limiting for API endpoints
 */
export const readRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_READ || '1000', 10), // Default 1000 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      timestamp: Date.now(),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Read rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        timestamp: Date.now(),
      },
    });
  },
});

/**
 * Rate limiter for write endpoints (POST, PUT, DELETE requests)
 * Default: 100 requests per minute per IP
 * Implements requirement 2.1, 2.5 - Rate limiting for write operations
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_WRITE || '100', 10), // Default 100 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests from this IP, please try again later',
      timestamp: Date.now(),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Write rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many write requests from this IP, please try again later',
        timestamp: Date.now(),
      },
    });
  },
});
