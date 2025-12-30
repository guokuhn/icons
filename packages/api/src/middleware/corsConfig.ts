/**
 * CORS Configuration Manager
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Manages Cross-Origin Resource Sharing (CORS) configuration,
 * supporting multiple domains, wildcards, and validation.
 */

import { CorsOptions } from 'cors';
import logger from '../utils/logger.js';

/**
 * CORS configuration data model
 */
export interface CorsConfig {
  origins: string[];      // List of allowed origin domains
  allowAll: boolean;      // Whether to allow all domains (wildcard *)
}

/**
 * CORS configuration validation result
 */
export interface CorsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * CORS Configuration Manager
 * 
 * Handles parsing, validation, and middleware configuration for CORS.
 */
export class CorsConfigManager {
  /**
   * Parse CORS configuration from environment variable
   * 
   * Supports:
   * - Empty/undefined: Reject all cross-origin requests
   * - "*": Allow all origins (wildcard)
   * - Single domain: "http://localhost:3000"
   * - Multiple domains: "http://localhost:3000,https://app.example.com"
   * 
   * @param envValue - Value from CORS_ORIGIN environment variable
   * @returns Parsed CORS configuration
   */
  parseConfig(envValue: string | undefined): CorsConfig {
    // Undefined or empty: reject all cross-origin requests
    if (!envValue || envValue.trim() === '') {
      return { origins: [], allowAll: false };
    }

    // Wildcard: allow all domains
    if (envValue.trim() === '*') {
      return { origins: [], allowAll: true };
    }

    // Multiple domains: split by comma and trim whitespace
    const origins = envValue
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);

    return { origins, allowAll: false };
  }

  /**
   * Validate CORS configuration
   * 
   * Checks:
   * - URL format validity
   * - Protocol validity (http: or https:)
   * - Warns about wildcard in production
   * - Warns about empty configuration
   * 
   * @param config - CORS configuration to validate
   * @returns Validation result with errors and warnings
   */
  validateConfig(config: CorsConfig): CorsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Warn about wildcard configuration
    if (config.allowAll) {
      warnings.push(
        'CORS configured to allow all origins (*). This should only be used in development.'
      );
      return { valid: true, errors, warnings };
    }

    // Warn about empty configuration
    if (config.origins.length === 0) {
      warnings.push(
        'No CORS origins configured. All cross-origin requests will be rejected.'
      );
      return { valid: true, errors, warnings };
    }

    // Validate each origin format
    config.origins.forEach(origin => {
      try {
        const url = new URL(origin);
        
        // Check protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(
            `Invalid CORS origin protocol: ${origin}. Must be http: or https:`
          );
        }
      } catch (error) {
        errors.push(
          `Invalid CORS origin format: ${origin}. Must be a valid URL.`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if an origin is allowed by the configuration
   * 
   * @param origin - Origin header from the request (may be undefined)
   * @param config - CORS configuration
   * @returns True if the origin is allowed, false otherwise
   */
  isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean {
    // Allow all domains (wildcard)
    if (config.allowAll) {
      return true;
    }

    // No origins configured: reject all cross-origin requests
    // But allow same-origin requests (no origin header)
    if (config.origins.length === 0) {
      // If there's no origin header, it's a same-origin request
      // We allow it to pass through (CORS doesn't apply)
      return !origin;
    }

    // Same-origin request (no origin header): allow
    if (!origin) {
      return true;
    }

    // Check if origin is in the allowed list
    return config.origins.includes(origin);
  }

  /**
   * Generate CORS middleware configuration for Express
   * 
   * @param config - CORS configuration
   * @returns CORS options for the cors middleware
   */
  getCorsMiddlewareConfig(config: CorsConfig): CorsOptions {
    return {
      origin: (origin, callback) => {
        if (this.isOriginAllowed(origin, config)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    };
  }

  /**
   * Initialize and validate CORS configuration from environment
   * 
   * This is a convenience method that combines parsing, validation,
   * and logging for application startup.
   * 
   * @param envValue - Value from CORS_ORIGIN environment variable
   * @returns Parsed and validated CORS configuration
   * @throws Error if configuration is invalid
   */
  initializeFromEnv(envValue: string | undefined): CorsConfig {
    // Parse configuration
    const config = this.parseConfig(envValue);

    // Validate configuration
    const validation = this.validateConfig(config);

    // Log errors and exit if invalid
    if (!validation.valid) {
      validation.errors.forEach(error => logger.error(`CORS Config Error: ${error}`));
      throw new Error('Invalid CORS configuration. See logs for details.');
    }

    // Log warnings
    validation.warnings.forEach(warning => logger.warn(`CORS Config Warning: ${warning}`));

    // Log configuration info
    if (config.allowAll) {
      logger.info('CORS: Allowing all origins (*)');
    } else if (config.origins.length > 0) {
      logger.info(`CORS: Allowing ${config.origins.length} origins:`, config.origins);
    } else {
      logger.info('CORS: No origins configured, rejecting all cross-origin requests');
    }

    return config;
  }
}
