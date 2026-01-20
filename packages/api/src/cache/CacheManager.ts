import NodeCache from 'node-cache';
import crypto from 'crypto';
import { IconSet } from '../types/icon.js';

/**
 * HTTP cache headers
 */
export interface CacheHeaders {
  'Cache-Control': string;
  'ETag': string;
  'Last-Modified': string;
}

/**
 * Cache manager for multi-layer caching
 * Implements in-memory caching with TTL and HTTP cache header generation
 */
export class CacheManager {
  private cache: NodeCache;
  private readonly ttl: number;

  /**
   * Create a new CacheManager
   * @param ttl Time to live in seconds (default: 24 hours)
   */
  constructor(ttl: number = 86400) {
    this.ttl = ttl;
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: ttl * 0.2, // Check for expired keys every 20% of TTL
      useClones: false, // Don't clone objects for better performance
    });
  }

  /**
   * Get cached icon set
   * @param namespace Icon set namespace
   * @returns Cached icon set or null if not found
   */
  getCachedIconSet(namespace: string): IconSet | null {
    const key = this.getCacheKey(namespace);
    const cached = this.cache.get<IconSet>(key);
    return cached || null;
  }

  /**
   * Cache an icon set
   * @param namespace Icon set namespace
   * @param iconSet Icon set to cache
   */
  cacheIconSet(namespace: string, iconSet: IconSet): void {
    const key = this.getCacheKey(namespace);
    this.cache.set(key, iconSet);
  }

  /**
   * Invalidate cache for a namespace or specific icon
   * @param namespace Icon set namespace
   * @param iconName Optional specific icon name
   */
  invalidateCache(namespace: string, iconName?: string): void {
    if (iconName) {
      // When a specific icon is updated, invalidate the entire icon set cache
      // since the icon set contains all icons
      const key = this.getCacheKey(namespace);
      this.cache.del(key);
    } else {
      // Invalidate entire namespace
      const key = this.getCacheKey(namespace);
      this.cache.del(key);
    }
  }

  /**
   * Generate ETag based on content
   * @param data Data to generate ETag from
   * @returns ETag string
   */
  generateETag(data: any): string {
    const content = JSON.stringify(data);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return `"${hash}"`;
  }

  /**
   * Get HTTP cache headers for a namespace
   * @param namespace Icon set namespace
   * @param isDevelopment Whether running in development mode
   * @returns Cache headers object
   */
  getCacheHeaders(namespace: string, isDevelopment: boolean = false): CacheHeaders {
    const iconSet = this.getCachedIconSet(namespace);
    
    // Generate ETag based on icon set content
    const etag = iconSet ? this.generateETag(iconSet) : this.generateETag({ namespace, timestamp: Date.now() });
    
    // Use lastModified from icon set or current time
    const lastModified = iconSet?.lastModified || Date.now();
    const lastModifiedDate = new Date(lastModified);
    
    // In development mode, disable caching to ensure fresh data
    const cacheControl = isDevelopment 
      ? 'no-cache, no-store, must-revalidate'
      : `public, max-age=${this.ttl}, immutable`;
    
    return {
      'Cache-Control': cacheControl,
      'ETag': etag,
      'Last-Modified': lastModifiedDate.toUTCString(),
    };
  }

  /**
   * Get cache key for a namespace
   * @param namespace Icon set namespace
   * @returns Cache key
   */
  private getCacheKey(namespace: string): string {
    return `iconset:${namespace}`;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.flushAll();
  }
}
