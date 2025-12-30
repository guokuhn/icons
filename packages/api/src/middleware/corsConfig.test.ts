/**
 * Unit tests for CORS Configuration Manager
 * Tests requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CorsConfigManager, CorsConfig, CorsValidationResult } from './corsConfig.js';

describe('CorsConfigManager', () => {
  let manager: CorsConfigManager;

  beforeEach(() => {
    manager = new CorsConfigManager();
  });

  describe('parseConfig', () => {
    it('should return empty origins and allowAll=false for undefined', () => {
      const result = manager.parseConfig(undefined);
      
      expect(result).toEqual({
        origins: [],
        allowAll: false,
      });
    });

    it('should return empty origins and allowAll=false for empty string', () => {
      const result = manager.parseConfig('');
      
      expect(result).toEqual({
        origins: [],
        allowAll: false,
      });
    });

    it('should return empty origins and allowAll=false for whitespace-only string', () => {
      const result = manager.parseConfig('   ');
      
      expect(result).toEqual({
        origins: [],
        allowAll: false,
      });
    });

    it('should return allowAll=true for wildcard "*"', () => {
      const result = manager.parseConfig('*');
      
      expect(result).toEqual({
        origins: [],
        allowAll: true,
      });
    });

    it('should return allowAll=true for wildcard with whitespace', () => {
      const result = manager.parseConfig('  *  ');
      
      expect(result).toEqual({
        origins: [],
        allowAll: true,
      });
    });

    it('should parse single domain correctly', () => {
      const result = manager.parseConfig('http://localhost:3000');
      
      expect(result).toEqual({
        origins: ['http://localhost:3000'],
        allowAll: false,
      });
    });

    it('should parse multiple domains separated by commas', () => {
      const result = manager.parseConfig('http://localhost:3000,https://app.example.com');
      
      expect(result).toEqual({
        origins: ['http://localhost:3000', 'https://app.example.com'],
        allowAll: false,
      });
    });

    it('should trim whitespace from domains', () => {
      const result = manager.parseConfig('  http://localhost:3000  ,  https://app.example.com  ');
      
      expect(result).toEqual({
        origins: ['http://localhost:3000', 'https://app.example.com'],
        allowAll: false,
      });
    });

    it('should filter out empty strings after splitting', () => {
      const result = manager.parseConfig('http://localhost:3000,,https://app.example.com');
      
      expect(result).toEqual({
        origins: ['http://localhost:3000', 'https://app.example.com'],
        allowAll: false,
      });
    });

    it('should handle multiple domains with various whitespace', () => {
      const result = manager.parseConfig(
        'http://localhost:5173, https://app.example.com,https://admin.example.com  '
      );
      
      expect(result).toEqual({
        origins: [
          'http://localhost:5173',
          'https://app.example.com',
          'https://admin.example.com',
        ],
        allowAll: false,
      });
    });
  });

  describe('validateConfig', () => {
    it('should return valid=true with warning for wildcard configuration', () => {
      const config: CorsConfig = { origins: [], allowAll: true };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('allow all origins');
      expect(result.warnings[0]).toContain('development');
    });

    it('should return valid=true with warning for empty origins', () => {
      const config: CorsConfig = { origins: [], allowAll: false };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No CORS origins configured');
    });

    it('should return valid=true for valid http URL', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid=true for valid https URL', () => {
      const config: CorsConfig = {
        origins: ['https://app.example.com'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid=true for multiple valid URLs', () => {
      const config: CorsConfig = {
        origins: [
          'http://localhost:3000',
          'https://app.example.com',
          'https://admin.example.com:8080',
        ],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error for invalid URL format', () => {
      const config: CorsConfig = {
        origins: ['not-a-valid-url'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid CORS origin format');
      expect(result.errors[0]).toContain('not-a-valid-url');
    });

    it('should return error for invalid protocol (ftp)', () => {
      const config: CorsConfig = {
        origins: ['ftp://example.com'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid CORS origin protocol');
      expect(result.errors[0]).toContain('ftp://example.com');
    });

    it('should return error for URL without protocol', () => {
      const config: CorsConfig = {
        origins: ['example.com'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid CORS origin format');
    });

    it('should return multiple errors for multiple invalid URLs', () => {
      const config: CorsConfig = {
        origins: ['not-valid', 'ftp://example.com', 'also-invalid'],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should return errors for some invalid URLs while accepting valid ones', () => {
      const config: CorsConfig = {
        origins: [
          'http://localhost:3000',
          'not-valid',
          'https://app.example.com',
        ],
        allowAll: false,
      };
      const result = manager.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not-valid');
    });
  });

  describe('isOriginAllowed', () => {
    it('should return true for any origin when allowAll is true', () => {
      const config: CorsConfig = { origins: [], allowAll: true };
      
      expect(manager.isOriginAllowed('http://localhost:3000', config)).toBe(true);
      expect(manager.isOriginAllowed('https://example.com', config)).toBe(true);
      expect(manager.isOriginAllowed('https://any-domain.com', config)).toBe(true);
    });

    it('should return true for undefined origin when allowAll is true', () => {
      const config: CorsConfig = { origins: [], allowAll: true };
      
      expect(manager.isOriginAllowed(undefined, config)).toBe(true);
    });

    it('should return false when no origins configured and allowAll is false', () => {
      const config: CorsConfig = { origins: [], allowAll: false };
      
      expect(manager.isOriginAllowed('http://localhost:3000', config)).toBe(false);
    });

    it('should return true for undefined origin (same-origin request) when origins are configured', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      expect(manager.isOriginAllowed(undefined, config)).toBe(true);
    });

    it('should return true for origin in allowed list', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000', 'https://app.example.com'],
        allowAll: false,
      };
      
      expect(manager.isOriginAllowed('http://localhost:3000', config)).toBe(true);
      expect(manager.isOriginAllowed('https://app.example.com', config)).toBe(true);
    });

    it('should return false for origin not in allowed list', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      expect(manager.isOriginAllowed('https://evil.com', config)).toBe(false);
      expect(manager.isOriginAllowed('http://localhost:5173', config)).toBe(false);
    });

    it('should be case-sensitive for origin matching', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      expect(manager.isOriginAllowed('http://LOCALHOST:3000', config)).toBe(false);
      expect(manager.isOriginAllowed('HTTP://localhost:3000', config)).toBe(false);
    });

    it('should match exact origin including port', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      expect(manager.isOriginAllowed('http://localhost:3000', config)).toBe(true);
      expect(manager.isOriginAllowed('http://localhost:3001', config)).toBe(false);
      expect(manager.isOriginAllowed('http://localhost', config)).toBe(false);
    });
  });

  describe('getCorsMiddlewareConfig', () => {
    it('should return CorsOptions with origin callback', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      
      expect(corsOptions).toHaveProperty('origin');
      expect(corsOptions).toHaveProperty('credentials', true);
      expect(corsOptions).toHaveProperty('methods');
      expect(corsOptions).toHaveProperty('allowedHeaders');
      expect(typeof corsOptions.origin).toBe('function');
    });

    it('should allow origin in allowed list via callback', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      const callback = vi.fn();
      
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://localhost:3000', callback);
      }
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject origin not in allowed list via callback', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      const callback = vi.fn();
      
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://evil.com', callback);
      }
      
      expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
      const error = callback.mock.calls[0][0];
      expect(error.message).toContain('Not allowed by CORS');
    });

    it('should allow undefined origin (same-origin) via callback', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      const callback = vi.fn();
      
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, callback);
      }
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow all origins when allowAll is true', () => {
      const config: CorsConfig = {
        origins: [],
        allowAll: true,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      const callback = vi.fn();
      
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://any-domain.com', callback);
      }
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should include correct HTTP methods', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      
      expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    it('should include correct allowed headers', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      
      expect(corsOptions.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'x-api-key',
      ]);
    });

    it('should enable credentials', () => {
      const config: CorsConfig = {
        origins: ['http://localhost:3000'],
        allowAll: false,
      };
      
      const corsOptions = manager.getCorsMiddlewareConfig(config);
      
      expect(corsOptions.credentials).toBe(true);
    });
  });

  describe('initializeFromEnv', () => {
    it('should parse, validate, and return config for valid single domain', () => {
      const config = manager.initializeFromEnv('http://localhost:3000');
      
      expect(config).toEqual({
        origins: ['http://localhost:3000'],
        allowAll: false,
      });
    });

    it('should parse, validate, and return config for multiple domains', () => {
      const config = manager.initializeFromEnv(
        'http://localhost:3000,https://app.example.com'
      );
      
      expect(config).toEqual({
        origins: ['http://localhost:3000', 'https://app.example.com'],
        allowAll: false,
      });
    });

    it('should parse, validate, and return config for wildcard', () => {
      const config = manager.initializeFromEnv('*');
      
      expect(config).toEqual({
        origins: [],
        allowAll: true,
      });
    });

    it('should parse, validate, and return config for empty value', () => {
      const config = manager.initializeFromEnv('');
      
      expect(config).toEqual({
        origins: [],
        allowAll: false,
      });
    });

    it('should throw error for invalid configuration', () => {
      expect(() => {
        manager.initializeFromEnv('not-a-valid-url');
      }).toThrow('Invalid CORS configuration');
    });

    it('should throw error for invalid protocol', () => {
      expect(() => {
        manager.initializeFromEnv('ftp://example.com');
      }).toThrow('Invalid CORS configuration');
    });
  });
});
