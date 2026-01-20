import { StorageLayer } from './StorageLayer.js';
import { RedisStorageLayer } from './RedisStorageLayer.js';
import logger from '../utils/logger.js';

/**
 * Storage interface that both implementations must follow
 */
export interface IStorageLayer {
  initializeNamespace(namespace: string): Promise<void>;
  saveIcon(namespace: string, name: string, data: any): Promise<void>;
  readIcon(namespace: string, name: string): Promise<any | null>;
  deleteIcon(namespace: string, name: string): Promise<void>;
  listIcons(namespace: string): Promise<string[]>;
  saveIconSetMetadata(namespace: string, metadata: any): Promise<void>;
  readIconSetMetadata(namespace: string): Promise<any | null>;
  saveIconVersion(namespace: string, name: string, versionId: string, data: any): Promise<void>;
  listIconVersions(namespace: string, name: string): Promise<string[]>;
  readIconVersion(namespace: string, name: string, versionId: string): Promise<any | null>;
}

/**
 * Factory function to create the appropriate storage layer based on configuration
 */
export async function createStorageLayer(): Promise<IStorageLayer> {
  const storageType = process.env.STORAGE_TYPE || 'filesystem';

  logger.info(`Initializing storage layer: ${storageType}`);

  if (storageType === 'redis') {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisStorage = new RedisStorageLayer(redisUrl);
    
    try {
      await redisStorage.connect();
      logger.info('Redis storage layer initialized successfully', {
        url: redisUrl.replace(/:([^:@]+)@/, ':****@'), // Hide password in logs
      });
      return redisStorage;
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize Redis storage, falling back to filesystem', {
        error: err.message,
      });
      // Fallback to filesystem if Redis fails
      const fileStorage = new StorageLayer(process.env.ICON_STORAGE_PATH);
      logger.warn('Using filesystem storage as fallback');
      return fileStorage;
    }
  } else {
    // Default to filesystem storage
    const storagePath = process.env.ICON_STORAGE_PATH || 'icons';
    const fileStorage = new StorageLayer(storagePath);
    logger.info('Filesystem storage layer initialized', {
      path: storagePath,
    });
    return fileStorage;
  }
}

/**
 * Get storage type from environment
 */
export function getStorageType(): 'filesystem' | 'redis' {
  const storageType = process.env.STORAGE_TYPE || 'filesystem';
  return storageType === 'redis' ? 'redis' : 'filesystem';
}
