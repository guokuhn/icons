import Redis from 'ioredis';
import { IconData, IconSetMetadata } from '../types/icon.js';
import logger from '../utils/logger.js';
import { StorageError } from '../types/errors.js';

/**
 * RedisStorageLayer manages Redis operations for icon storage
 * 
 * Redis Data Structure:
 * - icon:{namespace}:{name} -> Hash { data: JSON string of IconData }
 * - icons:{namespace} -> Set of icon names
 * - metadata:{namespace} -> Hash { data: JSON string of IconSetMetadata }
 * - versions:{namespace}:{name} -> Sorted Set { score: timestamp, member: versionId }
 * - version:{namespace}:{name}:{versionId} -> Hash { data: JSON string of IconData }
 */
export class RedisStorageLayer {
  private redis: Redis;
  private connected: boolean = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connection established');
      this.connected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis error', { error: error.message });
      this.connected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.connected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('Redis storage layer initialized');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to connect to Redis', { error: err.message });
      throw new StorageError('Failed to connect to Redis', {
        originalError: err.message,
      });
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected && this.redis.status === 'ready';
  }

  /**
   * Get Redis key for icon data
   */
  private getIconKey(namespace: string, name: string): string {
    return `icon:${namespace}:${name}`;
  }

  /**
   * Get Redis key for icon set
   */
  private getIconSetKey(namespace: string): string {
    return `icons:${namespace}`;
  }

  /**
   * Get Redis key for metadata
   */
  private getMetadataKey(namespace: string): string {
    return `metadata:${namespace}`;
  }

  /**
   * Get Redis key for version sorted set
   */
  private getVersionsKey(namespace: string, name: string): string {
    return `versions:${namespace}:${name}`;
  }

  /**
   * Get Redis key for specific version data
   */
  private getVersionKey(namespace: string, name: string, versionId: string): string {
    return `version:${namespace}:${name}:${versionId}`;
  }

  /**
   * Initialize namespace (no-op for Redis, but kept for interface compatibility)
   */
  async initializeNamespace(namespace: string): Promise<void> {
    // Redis doesn't require directory initialization
    logger.debug(`Namespace ${namespace} ready (Redis)`);
  }

  /**
   * Save icon data to Redis
   */
  async saveIcon(namespace: string, name: string, data: IconData): Promise<void> {
    try {
      const iconKey = this.getIconKey(namespace, name);
      const iconSetKey = this.getIconSetKey(namespace);
      const jsonData = JSON.stringify(data);

      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.hset(iconKey, 'data', jsonData);
      pipeline.sadd(iconSetKey, name);
      
      await pipeline.exec();

      logger.info('Icon saved successfully to Redis', {
        namespace,
        name,
        key: iconKey,
      });
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to save icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: err.message,
      });

      throw new StorageError(`Failed to save icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: err.message,
      });
    }
  }

  /**
   * Read icon data from Redis
   */
  async readIcon(namespace: string, name: string): Promise<IconData | null> {
    try {
      const iconKey = this.getIconKey(namespace, name);
      const jsonData = await this.redis.hget(iconKey, 'data');

      if (!jsonData) {
        logger.debug(`Icon not found: ${namespace}:${name}`);
        return null;
      }

      const data = JSON.parse(jsonData) as IconData;

      logger.debug('Icon read successfully from Redis', {
        namespace,
        name,
      });

      return data;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to read icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: err.message,
      });

      throw new StorageError(`Failed to read icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: err.message,
      });
    }
  }

  /**
   * Delete icon from Redis
   */
  async deleteIcon(namespace: string, name: string): Promise<void> {
    try {
      const iconKey = this.getIconKey(namespace, name);
      const iconSetKey = this.getIconSetKey(namespace);

      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.del(iconKey);
      pipeline.srem(iconSetKey, name);

      await pipeline.exec();

      logger.info('Icon deleted successfully from Redis', {
        namespace,
        name,
        key: iconKey,
      });
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to delete icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: err.message,
      });

      throw new StorageError(`Failed to delete icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: err.message,
      });
    }
  }

  /**
   * List all icons in a namespace
   */
  async listIcons(namespace: string): Promise<string[]> {
    try {
      const iconSetKey = this.getIconSetKey(namespace);
      const icons = await this.redis.smembers(iconSetKey);

      logger.debug(`Listed icons in namespace: ${namespace}`, {
        namespace,
        count: icons.length,
      });

      return icons;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to list icons in namespace: ${namespace}`, {
        namespace,
        error: err.message,
      });

      throw new StorageError(`Failed to list icons in namespace: ${namespace}`, {
        namespace,
        originalError: err.message,
      });
    }
  }

  /**
   * Save icon set metadata
   */
  async saveIconSetMetadata(namespace: string, metadata: IconSetMetadata): Promise<void> {
    try {
      const metadataKey = this.getMetadataKey(namespace);
      const jsonData = JSON.stringify(metadata);

      await this.redis.hset(metadataKey, 'data', jsonData);

      logger.info('Icon set metadata saved to Redis', {
        namespace,
        total: metadata.total,
        version: metadata.version,
      });
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to save icon set metadata: ${namespace}`, {
        namespace,
        error: err.message,
      });

      throw new StorageError(`Failed to save icon set metadata: ${namespace}`, {
        namespace,
        originalError: err.message,
      });
    }
  }

  /**
   * Read icon set metadata
   */
  async readIconSetMetadata(namespace: string): Promise<IconSetMetadata | null> {
    try {
      const metadataKey = this.getMetadataKey(namespace);
      const jsonData = await this.redis.hget(metadataKey, 'data');

      if (!jsonData) {
        logger.debug(`Icon set metadata not found: ${namespace}`);
        return null;
      }

      const metadata = JSON.parse(jsonData) as IconSetMetadata;

      logger.debug('Icon set metadata read from Redis', {
        namespace,
        total: metadata.total,
        version: metadata.version,
      });

      return metadata;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to read icon set metadata: ${namespace}`, {
        namespace,
        error: err.message,
      });

      throw new StorageError(`Failed to read icon set metadata: ${namespace}`, {
        namespace,
        originalError: err.message,
      });
    }
  }

  /**
   * Save a version of an icon
   * Implements requirement 8.1 - Version management
   */
  async saveIconVersion(
    namespace: string,
    name: string,
    versionId: string,
    data: IconData
  ): Promise<void> {
    try {
      const versionKey = this.getVersionKey(namespace, name, versionId);
      const versionsKey = this.getVersionsKey(namespace, name);
      const jsonData = JSON.stringify(data);
      const timestamp = Date.now();

      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.hset(versionKey, 'data', jsonData);
      pipeline.zadd(versionsKey, timestamp, versionId);

      await pipeline.exec();

      logger.info('Icon version saved successfully to Redis', {
        namespace,
        name,
        versionId,
        timestamp,
      });
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to save icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        error: err.message,
      });

      throw new StorageError(`Failed to save icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        originalError: err.message,
      });
    }
  }

  /**
   * List all versions for an icon
   * Implements requirement 8.2 - Version history
   */
  async listIconVersions(namespace: string, name: string): Promise<string[]> {
    try {
      const versionsKey = this.getVersionsKey(namespace, name);
      // Get all versions sorted by timestamp (oldest first)
      const versions = await this.redis.zrange(versionsKey, 0, -1);

      logger.debug(`Listed versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        count: versions.length,
      });

      return versions;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to list versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: err.message,
      });

      throw new StorageError(`Failed to list versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: err.message,
      });
    }
  }

  /**
   * Read a specific version of an icon
   * Implements requirement 8.2 - Version history
   */
  async readIconVersion(
    namespace: string,
    name: string,
    versionId: string
  ): Promise<IconData | null> {
    try {
      const versionKey = this.getVersionKey(namespace, name, versionId);
      const jsonData = await this.redis.hget(versionKey, 'data');

      if (!jsonData) {
        logger.debug(`Icon version not found: ${namespace}:${name}:${versionId}`);
        return null;
      }

      const data = JSON.parse(jsonData) as IconData;

      logger.debug('Icon version read successfully from Redis', {
        namespace,
        name,
        versionId,
      });

      return data;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to read icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        error: err.message,
      });

      throw new StorageError(`Failed to read icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        originalError: err.message,
      });
    }
  }

  /**
   * Get Redis client statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    totalKeys: number;
    memoryUsed: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        connected: this.isConnected(),
        totalKeys: dbSize,
        memoryUsed,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get Redis stats', { error: err.message });
      return {
        connected: false,
        totalKeys: 0,
        memoryUsed: 'unknown',
      };
    }
  }

  /**
   * Clear all data for a namespace (use with caution!)
   */
  async clearNamespace(namespace: string): Promise<void> {
    try {
      const pattern = `*:${namespace}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.warn(`Cleared ${keys.length} keys for namespace: ${namespace}`, {
          namespace,
          keysCleared: keys.length,
        });
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to clear namespace: ${namespace}`, {
        namespace,
        error: err.message,
      });

      throw new StorageError(`Failed to clear namespace: ${namespace}`, {
        namespace,
        originalError: err.message,
      });
    }
  }
}
