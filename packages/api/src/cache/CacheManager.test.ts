import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from './CacheManager.js';
import { IconSet } from '../types/icon.js';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(3600); // 1 hour TTL for tests
  });

  describe('getCachedIconSet and cacheIconSet', () => {
    it('should return null for non-existent cache', () => {
      const result = cacheManager.getCachedIconSet('gd');
      expect(result).toBeNull();
    });

    it('should cache and retrieve icon set', () => {
      const iconSet: IconSet = {
        prefix: 'gd',
        icons: {
          'test-icon': {
            body: '<path d="M10 10"/>',
            width: 24,
            height: 24,
          },
        },
        lastModified: Date.now(),
      };

      cacheManager.cacheIconSet('gd', iconSet);
      const cached = cacheManager.getCachedIconSet('gd');

      expect(cached).toEqual(iconSet);
      expect(cached?.prefix).toBe('gd');
      expect(cached?.icons['test-icon']).toBeDefined();
    });

    it('should cache multiple icon sets independently', () => {
      const iconSet1: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      const iconSet2: IconSet = {
        prefix: 'custom',
        icons: { 'icon2': { body: '<path d="M2 2"/>' } },
      };

      cacheManager.cacheIconSet('gd', iconSet1);
      cacheManager.cacheIconSet('custom', iconSet2);

      expect(cacheManager.getCachedIconSet('gd')).toEqual(iconSet1);
      expect(cacheManager.getCachedIconSet('custom')).toEqual(iconSet2);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for entire namespace', () => {
      const iconSet: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      cacheManager.cacheIconSet('gd', iconSet);
      expect(cacheManager.getCachedIconSet('gd')).toEqual(iconSet);

      cacheManager.invalidateCache('gd');
      expect(cacheManager.getCachedIconSet('gd')).toBeNull();
    });

    it('should invalidate cache when specific icon is updated', () => {
      const iconSet: IconSet = {
        prefix: 'gd',
        icons: { 
          'icon1': { body: '<path d="M1 1"/>' },
          'icon2': { body: '<path d="M2 2"/>' },
        },
      };

      cacheManager.cacheIconSet('gd', iconSet);
      expect(cacheManager.getCachedIconSet('gd')).toEqual(iconSet);

      // Invalidate cache for specific icon (should invalidate entire set)
      cacheManager.invalidateCache('gd', 'icon1');
      expect(cacheManager.getCachedIconSet('gd')).toBeNull();
    });

    it('should not affect other namespaces when invalidating', () => {
      const iconSet1: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      const iconSet2: IconSet = {
        prefix: 'custom',
        icons: { 'icon2': { body: '<path d="M2 2"/>' } },
      };

      cacheManager.cacheIconSet('gd', iconSet1);
      cacheManager.cacheIconSet('custom', iconSet2);

      cacheManager.invalidateCache('gd');

      expect(cacheManager.getCachedIconSet('gd')).toBeNull();
      expect(cacheManager.getCachedIconSet('custom')).toEqual(iconSet2);
    });
  });

  describe('generateETag', () => {
    it('should generate consistent ETag for same data', () => {
      const data = { test: 'data', value: 123 };
      const etag1 = cacheManager.generateETag(data);
      const etag2 = cacheManager.generateETag(data);

      expect(etag1).toBe(etag2);
      expect(etag1).toMatch(/^"[a-f0-9]{32}"$/); // MD5 hash format
    });

    it('should generate different ETags for different data', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };

      const etag1 = cacheManager.generateETag(data1);
      const etag2 = cacheManager.generateETag(data2);

      expect(etag1).not.toBe(etag2);
    });

    it('should generate ETag for icon set', () => {
      const iconSet: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      const etag = cacheManager.generateETag(iconSet);
      expect(etag).toBeDefined();
      expect(typeof etag).toBe('string');
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });
  });

  describe('getCacheHeaders', () => {
    it('should return cache headers with correct structure', () => {
      const headers = cacheManager.getCacheHeaders('gd', false);

      expect(headers).toHaveProperty('Cache-Control');
      expect(headers).toHaveProperty('ETag');
      expect(headers).toHaveProperty('Last-Modified');
    });

    it('should include max-age in production mode', () => {
      const headers = cacheManager.getCacheHeaders('gd', false);
      
      expect(headers['Cache-Control']).toContain('max-age=');
      
      // Extract max-age value
      const maxAgeMatch = headers['Cache-Control'].match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();
      
      const maxAge = parseInt(maxAgeMatch![1], 10);
      expect(maxAge).toBeGreaterThanOrEqual(3600);
    });

    it('should include public and immutable directives in production mode', () => {
      const headers = cacheManager.getCacheHeaders('gd', false);
      
      expect(headers['Cache-Control']).toContain('public');
      expect(headers['Cache-Control']).toContain('immutable');
    });

    it('should disable cache in development mode', () => {
      const headers = cacheManager.getCacheHeaders('gd', true);
      
      expect(headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
      expect(headers['Cache-Control']).not.toContain('max-age');
      expect(headers['Cache-Control']).not.toContain('immutable');
    });

    it('should generate valid Last-Modified date', () => {
      const headers = cacheManager.getCacheHeaders('gd', false);
      
      const lastModified = new Date(headers['Last-Modified']);
      expect(lastModified.toString()).not.toBe('Invalid Date');
      expect(lastModified.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should use icon set lastModified when available', () => {
      const specificTime = new Date('2024-01-01T00:00:00Z').getTime();
      const iconSet: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
        lastModified: specificTime,
      };

      cacheManager.cacheIconSet('gd', iconSet);
      const headers = cacheManager.getCacheHeaders('gd', false);

      const lastModified = new Date(headers['Last-Modified']);
      expect(lastModified.getTime()).toBe(specificTime);
    });

    it('should generate different ETags for different icon sets', () => {
      const iconSet1: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      const iconSet2: IconSet = {
        prefix: 'gd',
        icons: { 'icon2': { body: '<path d="M2 2"/>' } },
      };

      cacheManager.cacheIconSet('gd', iconSet1);
      const headers1 = cacheManager.getCacheHeaders('gd', false);

      cacheManager.cacheIconSet('gd', iconSet2);
      const headers2 = cacheManager.getCacheHeaders('gd', false);

      expect(headers1['ETag']).not.toBe(headers2['ETag']);
    });
  });

  describe('clearAll', () => {
    it('should clear all cached data', () => {
      const iconSet1: IconSet = {
        prefix: 'gd',
        icons: { 'icon1': { body: '<path d="M1 1"/>' } },
      };

      const iconSet2: IconSet = {
        prefix: 'custom',
        icons: { 'icon2': { body: '<path d="M2 2"/>' } },
      };

      cacheManager.cacheIconSet('gd', iconSet1);
      cacheManager.cacheIconSet('custom', iconSet2);

      cacheManager.clearAll();

      expect(cacheManager.getCachedIconSet('gd')).toBeNull();
      expect(cacheManager.getCachedIconSet('custom')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cacheManager.getStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  describe('TTL configuration', () => {
    it('should use default TTL of 24 hours in production mode', () => {
      const defaultManager = new CacheManager();
      const headers = defaultManager.getCacheHeaders('gd', false);
      
      const maxAgeMatch = headers['Cache-Control'].match(/max-age=(\d+)/);
      const maxAge = parseInt(maxAgeMatch![1], 10);
      
      expect(maxAge).toBe(86400); // 24 hours in seconds
    });

    it('should use custom TTL when provided in production mode', () => {
      const customTTL = 7200; // 2 hours
      const customManager = new CacheManager(customTTL);
      const headers = customManager.getCacheHeaders('gd', false);
      
      const maxAgeMatch = headers['Cache-Control'].match(/max-age=(\d+)/);
      const maxAge = parseInt(maxAgeMatch![1], 10);
      
      expect(maxAge).toBe(customTTL);
    });
  });
});
